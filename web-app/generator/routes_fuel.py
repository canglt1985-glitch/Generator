"""
Fuel Ledger, Fuel Refill, Fuel Purchase routes
"""
from flask import request, redirect, url_for, flash, send_file, session, render_template
from datetime import datetime
from io import BytesIO
import pandas as pd

from extensions import db
from models import GeneralInfo, FuelRefillLog, FuelPurchaseLog, FuelLedger
from helpers import get_central_stock, get_audit_data
from auth import login_required, admin_required
from generator import generator_bp
from generator.routes import export_excel, handle_deletion


# ============================================================
# FUEL LEDGER (v2.0)
# ============================================================

@generator_bp.route('/fuel-ledger')
@login_required
def fuel_ledger():
    logs = FuelLedger.query.order_by(FuelLedger.ngay.desc()).all()
    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
    current_stock = get_central_stock()['total']
    return render_template('fuel_ledger.html',
                           logs=logs, stations=stations,
                           current_stock=current_stock,
                           now_date=datetime.now().strftime('%Y-%m-%d'))


def calc_ton_sau_gd(id_tram, so_luong, trans_type):
    """Calculate fuel stock snapshot after transaction for a station."""
    if not id_tram or trans_type == 'STOCK_IN':
        return None
    # Tìm ton_sau_gd gần nhất của trạm này
    latest = db.session.query(FuelLedger.ton_sau_gd).filter(
        FuelLedger.id_tram == id_tram,
        FuelLedger.ton_sau_gd.isnot(None)
    ).order_by(FuelLedger.ngay.desc(), FuelLedger.id.desc()).first()
    if latest and latest[0] is not None:
        ton_truoc = latest[0]
    else:
        # Fallback: tính từ running balance hiện tại
        audit = get_audit_data()
        row = next((r for r in audit if r['id_tram'] == id_tram), None)
        ton_truoc = row['ton_real'] if row else 0
    return round(max(0, ton_truoc + so_luong), 2)


@generator_bp.route('/fuel-ledger/add', methods=['POST'])
@login_required
def add_fuel_ledger():
    try:
        trans_type = request.form.get('type')
        so_luong = float(request.form.get('so_luong') or 0)
        don_gia = float(request.form.get('don_gia') or 0)
        is_approved = True
        if trans_type == 'ADJUSTMENT' and session.get('role') != 'admin':
            is_approved = False
        thanh_tien = float(request.form.get('thanh_tien') or 0)
        if thanh_tien == 0 and trans_type in ['STOCK_IN', 'DIRECT_BUY']:
            thanh_tien = so_luong * don_gia

        # Sanitize fields based on transaction type
        id_tram = request.form.get('id_tram') or ''
        nha_cung_cap = request.form.get('nha_cung_cap') or ''
        if trans_type == 'STOCK_IN':
            # Nhập kho: không cần mã trạm (nhập vào kho tổng)
            id_tram = ''
        elif trans_type == 'STATION_OUT':
            # Xuất kho: không cần NCC, auto đơn giá từ lần nhập kho gần nhất
            nha_cung_cap = ''
            if don_gia == 0:
                latest_price = db.session.query(FuelLedger.don_gia).filter(
                    FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY']),
                    FuelLedger.don_gia > 0
                ).order_by(FuelLedger.ngay.desc()).first()
                don_gia = latest_price[0] if latest_price else 0
            thanh_tien = so_luong * don_gia

        new_trans = FuelLedger(
            type=trans_type, is_approved=is_approved,
            ngay=request.form.get('ngay').replace('T', ' '),
            id_tram=id_tram,
            loai_nhien_lieu=request.form.get('loai_nhien_lieu'),
            so_luong=so_luong, don_gia=don_gia, thanh_tien=thanh_tien,
            nha_cung_cap=nha_cung_cap,
            nguoi_thuc_hien=request.form.get('nguoi_thuc_hien') or session.get('full_name'),
            ghi_chu=request.form.get('ghi_chu')
        )
        # Auto-calc ton_sau_gd (user có thể override từ form)
        user_ton = request.form.get('ton_sau_gd')
        if user_ton:
            new_trans.ton_sau_gd = float(user_ton)
        else:
            new_trans.ton_sau_gd = calc_ton_sau_gd(id_tram, so_luong, trans_type)
        db.session.add(new_trans)
        db.session.commit()

        # Auto ADJUSTMENT if nl_ton_thuc_te provided
        nl_ton_str = request.form.get('nl_ton_thuc_te')
        station_id = request.form.get('id_tram')
        if nl_ton_str and station_id and trans_type in ('DIRECT_BUY', 'STATION_OUT'):
            try:
                nl_ton_thuc_te = float(nl_ton_str)
                audit = get_audit_data()
                row = next((r for r in audit if r['id_tram'] == station_id), None)
                estimated = row['ton_real'] if row else 0
                diff = round(nl_ton_thuc_te - estimated, 2)
                if abs(diff) > 0.01:
                    adj = FuelLedger(
                        type='ADJUSTMENT', is_approved=True,
                        ngay=request.form.get('ngay').replace('T', ' '),
                        id_tram=station_id,
                        loai_nhien_lieu=request.form.get('loai_nhien_lieu'),
                        so_luong=diff, don_gia=0, thanh_tien=0,
                        nha_cung_cap='',
                        nguoi_thuc_hien=session.get('full_name'),
                        ghi_chu=f'Calibrate: thực tế {nl_ton_thuc_te}L, ước lượng {estimated}L',
                        ton_sau_gd=round(nl_ton_thuc_te, 2)
                    )
                    db.session.add(adj)
                    db.session.commit()
            except (ValueError, TypeError):
                pass

        msg = 'Đã thêm giao dịch thành công!'
        if not is_approved:
            msg += ' (Đang chờ Admin duyệt hiệu chỉnh)'
        flash(msg, 'success')
    except Exception as e:
        flash('Lỗi hệ thống, vui lòng thử lại!', 'danger')
    return redirect(url_for('generator.generator', tab='fuel'))


