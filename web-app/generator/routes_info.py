"""
General Info, Generator Logs, Other Expenses routes
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session
from datetime import datetime
from io import BytesIO
import pandas as pd

from extensions import db
from models import GeneralInfo, GeneratorLog, OtherExpense
from auth import login_required, admin_required, cost_access_required
from generator import generator_bp
from generator.routes import export_excel, handle_deletion


# ============================================================
# GENERAL INFO
# ============================================================

@generator_bp.route('/general-info')
@login_required
@admin_required
def general_info():
    return redirect(url_for('core.admin_mpd', tab='infos'))


@generator_bp.route('/general-info/add', methods=['POST'])
@login_required
@admin_required
def add_general_info():
    try:
        new_item = GeneralInfo(
            id_tram=request.form['id_tram'],
            ma_khach_hang=request.form.get('ma_khach_hang'),
            huyen=request.form.get('huyen'),
            quan_ly_tram=request.form.get('quan_ly_tram'),
            may_phat_dien=request.form.get('may_phat_dien'),
            dung_tich=int(request.form.get('dung_tich') or 0),
            dinh_muc_thuc_te=float(request.form.get('dinh_muc_thuc_te') or 0),
            dinh_muc=float(request.form.get('dinh_muc') or 0),
            loai_tram=request.form.get('loai_tram'),
            vung_phu=request.form.get('vung_phu'),
            loai_nhien_lieu=request.form.get('loai_nhien_lieu'),
            loai_may=request.form.get('loai_may'),
            ngay_cap_nhat=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        )
        db.session.add(new_item)
        db.session.commit()
        flash('Thêm mới thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('core.admin_mpd', tab='infos'))


@generator_bp.route('/general-info/edit/<int:id>', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_general_info(id):
    info = GeneralInfo.query.get_or_404(id)
    if request.method == 'POST':
        try:
            info.id_tram = request.form['id_tram']
            info.ma_khach_hang = request.form.get('ma_khach_hang')
            info.huyen = request.form.get('huyen')
            info.quan_ly_tram = request.form.get('quan_ly_tram')
            info.may_phat_dien = request.form.get('may_phat_dien')
            info.dung_tich = int(request.form.get('dung_tich') or 0)
            info.dinh_muc_thuc_te = float(request.form.get('dinh_muc_thuc_te') or 0)
            info.dinh_muc = float(request.form.get('dinh_muc') or 0)
            info.loai_tram = request.form.get('loai_tram')
            info.vung_phu = request.form.get('vung_phu')
            info.loai_nhien_lieu = request.form.get('loai_nhien_lieu')
            info.loai_may = request.form.get('loai_may')
            info.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            db.session.commit()
            flash('Cập nhật thành công!', 'success')
            return redirect(url_for('core.admin_mpd', tab='infos'))
        except Exception as e:
            flash(f'Lỗi: {str(e)}', 'danger')
    return render_template('general_info_edit.html', item=info)


@generator_bp.route('/general-info/delete/<int:id>', methods=['POST'])
@login_required
def delete_general_info(id):
    return handle_deletion(GeneralInfo, id, 'generator.general_info', 'GeneralInfo')


@generator_bp.route('/general-info/bulk-delete', methods=['POST'])
@login_required
@admin_required
def bulk_delete_general_info():
    try:
        ids = request.form.getlist('ids')
        if not ids:
            flash('Chưa chọn bản ghi nào để xóa!', 'warning')
        else:
            GeneralInfo.query.filter(GeneralInfo.id.in_(ids)).delete(synchronize_session=False)
            db.session.commit()
            flash(f'Đã xóa {len(ids)} bản ghi thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('core.admin_mpd', tab='infos'))


@generator_bp.route('/general-info/export')
@login_required
@admin_required
def export_general_info():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = GeneralInfo.query
    if start_date:
        query = query.filter(GeneralInfo.ngay_cap_nhat >= start_date)
    if end_date:
        query = query.filter(GeneralInfo.ngay_cap_nhat <= end_date)
    data = query.all()
    col_map = {
        'id_tram': 'ID Trạm', 'ma_khach_hang': 'Mã KH', 'huyen': 'Huyện', 'quan_ly_tram': 'Quản lý trạm',
        'may_phat_dien': 'Máy phát điện', 'loai_may': 'Nhãn hiệu', 'cong_suat': 'Công suất (KVA)',
        'dung_tich': 'Dung tích bồn (L)', 'dinh_muc_thuc_te': 'Định mức thực tế',
        'dinh_muc': 'Định mức thanh toán', 'loai_tram': 'Loại trạm', 'vung_phu': 'Vùng phủ',
        'loai_nhien_lieu': 'Loại nhiên liệu'
    }
    return export_excel(data, 'thong_tin_chung.xlsx', col_map)


@generator_bp.route('/general-info/template')
@login_required
@admin_required
def template_general_info():
    col_map = {
        'id_tram': 'ID Trạm', 'ma_khach_hang': 'Mã KH', 'huyen': 'Huyện', 'quan_ly_tram': 'Quản lý trạm',
        'may_phat_dien': 'Máy phát điện', 'loai_may': 'Nhãn hiệu', 'cong_suat': 'Công suất (KVA)',
        'dung_tich': 'Dung tích bồn (L)', 'dinh_muc_thuc_te': 'Định mức thực tế',
        'dinh_muc': 'Định mức thanh toán', 'loai_tram': 'Loại trạm', 'vung_phu': 'Vùng phủ',
        'loai_nhien_lieu': 'Loại nhiên liệu'
    }
    return export_excel(None, 'mau_thong_tin_chung.xlsx', col_map)


@generator_bp.route('/general-info/reset', methods=['POST'])
@login_required
@admin_required
def reset_general_info():
    try:
        GeneralInfo.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Thông tin chung!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('core.admin_mpd', tab='infos'))


@generator_bp.route('/general-info/import', methods=['POST'])
@login_required
@admin_required
def import_general_info():
    from generator.routes_import import generic_import
    col_map = {
        'id_tram': ['ID Trạm', 'Mã Trạm', 'Tram ID', 'Site ID', 'Mã nhà trạm'],
        'ma_khach_hang': ['Mã khách hàng', 'Mã KH', 'Cust Code', 'Mã KH Điện lực'],
        'huyen': ['Huyện', 'Quận/Huyện', 'District', 'Quận'],
        'quan_ly_tram': ['Quản lý trạm', 'QL Trạm', 'Đội quản lý', 'Tổ quản lý', 'Đơn vị quản lý'],
        'may_phat_dien': ['Máy phát điện', 'Loại máy phát', 'Máy phát', 'Tổ máy'],
        'loai_may': ['Nhãn hiệu', 'Loại máy', 'Model máy', 'Hãng máy'],
        'cong_suat': ['Công suất (KVA)', 'Công suất', 'KVA', 'Power'],
        'dung_tich': ['Dung tích bồn (L)', 'Dung tích', 'Dung tích máy', 'Dung tích thùng dầu', 'Thể tích bồn'],
        'dinh_muc_thuc_te': ['Định mức thực tế', 'Định mức chạy máy', 'Rate Real', 'Định mức tiêu hao'],
        'dinh_muc': ['Định mức thanh toán', 'Định mức', 'Quota', 'Định mức TT'],
        'loai_tram': ['Loại trạm', 'Site Type', 'Phân loại'],
        'vung_phu': ['Vùng phủ', 'Khu vực', 'Region'],
        'loai_nhien_lieu': ['Loại nhiên liệu', 'Nhiên liệu', 'Fuel Type']
    }
    return generic_import(GeneralInfo, col_map, 'generator.general_info', float_cols=['cong_suat', 'dung_tich', 'dinh_muc_thuc_te', 'dinh_muc'], dup_cols=['id_tram'])


# ============================================================
# GENERATOR LOGS
# ============================================================

@generator_bp.route('/generator-logs')
@login_required
@admin_required
def generator_logs():
    return redirect(url_for('core.admin_mpd', tab='logs'))


@generator_bp.route('/generator-logs/add', methods=['POST'])
@login_required
@admin_required
def add_generator_log():
    try:
        new_log = GeneratorLog(
            id_tram=request.form.get('id_tram'),
            site=request.form.get('site'),
            cong_suat_may=request.form.get('cong_suat_may'),
            loai_may=request.form.get('loai_may'),
            dinh_muc=request.form.get('dinh_muc'),
            ngay_van_hanh=request.form.get('ngay_van_hanh'),
            gio_bat_dau=request.form.get('gio_bat_dau'),
            gio_ket_thuc=request.form.get('gio_ket_thuc'),
            thoi_gian_hoat_dong=float(request.form.get('thoi_gian_hoat_dong') or 0),
            nhien_lieu_tieu_hao=float(request.form.get('nhien_lieu_tieu_hao') or 0),
            don_gia=float(request.form.get('don_gia') or 0),
            thanh_tien=float(request.form.get('thanh_tien') or 0),
            ket_qua_doi_soat=request.form.get('ket_qua_doi_soat'),
            nhien_lieu=request.form.get('nhien_lieu'),
            ghi_chu=request.form.get('ghi_chu')
        )
        db.session.add(new_log)
        db.session.commit()
        flash('Thêm mới thành công!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('core.admin_mpd', tab='logs'))


@generator_bp.route('/generator-logs/edit/<int:id>', methods=['POST'])
@login_required
@admin_required
def edit_generator_log(id):
    try:
        item = GeneratorLog.query.get_or_404(id)
        item.id_tram = request.form.get('id_tram')
        item.site = request.form.get('site')
        item.cong_suat_may = request.form.get('cong_suat_may')
        item.loai_may = request.form.get('loai_may')
        item.dinh_muc = request.form.get('dinh_muc')
        item.ngay_van_hanh = request.form.get('ngay_van_hanh')
        item.gio_bat_dau = request.form.get('gio_bat_dau')
        item.gio_ket_thuc = request.form.get('gio_ket_thuc')
        item.thoi_gian_hoat_dong = float(request.form.get('thoi_gian_hoat_dong') or 0)
        item.nhien_lieu_tieu_hao = float(request.form.get('nhien_lieu_tieu_hao') or 0)
        item.don_gia = float(request.form.get('don_gia') or 0)
        item.thanh_tien = float(request.form.get('thanh_tien') or 0)
        item.ket_qua_doi_soat = request.form.get('ket_qua_doi_soat')
        item.nhien_lieu = request.form.get('nhien_lieu')
        item.ghi_chu = request.form.get('ghi_chu')
        db.session.commit()
        flash('Cập nhật nhật ký chạy máy thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('core.admin_mpd', tab='logs'))


@generator_bp.route('/generator-logs/delete/<int:id>', methods=['POST'])
@login_required
def delete_generator_log(id):
    return handle_deletion(GeneratorLog, id, 'generator.generator_logs', 'GeneratorLog')


@generator_bp.route('/generator-logs/export')
@login_required
@admin_required
def export_generator_logs():
    month = request.args.get('month', type=int)
    year = request.args.get('year', type=int)
    query = GeneratorLog.query
    filename = 'nhat_ky_chay_may.xlsx'

    if month and year:
        prefix = f'{year}-{month:02d}'
        query = query.filter(GeneratorLog.ngay_van_hanh.like(f'{prefix}%'))
        filename = f'Thoi_gian_chay_may_T{month}_{year}.xlsx'
    else:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        if start_date:
            query = query.filter(GeneratorLog.ngay_van_hanh >= start_date)
        if end_date:
            query = query.filter(GeneratorLog.ngay_van_hanh <= end_date)

    data = query.order_by(GeneratorLog.ngay_van_hanh.desc()).all()
    col_map = {
        'id_tram': 'ID Trạm',
        'site': 'Site',
        'cong_suat_may': 'Công suất máy (KVA)',
        'loai_may': 'Loại máy',
        'dinh_muc': 'Định mức (Lít/Giờ)',
        'ngay_van_hanh': 'Ngày vận hành',
        'gio_bat_dau': 'Giờ bắt đầu',
        'gio_ket_thuc': 'Giờ kết thúc',
        'thoi_gian_hoat_dong': 'Thời gian chạy máy (Giờ)',
        'nhien_lieu_tieu_hao': 'Nhiên liệu tiêu hao (Lít)',
        'don_gia': 'Đơn giá',
        'thanh_tien': 'Thành tiền',
        'ket_qua_doi_soat': 'Kết quả đối soát',
        'nhien_lieu': 'Nhiên liệu',
        'ghi_chu': 'Ghi chú'
    }
    return export_excel(data, filename, col_map)


@generator_bp.route('/generator-logs/template')
@login_required
@admin_required
def template_generator_logs():
    col_map = {
        'id_tram': 'ID Trạm',
        'site': 'Site',
        'cong_suat_may': 'Công suất máy (KVA)',
        'loai_may': 'Loại máy',
        'dinh_muc': 'Định mức (Lít/Giờ)',
        'ngay_van_hanh': 'Ngày vận hành',
        'gio_bat_dau': 'Giờ bắt đầu',
        'gio_ket_thuc': 'Giờ kết thúc',
        'thoi_gian_hoat_dong': 'Thời gian chạy máy (Giờ)',
        'nhien_lieu_tieu_hao': 'Nhiên liệu tiêu hao (Lít)',
        'don_gia': 'Đơn giá',
        'thanh_tien': 'Thành tiền',
        'ket_qua_doi_soat': 'Kết quả đối soát',
        'nhien_lieu': 'Nhiên liệu',
        'ghi_chu': 'Ghi chú'
    }
    return export_excel(None, 'mau_nhat_ky_chay_may.xlsx', col_map)


@generator_bp.route('/generator-logs/reset', methods=['POST'])
@login_required
@admin_required
def reset_generator_logs():
    try:
        GeneratorLog.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Nhật ký chạy máy!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('core.admin_mpd', tab='logs'))


@generator_bp.route('/generator-logs/import', methods=['POST'])
@login_required
@admin_required
def import_generator_log():
    from generator.routes_import import generic_import
    col_map = {
        'id_tram': ['ID Trạm', 'Mã Trạm', 'Site ID', 'Mã nhà trạm', 'Trạm'],
        'site': ['Site', 'Tên Trạm', 'Site Name', 'Name'],
        'ngay_van_hanh': ['Ngày vận hành', 'Ngày chạy', 'Date', 'Ngày'],
        'cong_suat_may': ['Công suất máy (KVA)', 'Công suất máy', 'Công suất', 'Capacity', 'KVA'],
        'loai_may': ['Loại máy', 'Model', 'Nhãn hiệu', 'Máy phát'],
        'dinh_muc': ['Định mức (Lít/Giờ)', 'Định mức', 'Quota', 'Định mức châm'],
        'gio_bat_dau': ['Giờ bắt đầu', 'Start Time', 'Bắt đầu', 'Start'],
        'gio_ket_thuc': ['Giờ kết thúc', 'End Time', 'Kết thúc', 'End'],
        'thoi_gian_hoat_dong': ['Thời gian chạy máy (Giờ)', 'Thời gian hoạt động', 'Giờ chạy',
                                'Duration', 'Tổng giờ', 'Run Hours', 'Hours', 'Số giờ', 'Thời gian chạy máy'],
        'nhien_lieu_tieu_hao': ['Nhiên liệu tiêu hao (Lít)', 'Nhiên liệu tiêu hao', 'Tiêu hao', 'Lít', 'Consumed', 'Fuel Consumed'],
        'don_gia': ['Đơn giá', 'Price', 'Cost per Liter'],
        'thanh_tien': ['Thành tiền', 'Amount', 'Tổng tiền', 'Total Cost'],
        'ket_qua_doi_soat': ['Kết quả đối soát', 'Kết quả', 'Result', 'Status'],
        'nhien_lieu': ['Nhiên liệu', 'Loại nhiên liệu', 'Fuel Type'],
        'ghi_chu': ['Ghi chú', 'Note', 'Remarks']
    }
    result = generic_import(GeneratorLog, col_map, 'generator.generator_logs',
                            date_cols=['ngay_van_hanh'],
                            float_cols=['nhien_lieu_tieu_hao', 'don_gia', 'thanh_tien'],
                            duration_cols=['thoi_gian_hoat_dong'],
                            dup_cols=['id_tram', 'ngay_van_hanh', 'gio_bat_dau'])

    # Post-import: auto-calculate missing fields
    try:
        _auto_fill_generator_logs()
    except Exception as e:
        flash(f'Import OK nhưng lỗi khi tự tính: {str(e)}', 'warning')

    return result


def _auto_fill_generator_logs():
    """Fill missing fields in GeneratorLog: duration, fuel, cost.
    Only fills records where thanh_tien is 0 or empty (not yet calculated).
    """
    from generator.mfd_import import get_station_info, get_pretax_price

    logs = GeneratorLog.query.filter(
        (GeneratorLog.thanh_tien == None) |
        (GeneratorLog.thanh_tien == 0) |
        (GeneratorLog.thanh_tien == 0.0)
    ).filter(
        GeneratorLog.id_tram != None,
        GeneratorLog.id_tram != ''
    ).all()

    if not logs:
        return

    filled = 0
    for log in logs:
        changed = False

        # 1. Auto-fill thoi_gian from gio_bat_dau / gio_ket_thuc
        if (not log.thoi_gian_hoat_dong or log.thoi_gian_hoat_dong == 0) and log.gio_bat_dau and log.gio_ket_thuc:
            try:
                bd = datetime.strptime(log.gio_bat_dau, '%H:%M')
                kt = datetime.strptime(log.gio_ket_thuc, '%H:%M')
                diff = (kt - bd).total_seconds() / 3600
                if diff < 0:
                    diff += 24  # overnight
                log.thoi_gian_hoat_dong = round(diff, 2)
                changed = True
            except Exception:
                pass

        # 2. Lookup station info (dinh_muc, loai_nhien_lieu)
        station = get_station_info(log.id_tram)
        if station:
            # Fill site if empty
            if not log.site:
                log.site = log.id_tram
                changed = True
            # Fill dinh_muc if empty
            if not log.dinh_muc or log.dinh_muc in ('', '0', '0.0'):
                log.dinh_muc = str(station['dinh_muc'])
                changed = True
            # Fill nhien_lieu type if empty
            if not log.nhien_lieu:
                log.nhien_lieu = station['loai_nhien_lieu']
                changed = True
            # Fill loai_may if empty
            if not log.loai_may:
                log.loai_may = station['loai_may']
                changed = True
            # Fill cong_suat_may if empty
            if not log.cong_suat_may:
                log.cong_suat_may = station['cong_suat_may']
                changed = True

        # 3. Calculate nhien_lieu_tieu_hao
        dinh_muc_val = 0
        try:
            dinh_muc_val = float(log.dinh_muc or 0)
        except (ValueError, TypeError):
            pass

        hours = log.thoi_gian_hoat_dong or 0
        if (not log.nhien_lieu_tieu_hao or log.nhien_lieu_tieu_hao == 0) and hours > 0 and dinh_muc_val > 0:
            log.nhien_lieu_tieu_hao = round(hours * dinh_muc_val, 2)
            changed = True

        # 4. Get don_gia from PVOil
        if (not log.don_gia or log.don_gia == 0):
            fuel_type = log.nhien_lieu or 'Dầu'
            log.don_gia = get_pretax_price(fuel_type)
            changed = True

        # 5. Calculate thanh_tien
        nl = log.nhien_lieu_tieu_hao or 0
        dg = log.don_gia or 0
        if nl > 0 and dg > 0:
            log.thanh_tien = round(nl * dg)
            changed = True

        if changed:
            filled += 1

    if filled > 0:
        db.session.commit()
        flash(f'Đã tự tính NL + chi phí cho {filled} dòng!', 'info')


# ============================================================
# OTHER EXPENSES
# ============================================================

@generator_bp.route('/other-expenses')
@login_required
@cost_access_required
def other_expenses():
    expenses = OtherExpense.query.order_by(OtherExpense.ngay_su_dung.desc()).all()
    return render_template('expense_tracking.html', expenses=expenses)


@generator_bp.route('/other-expenses/add', methods=['POST'])
@login_required
@cost_access_required
def add_other_expense():
    try:
        new_item = OtherExpense(
            ngay_su_dung=request.form.get('ngay_su_dung'),
            noi_dung=request.form.get('noi_dung'),
            du_an=request.form.get('du_an'),
            so_tien=float(request.form.get('so_tien') or 0),
            nguoi_tam_ung=session.get('full_name'),
            ghi_chu=request.form.get('ghi_chu')
        )
        db.session.add(new_item)
        db.session.commit()
        flash(f'Thêm chi phí thành công cho dự án {new_item.du_an}!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.generator', tab='expense'))


@generator_bp.route('/other-expenses/edit/<int:id>', methods=['POST'])
@login_required
def edit_other_expense(id):
    try:
        item = OtherExpense.query.get_or_404(id)
        item.ngay_su_dung = request.form.get('ngay_su_dung')
        item.noi_dung = request.form.get('noi_dung')
        item.du_an = request.form.get('du_an')
        item.so_tien = float(request.form.get('so_tien') or 0)
        item.ghi_chu = request.form.get('ghi_chu')
        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash('Cập nhật chi phí thành công!', 'success')
    except Exception as e:
        flash('Lỗi cập nhật, vui lòng thử lại!', 'danger')
    return redirect(url_for('generator.generator', tab='expense'))


@generator_bp.route('/other-expenses/delete/<int:id>', methods=['POST'])
@login_required
def delete_other_expense(id):
    try:
        item = OtherExpense.query.get_or_404(id)
        db.session.delete(item)
        db.session.commit()
        flash('Đã xóa chi phí thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi xóa: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.generator'))


@generator_bp.route('/other-expenses/export')
@login_required
def export_other_expenses():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = OtherExpense.query
    if start_date:
        query = query.filter(OtherExpense.ngay_su_dung >= start_date)
    if end_date:
        query = query.filter(OtherExpense.ngay_su_dung <= end_date)
    data = query.all()
    col_map = {
        'ngay_su_dung': 'Ngày sử dụng', 'noi_dung': 'Nội dung', 'du_an': 'Dự án',
        'so_tien': 'Số tiền', 'nguoi_tam_ung': 'Người tạm ứng', 'ghi_chu': 'Ghi chú',
        'ngay_cap_nhat': 'Ngày cập nhật'
    }
    return export_excel(data, 'chi_phi_khac.xlsx', col_map)


@generator_bp.route('/other-expenses/reset', methods=['POST'])
@login_required
@admin_required
def reset_other_expenses():
    try:
        OtherExpense.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ chi phí!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.other_expenses'))


@generator_bp.route('/other-expenses/template')
@login_required
def template_other_expenses():
    col_map = {
        'ngay_su_dung': 'Ngày sử dụng', 'noi_dung': 'Nội dung', 'du_an': 'Dự án',
        'so_tien': 'Số tiền', 'nguoi_tam_ung': 'Người tạm ứng', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(None, 'mau_chi_phi_khac.xlsx', col_map)


@generator_bp.route('/other-expenses/import', methods=['POST'])
@login_required
def import_other_expenses():
    from generator.routes_import import generic_import
    col_map = {
        'ngay_su_dung': ['Ngày', 'Ngày sử dụng'],
        'noi_dung': ['Nội dung', 'Nội dung chi phí'],
        'du_an': ['Dự án'],
        'so_tien': ['Số tiền', 'Tiền'],
        'nguoi_tam_ung': ['Người tạm ứng', 'Tạm ứng'],
        'ghi_chu': ['Ghi chú']
    }
    return generic_import(OtherExpense, col_map, 'generator.other_expenses', date_cols=['ngay_su_dung'], float_cols=['so_tien'])


@generator_bp.route('/export/expenses')
@login_required
def export_expenses():
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
    query = OtherExpense.query
    if start_date:
        query = query.filter(OtherExpense.ngay_su_dung >= start_date)
    if end_date:
        query = query.filter(OtherExpense.ngay_su_dung < end_date)
    data = query.order_by(OtherExpense.ngay_su_dung.desc()).all()
    col_map = {
        'ngay_su_dung': 'Ngày', 'noi_dung': 'Nội dung', 'so_tien': 'Số tiền',
        'nguoi_tam_ung': 'Người chi', 'du_an': 'Dự án', 'ghi_chu': 'Ghi chú'
    }
    return export_excel(data, f"chi_phi_khac_{datetime.now().strftime('%Y%m%d')}.xlsx", col_map)