@generator_bp.route('/fuel-ledger/approve/<int:id>', methods=['POST'])
@login_required
@admin_required
def approve_fuel_ledger(id):
    try:
        item = FuelLedger.query.get_or_404(id)
        item.is_approved = True
        db.session.commit()
        flash('Đã duyệt phiếu hiệu chỉnh!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('generator.generator', tab='fuel'))


@generator_bp.route('/fuel-ledger/delete/<int:id>', methods=['POST'])
@login_required
def delete_fuel_ledger(id):
    try:
        item = FuelLedger.query.get_or_404(id)
        db.session.delete(item)
        db.session.commit()
        flash('Đã xóa giao dịch nhiên liệu thành công!', 'success')
    except Exception as e:
        flash('Lỗi xóa, vui lòng thử lại!', 'danger')
    return redirect(url_for('generator.generator', tab='fuel'))


@generator_bp.route('/fuel-ledger/edit/<int:id>', methods=['POST'])
@login_required
def edit_fuel_ledger(id):
    try:
        item = FuelLedger.query.get_or_404(id)
        trans_type = request.form.get('type')
        item.ngay = request.form.get('ngay')
        item.type = trans_type
        item.loai_nhien_lieu = request.form.get('loai_nhien_lieu')
        item.so_luong = float(request.form.get('so_luong') or 0)
        item.don_gia = float(request.form.get('don_gia') or 0)
        item.thanh_tien = float(request.form.get('thanh_tien') or 0)
        item.ghi_chu = request.form.get('ghi_chu')

        # Sanitize fields based on transaction type
        if trans_type == 'STOCK_IN':
            item.id_tram = ''
            item.nha_cung_cap = request.form.get('nha_cung_cap') or ''
        elif trans_type == 'STATION_OUT':
            item.id_tram = request.form.get('id_tram') or ''
            item.nha_cung_cap = ''
            # Auto đơn giá từ lần nhập kho gần nhất nếu chưa có
            if item.don_gia == 0:
                latest_price = db.session.query(FuelLedger.don_gia).filter(
                    FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY']),
                    FuelLedger.don_gia > 0
                ).order_by(FuelLedger.ngay.desc()).first()
                item.don_gia = latest_price[0] if latest_price else 0
            item.thanh_tien = item.so_luong * item.don_gia
        else:
            item.id_tram = request.form.get('id_tram') or ''
            item.nha_cung_cap = request.form.get('nha_cung_cap') or ''

        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # Update ton_sau_gd: user override hoặc auto-calc
        user_ton = request.form.get('nl_ton_thuc_te')
        if user_ton:
            item.ton_sau_gd = float(user_ton)
        elif item.id_tram and item.type != 'STOCK_IN':
            item.ton_sau_gd = calc_ton_sau_gd(item.id_tram, item.so_luong, item.type)

        db.session.commit()
        flash('Cập nhật giao dịch thành công!', 'success')
    except Exception as e:
        flash('Lỗi cập nhật, vui lòng thử lại!', 'danger')
    return redirect(url_for('generator.generator', tab='fuel'))


@generator_bp.route('/export/fuel-ledger')
@login_required
def export_fuel_ledger():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    month = request.args.get('month')
    year = request.args.get('year')
    if year:
        try:
            fy = int(year)
            fm = int(month) if month else None
            if fm:
                start_date = f"{fy}-{fm:02d}-01"
                end_date = f"{fy}-{fm+1:02d}-01" if fm < 12 else f"{fy+1}-01-01"
            else:
                start_date = f"{fy}-01-01"
                end_date = f"{fy+1}-01-01"
        except (ValueError, TypeError):
            pass
    query = FuelLedger.query
    if start_date:
        query = query.filter(FuelLedger.ngay >= start_date)
    if end_date:
        query = query.filter(FuelLedger.ngay < end_date)
    data = query.order_by(FuelLedger.ngay.desc()).all()
    col_map = {
        'ngay': 'Ngày', 'type': 'Loại GD', 'id_tram': 'Mã Trạm',
        'loai_nhien_lieu': 'Loại nhiên liệu', 'so_luong': 'Số lượng',
        'don_gia': 'Đơn giá', 'thanh_tien': 'Thành tiền',
        'nha_cung_cap': 'Đối tác/Kho', 'nguoi_thuc_hien': 'Người mua/Thực hiện', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(data, f"so_cai_nhien_lieu_{datetime.now().strftime('%Y%m%d')}.xlsx", col_map)


# ============================================================
# FUEL REFILL (Legacy)
# ============================================================

@generator_bp.route('/fuel-refill')
@login_required
def fuel_refill():
    logs = FuelRefillLog.query.order_by(FuelRefillLog.ngay_cham.desc()).all()
    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
    now_date = datetime.now().strftime('%Y-%m-%d')
    return render_template('fuel_refill.html', logs=logs, stations=stations, now_date=now_date)


@generator_bp.route('/fuel-refill/add', methods=['POST'])
@login_required
def add_fuel_refill():
    try:
        id_tram = request.form['id_tram']
        so_luong = float(request.form.get('so_luong') or 0)
        don_gia = float(request.form.get('don_gia') or 0)
        new_log = FuelRefillLog(
            id_tram=id_tram,
            ngay_cham=request.form.get('ngay_cham').replace('T', ' '),
            so_luong=so_luong,
            loai_nhien_lieu=request.form.get('loai_nhien_lieu'),
            ghi_chu=request.form.get('ghi_chu'),
            don_gia=don_gia, thanh_tien=so_luong * don_gia,
            nguoi_cham=session.get('full_name'),
            ngay_cap_nhat=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        )
        db.session.add(new_log)
        db.session.commit()
        flash('Đã thêm phiếu châm thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.fuel_refill'))


@generator_bp.route('/fuel-refill/edit/<int:id>', methods=['POST'])
@login_required
def edit_fuel_refill(id):
    try:
        item = FuelRefillLog.query.get_or_404(id)
        item.id_tram = request.form.get('id_tram')
        item.ngay_cham = request.form.get('ngay_cham').replace('T', ' ')
        item.so_luong = float(request.form.get('so_luong') or 0)
        item.loai_nhien_lieu = request.form.get('loai_nhien_lieu')
        item.ghi_chu = request.form.get('ghi_chu')
        item.don_gia = float(request.form.get('don_gia') or 0)
        item.thanh_tien = item.so_luong * item.don_gia
        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash('Cập nhật phiếu châm thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.fuel_refill'))


@generator_bp.route('/fuel-refill/delete/<int:id>', methods=['POST'])
@login_required
def delete_fuel_refill(id):
    return handle_deletion(FuelRefillLog, id, 'generator.fuel_refill', 'FuelRefillLog')


@generator_bp.route('/fuel-refill/export')
@login_required
def export_fuel_refill():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = FuelRefillLog.query
    if start_date:
        query = query.filter(FuelRefillLog.ngay_cham >= start_date)
    if end_date:
        query = query.filter(FuelRefillLog.ngay_cham <= end_date + " 23:59")
    data = query.all()
    col_map = {
       'id_tram': 'ID Trạm', 'ngay_cham': 'Ngày châm', 'so_luong': 'Số lượng', 'nguoi_cham': 'Người châm',
       'loai_nhien_lieu': 'Loại nhiên liệu', 'may_phat_dien': 'Máy phát', 'dung_tich_may': 'Dung tích',
       'nhien_lieu_ton_uoc_luong': 'Tồn ước lượng', 'ghi_chu': 'Ghi chú',
       'don_gia': 'Đơn giá', 'thanh_tien': 'Thành tiền'
    }
    return export_excel(data, 'nhat_ky_cham_dau.xlsx', col_map)


@generator_bp.route('/fuel-refill/template')
@login_required
def template_fuel_refill():
    col_map = {
       'id_tram': 'ID Trạm', 'ngay_cham': 'Ngày châm', 'so_luong': 'Số lượng', 'nguoi_cham': 'Người châm',
       'loai_nhien_lieu': 'Loại nhiên liệu', 'may_phat_dien': 'Máy phát', 'dung_tich_may': 'Dung tích',
       'nhien_lieu_ton_uoc_luong': 'Tồn ước lượng', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(None, 'mau_nhat_ky_cham_dau.xlsx', col_map)


@generator_bp.route('/fuel-refill/reset', methods=['POST'])
@login_required
@admin_required
def reset_fuel_refill():
    try:
        FuelRefillLog.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Nhật ký châm nhiên liệu!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.fuel_refill'))


@generator_bp.route('/fuel-refill/import', methods=['POST'])
@login_required
def import_fuel_refill():
    from generator.routes_import import generic_import
    col_map = {
       'id_tram': ['ID Trạm', 'Trạm', 'Site ID', 'Mã Trạm'],
       'ngay_cham': ['Ngày châm', 'Ngày', 'Time', 'DateTime'],
       'so_luong': ['Số lượng', 'Lượng', 'Lít'],
       'nguoi_cham': ['Người châm', 'NV', 'Nhân viên'],
       'loai_nhien_lieu': ['Loại nhiên liệu', 'Nhiên liệu', 'Fuel'],
       'may_phat_dien': ['Máy phát', 'Tổ máy'],
       'dung_tich_may': ['Dung tích', 'Bồn'],
       'nhien_lieu_ton_uoc_luong': ['Tồn ước lượng', 'Tồn', 'Dọc'],
       'ghi_chu': ['Ghi chú', 'Note']
    }
    return generic_import(FuelRefillLog, col_map, 'generator.fuel_refill', datetime_cols=['ngay_cham'], float_cols=['so_luong', 'nhien_lieu_ton_uoc_luong'])


# ============================================================
# FUEL PURCHASE (Legacy)
# ============================================================

@generator_bp.route('/fuel-purchase')
@login_required
def fuel_purchase():
    now = datetime.now()
    cur_month = now.strftime('%Y-%m')
    logs = FuelPurchaseLog.query.order_by(FuelPurchaseLog.ngay_mua.desc()).all()
    stats_raw = FuelPurchaseLog.query.filter(
        FuelPurchaseLog.nguoi_mua == session.get('full_name'),
        FuelPurchaseLog.ngay_mua.like(f"{cur_month}%")
    ).all()
    user_total_liters = sum(s.so_luong or 0 for s in stats_raw)
    by_supplier = {}
    for s in stats_raw:
        ncc = s.nha_cung_cap or 'N/A'
        by_supplier[ncc] = by_supplier.get(ncc, 0) + (s.so_luong or 0)
    return render_template('fuel_purchase.html',
                           logs=logs, user_total_liters=user_total_liters,
                           by_supplier=by_supplier,
                           current_month=now.strftime('%m/%Y'),
                           now_date=now.strftime('%Y-%m-%d'),
                           stations=GeneralInfo.query.with_entities(GeneralInfo.id_tram).distinct().all())


@generator_bp.route('/fuel-purchase/add', methods=['POST'])
@login_required
def add_fuel_purchase():
    try:
        so_luong = float(request.form.get('so_luong') or 0)
        don_gia = float(request.form.get('don_gia') or 0)
        thanh_tien = float(request.form.get('thanh_tien') or 0)
        if thanh_tien == 0:
            thanh_tien = so_luong * don_gia
        new_log = FuelPurchaseLog(
            ngay_mua=request.form.get('ngay_mua'),
            id_tram=request.form.get('id_tram'),
            loai_nhien_lieu=request.form.get('loai_nhien_lieu'),
            so_luong=so_luong, don_gia=don_gia, thanh_tien=thanh_tien,
            nha_cung_cap=request.form.get('nha_cung_cap'),
            nguoi_mua=session.get('full_name'),
            ghi_chu=request.form.get('ghi_chu')
        )
        db.session.add(new_log)
        db.session.commit()
        flash(f'Đã thêm phiếu mua {so_luong}L thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.fuel_purchase'))


@generator_bp.route('/fuel-purchase/edit/<int:id>', methods=['POST'])
@login_required
def edit_fuel_purchase(id):
    try:
        item = FuelPurchaseLog.query.get_or_404(id)
        item.ngay_mua = request.form.get('ngay_mua')
        item.so_luong = float(request.form.get('so_luong') or 0)
        item.don_gia = float(request.form.get('don_gia') or 0)
        item.thanh_tien = float(request.form.get('thanh_tien') or 0)
        item.nha_cung_cap = request.form.get('nha_cung_cap')
        item.loai_nhien_lieu = request.form.get('loai_nhien_lieu')
        item.ghi_chu = request.form.get('ghi_chu')
        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash('Cập nhật phiếu mua thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.fuel_purchase'))


@generator_bp.route('/fuel-purchase/delete/<int:id>', methods=['POST'])
@login_required
def delete_fuel_purchase(id):
    return handle_deletion(FuelPurchaseLog, id, 'generator.fuel_purchase', 'FuelPurchaseLog')


@generator_bp.route('/fuel-purchase/export')
@login_required
def export_fuel_purchase():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    month = request.args.get('month')
    year = request.args.get('year')
    if year:
        try:
            fy = int(year)
            fm = int(month) if month else None
            if fm:
                start_date = f"{fy}-{fm:02d}-01"
                end_date = f"{fy}-{fm+1:02d}-01" if fm < 12 else f"{fy+1}-01-01"
            else:
                start_date = f"{fy}-01-01"
                end_date = f"{fy+1}-01-01"
        except (ValueError, TypeError):
            pass
    query = FuelPurchaseLog.query
    if start_date:
        query = query.filter(FuelPurchaseLog.ngay_mua >= start_date)
    if end_date:
        query = query.filter(FuelPurchaseLog.ngay_mua < end_date)
    data = query.all()
    col_map = {
       'ngay_mua': 'Ngày mua', 'so_luong': 'Số lượng', 'don_gia': 'Đơn giá', 'thanh_tien': 'Thành tiền',
       'nha_cung_cap': 'Nhà cung cấp', 'loai_nhien_lieu': 'Loại nhiên liệu', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(data, 'nhat_ky_mua_dau.xlsx', col_map)


@generator_bp.route('/fuel-purchase/template')
@login_required
def template_fuel_purchase():
    col_map = {
       'ngay_mua': 'Ngày mua', 'so_luong': 'Số lượng', 'don_gia': 'Đơn giá', 'thanh_tien': 'Thành tiền',
       'nha_cung_cap': 'Nhà cung cấp', 'loai_nhien_lieu': 'Loại nhiên liệu', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(None, 'mau_nhat_ky_mua_dau.xlsx', col_map)


@generator_bp.route('/fuel-purchase/reset', methods=['POST'])
@login_required
@admin_required
def reset_fuel_purchase():
    try:
        FuelPurchaseLog.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Nhật ký mua nhiên liệu!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.fuel_purchase'))


@generator_bp.route('/fuel-purchase/import', methods=['POST'])
@login_required
def import_fuel_purchase():
    from generator.routes_import import generic_import
    col_map = {
       'ngay_mua': ['Ngày mua', 'Ngày', 'Date'],
       'so_luong': ['Số lượng', 'Lượng', 'Lít', 'Qty'],
       'don_gia': ['Đơn giá', 'Price'],
       'thanh_tien': ['Thành tiền', 'Amount', 'Total'],
       'nha_cung_cap': ['Nhà cung cấp', 'NCC', 'Supplier'],
       'loai_nhien_lieu': ['Loại nhiên liệu', 'Nhiên liệu'],
       'ghi_chu': ['Ghi chú', 'Note']
    }
    return generic_import(FuelPurchaseLog, col_map, 'generator.fuel_purchase', date_cols=['ngay_mua'], float_cols=['so_luong', 'don_gia', 'thanh_tien'])


# ============================================================
# API ENDPOINTS
# ============================================================

@generator_bp.route('/api/fuel-stock-all')
@login_required
def get_fuel_stock_all():
    """Return fuel stock for ALL stations (batch lookup).
    Used by: fuel table 'NL tồn' column, power schedule color coding.
    """
    from flask import jsonify
    audit = get_audit_data()
    # Build lookup including stations with no transactions
    all_stations = GeneralInfo.query.all()
    result = {}
    # Pre-fill from GeneralInfo
    for s in all_stations:
        result[s.id_tram] = {
            'ton_real': 0, 'dung_tich': s.dung_tich or 0,
            'dm_thuc_te': s.dinh_muc_thuc_te or 0,
            'loai_nl': s.loai_nhien_lieu or '',
            'may_phat': s.may_phat_dien or '',
            'loai_may': s.loai_may or '',
        }
    # Override with audit data (has actual ton_real)
    for row in audit:
        sid = row['id_tram']
        result[sid] = {
            'ton_real': row['ton_real'],
            'dung_tich': row['dung_tich'],
            'dm_thuc_te': row['dm_thuc_te'],
            'loai_nl': row['loai_nl'],
            'may_phat': row['may_phat'],
            'loai_may': row['loai_may'],
        }
    return jsonify(result)


@generator_bp.route('/api/fuel-context')
@login_required
def get_fuel_context():
    station_id = request.args.get('station_id')
    if not station_id:
        return {"error": "Missing station_id"}, 400
    audit = get_audit_data()
    row = next((r for r in audit if r['id_tram'] == station_id), None)
    if not row:
        info = GeneralInfo.query.filter_by(id_tram=station_id).first()
        return {
            "station_id": station_id, "station_stock": 0,
            "dung_tich": info.dung_tich or 0 if info else 0,
            "may_phat_dien": info.may_phat_dien if info else '',
            "loai_nhien_lieu": info.loai_nhien_lieu if info else '',
            "loai_may": info.loai_may if info else '',
            "fill_percent": 0
        }
    stock = row['ton_real']
    dt = row['dung_tich']
    fill_pct = round(stock / dt * 100, 1) if dt > 0 else 0
    return {
        "station_id": station_id, "station_stock": stock, "dung_tich": dt,
        "may_phat_dien": row['may_phat'], "loai_nhien_lieu": row['loai_nl'],
        "loai_may": row['loai_may'], "fill_percent": fill_pct
    }


@generator_bp.route('/api/station-info/<station_id>')
@login_required
def get_station_info(station_id):
    from sqlalchemy import func, desc
    from datetime import timedelta
    station = GeneralInfo.query.filter_by(id_tram=station_id).first()
    latest_refill = FuelRefillLog.query.filter_by(id_tram=station_id)\
        .order_by(desc(FuelRefillLog.ngay_cham)).first()
    thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    refill_count = FuelRefillLog.query.filter(
        FuelRefillLog.id_tram == station_id,
        FuelRefillLog.ngay_cham >= thirty_days_ago
    ).count()
    from models import GeneratorLog
    latest_log = GeneratorLog.query.filter_by(id_tram=station_id)\
        .order_by(desc(GeneratorLog.ngay_chay)).first()
    total_refilled = db.session.query(func.sum(FuelRefillLog.so_luong))\
        .filter_by(id_tram=station_id).scalar() or 0
    total_consumed = db.session.query(func.sum(GeneratorLog.nhien_lieu_tieu_hao))\
        .filter_by(id_tram=station_id).scalar() or 0
    estimated_remaining = total_refilled - total_consumed
    total_purchased = db.session.query(func.sum(FuelPurchaseLog.so_luong))\
        .filter_by(id_tram=station_id).scalar() or 0
    return {
        'success': True,
        'station': {
            'id_tram': station_id,
            'ma_khach_hang': station.ma_khach_hang if station else '--',
            'huyen': station.huyen if station else '--',
            'quan_ly_tram': station.quan_ly_tram if station else '--',
            'dung_tich': station.dung_tich if station else 0,
            'dinh_muc': station.dinh_muc if station else 0,
            'loai_nhien_lieu': station.loai_nhien_lieu if station else '--',
        },
        'latest_refill': {
            'date': latest_refill.ngay_cham if latest_refill else '--',
            'quantity': latest_refill.so_luong if latest_refill else 0,
            'refill_count_30d': refill_count
        },
        'latest_log': {
            'date': latest_log.ngay_chay if latest_log else '--',
            'duration': latest_log.thoi_gian_hoat_dong if latest_log else 0,
            'consumed': latest_log.nhien_lieu_tieu_hao if latest_log else 0
        },
        'fuel_stats': {
            'total_refilled': round(total_refilled, 2),
            'total_consumed': round(total_consumed, 2),
            'estimated_remaining': round(estimated_remaining, 2),
            'total_purchased': round(total_purchased, 2)
        }
    }
