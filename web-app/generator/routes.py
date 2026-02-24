"""
Generator routes — Power Schedule, Fuel, General Info, Generator Logs, Expenses
Extracted from app.py
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session
from datetime import datetime, time
from io import BytesIO
import pandas as pd
import os
import subprocess

from extensions import db
from models import (
    GeneralInfo, PowerSchedule, GeneratorLog, FuelRefillLog,
    FuelPurchaseLog, FuelLedger, OtherExpense
)
from helpers import get_central_stock, get_audit_data
from auth import login_required, admin_required
from generator import generator_bp


# --- Common Helper for Export/Template ---
def export_excel(query_model, filename, columns_map=None):
    if query_model:
        if isinstance(query_model, list):
            data = [vars(x) for x in query_model]
        else:
            data = [vars(x) for x in query_model]
        clean_data = []
        for d in data:
            clean = {k: v for k, v in d.items() if not k.startswith('_sa_')}
            clean_data.append(clean)
        df = pd.DataFrame(clean_data)
        if columns_map and not df.empty:
            ordered_original = [k for k in columns_map.keys() if k in df.columns]
            df = df[ordered_original]
            df = df.rename(columns=columns_map)
    else:
        df = pd.DataFrame()
    if df.empty and columns_map:
        df = pd.DataFrame(columns=columns_map.values())
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Sheet1')
    output.seek(0)
    return send_file(output, download_name=filename, as_attachment=True)


def handle_deletion(model_class, record_id, redirect_route, table_name):
    try:
        record = model_class.query.get_or_404(record_id)
        db.session.delete(record)
        db.session.commit()
        flash('Xóa thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for(redirect_route))


# ============================================================
# MAIN GENERATOR PAGE
# ============================================================

@generator_bp.route('/generator')
@generator_bp.route('/power-schedule')
@login_required
def generator():
    active_tab = request.args.get('tab', 'schedule')
    today_str = datetime.now().strftime('%Y-%m-%d')

    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
    latest_fuel_price = db.session.query(FuelLedger.don_gia).filter(
        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY']),
        FuelLedger.don_gia > 0
    ).order_by(FuelLedger.ngay.desc()).first()
    suggested_price = latest_fuel_price[0] if latest_fuel_price else 20000

    schedules = PowerSchedule.query.filter(PowerSchedule.ngay_mat_dien >= today_str).order_by(PowerSchedule.ngay_mat_dien.asc()).all()
    fuel_logs = FuelLedger.query.order_by(FuelLedger.ngay.desc()).limit(200).all()
    central_stock = get_central_stock()
    expenses = OtherExpense.query.order_by(OtherExpense.ngay_su_dung.desc()).limit(20).all()

    gen_logs = []
    infos = []
    gen_fm = None
    gen_fy = datetime.now().year
    gen_available_years = list(range(2024, datetime.now().year + 1))

    if active_tab in ('logs', 'infos'):
        gen_filter_month = request.args.get('filter_month', '')
        gen_filter_year_raw = request.args.get('filter_year', '')
        if gen_filter_year_raw:
            try:
                gen_fy = int(gen_filter_year_raw)
            except (ValueError, TypeError):
                gen_fy = datetime.now().year
        else:
            # Auto-detect: use latest year that has data, fallback to current year
            from sqlalchemy import func as sqlfn
            latest = db.session.query(
                sqlfn.max(sqlfn.substr(GeneratorLog.ngay_van_hanh, 1, 4))
            ).scalar()
            if latest:
                try:
                    gen_fy = int(latest)
                except (ValueError, TypeError):
                    gen_fy = datetime.now().year
        if gen_filter_month and gen_filter_month.strip():
            try:
                gen_fm = int(gen_filter_month)
            except (ValueError, TypeError):
                gen_fm = None
        if gen_fm:
            gen_start = f"{gen_fy}-{gen_fm:02d}-01"
            gen_end = f"{gen_fy}-{gen_fm+1:02d}-01" if gen_fm < 12 else f"{gen_fy+1}-01-01"
        else:
            gen_start = f"{gen_fy}-01-01"
            gen_end = f"{gen_fy+1}-01-01"
        gen_logs = GeneratorLog.query.filter(
            GeneratorLog.ngay_van_hanh >= gen_start,
            GeneratorLog.ngay_van_hanh < gen_end
        ).order_by(GeneratorLog.ngay_van_hanh.desc()).all()
        infos = GeneralInfo.query.all()

    # Payment data
    now = datetime.now()
    pay_year = request.args.get('pay_year', type=int, default=now.year)
    pay_month_raw = request.args.get('pay_month', '')
    pay_month = int(pay_month_raw) if pay_month_raw.strip() else None
    pay_years = list(range(now.year - 3, now.year + 1))

    if pay_month:
        p_start = f"{pay_year}-{pay_month:02d}-01"
        p_end = f"{pay_year}-{pay_month+1:02d}-01" if pay_month < 12 else f"{pay_year+1}-01-01"
    else:
        p_start = f"{pay_year}-01-01"
        p_end = f"{pay_year+1}-01-01"

    from sqlalchemy import func as fn
    purchase_q = db.session.query(
        FuelLedger.nguoi_thuc_hien, FuelLedger.nha_cung_cap, fn.sum(FuelLedger.thanh_tien)
    ).filter(
        FuelLedger.ngay >= p_start, FuelLedger.ngay < p_end,
        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
    ).group_by(FuelLedger.nguoi_thuc_hien, FuelLedger.nha_cung_cap).all()

    legacy_q = db.session.query(
        FuelPurchaseLog.nguoi_mua, FuelPurchaseLog.nha_cung_cap, fn.sum(FuelPurchaseLog.thanh_tien)
    ).filter(
        FuelPurchaseLog.ngay_mua >= p_start, FuelPurchaseLog.ngay_mua < p_end
    ).group_by(FuelPurchaseLog.nguoi_mua, FuelPurchaseLog.nha_cung_cap).all()

    expense_q = db.session.query(
        OtherExpense.nguoi_tam_ung, fn.sum(OtherExpense.so_tien)
    ).filter(
        OtherExpense.ngay_su_dung >= p_start, OtherExpense.ngay_su_dung < p_end
    ).group_by(OtherExpense.nguoi_tam_ung).all()

    payment_data = {}
    def _add_purchase(name, source, amt):
        if name not in payment_data:
            payment_data[name] = {'mua_le': 0, 'cx222': 0, 'vnpt_vtl': 0, 'other_exp': 0, 'can_ck': 0}
        source_up = (source or '').strip().upper()
        if 'CX' in source_up or 'CÂY XĂNG' in source_up or 'CX222' in source_up:
            payment_data[name]['cx222'] += amt
        elif 'VNPT' in source_up or 'VTL' in source_up:
            payment_data[name]['vnpt_vtl'] += amt
            payment_data[name]['can_ck'] += amt
        else:
            payment_data[name]['mua_le'] += amt
            payment_data[name]['can_ck'] += amt

    for row in purchase_q:
        _add_purchase(row[0] or 'Không rõ', row[1], row[2] or 0)
    for row in legacy_q:
        _add_purchase(row[0] or 'Không rõ', row[1], row[2] or 0)
    for row in expense_q:
        name = row[0] or 'Không rõ'
        amt = row[1] or 0
        if name not in payment_data:
            payment_data[name] = {'mua_le': 0, 'cx222': 0, 'vnpt_vtl': 0, 'other_exp': 0, 'can_ck': 0}
        payment_data[name]['other_exp'] += amt
        payment_data[name]['can_ck'] += amt

    return render_template('generator.html',
                           schedules=schedules,
                           stations=stations,
                           fuel_logs=fuel_logs,
                           central_stock=central_stock,
                           suggested_price=suggested_price,
                           expenses=expenses,
                           now_date=today_str,
                           now_dt=datetime.now().strftime('%Y-%m-%dT%H:%M'),
                           active_tab=active_tab,
                           payment_data=payment_data,
                           pay_month=pay_month,
                           pay_year=pay_year,
                           pay_years=pay_years,
                           logs=gen_logs,
                           infos=infos,
                           filter_month=gen_fm,
                           filter_year=gen_fy,
                           available_years=gen_available_years,
                           users=[])


# ============================================================
# POWER SCHEDULE
# ============================================================

@generator_bp.route('/power-schedule/add', methods=['POST'])
@login_required
def add_power_schedule():
    try:
        new_item = PowerSchedule(
            id_tram=request.form.get('id_tram'),
            ma_khach_hang=request.form.get('ma_khach_hang'),
            khu_vuc=request.form.get('khu_vuc'),
            ngay_mat_dien=request.form.get('ngay_mat_dien'),
            thoi_gian_cup_dien=request.form.get('thoi_gian_cup_dien'),
            thoi_gian_co_dien=request.form.get('thoi_gian_co_dien'),
            ly_do=request.form.get('ly_do'),
            doi_quan_ly_dien=request.form.get('doi_quan_ly_dien'),
            quan_ly_tram=request.form.get('quan_ly_tram')
        )
        db.session.add(new_item)
        db.session.commit()
        flash('Thêm thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {str(e)}', 'danger')
    return redirect(url_for('generator.generator'))


@generator_bp.route('/power-schedule/edit/<int:id>', methods=['POST'])
@login_required
def edit_power_schedule(id):
    try:
        item = PowerSchedule.query.get_or_404(id)
        item.id_tram = request.form.get('id_tram')
        item.ma_khach_hang = request.form.get('ma_khach_hang')
        item.khu_vuc = request.form.get('khu_vuc')
        item.ngay_mat_dien = request.form.get('ngay_mat_dien')
        item.thoi_gian_cup_dien = request.form.get('thoi_gian_cup_dien')
        item.thoi_gian_co_dien = request.form.get('thoi_gian_co_dien')
        item.ly_do = request.form.get('ly_do')
        item.doi_quan_ly_dien = request.form.get('doi_quan_ly_dien')
        item.quan_ly_tram = request.form.get('quan_ly_tram')
        db.session.commit()
        flash('Cập nhật thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('generator.generator'))


@generator_bp.route('/power-schedule/delete/<int:id>')
@login_required
def delete_power_schedule(id):
    return handle_deletion(PowerSchedule, id, 'generator.generator', 'PowerSchedule')


@generator_bp.route('/power-schedule/export')
@login_required
def export_power_schedule():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    query = PowerSchedule.query
    if start_date:
        query = query.filter(PowerSchedule.ngay_mat_dien >= start_date)
    if end_date:
        query = query.filter(PowerSchedule.ngay_mat_dien <= end_date)
    data = query.all()
    col_map = {
        'id_tram': 'ID Trạm', 'ma_khach_hang': 'Mã KH', 'khu_vuc': 'Khu vực',
        'ngay_mat_dien': 'Ngày mất điện', 'thoi_gian_cup_dien': 'Giờ cúp',
        'thoi_gian_co_dien': 'Giờ có', 'ly_do': 'Lý do', 'doi_quan_ly_dien': 'Đội QL Điện',
        'quan_ly_tram': 'Quản lý trạm'
    }
    return export_excel(data, 'lich_cup_dien.xlsx', col_map)


@generator_bp.route('/power-schedule/template')
@login_required
def template_power_schedule():
    col_map = {
        'id_tram': 'ID Trạm', 'ma_khach_hang': 'Mã KH', 'khu_vuc': 'Khu vực',
        'ngay_mat_dien': 'Ngày mất điện', 'thoi_gian_cup_dien': 'Giờ cúp',
        'thoi_gian_co_dien': 'Giờ có', 'ly_do': 'Lý do', 'doi_quan_ly_dien': 'Đội QL Điện',
        'quan_ly_tram': 'Quản lý trạm'
    }
    return export_excel(None, 'mau_lich_cup_dien.xlsx', col_map)


@generator_bp.route('/power-schedule/reset')
@login_required
@admin_required
def reset_power_schedule():
    try:
        PowerSchedule.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Lịch cúp điện!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.generator'))


@generator_bp.route('/power-schedule/import', methods=['POST'])
@login_required
def import_power_schedule():
    from generator.routes_import import generic_import
    col_map = {
        'id_tram': ['ID Trạm', 'Trạm', 'ID Tram'],
        'ma_khach_hang': ['Mã KH', 'Mã khách hàng'],
        'khu_vuc': ['Khu vực', 'Khu Vực'],
        'ngay_mat_dien': ['Ngày mất điện', 'Ngày', 'Ngày Có/Mất', 'Ngày Cúp'],
        'thoi_gian_cup_dien': ['Giờ cúp', 'Giờ mất', 'Bắt Đầu', 'Giờ Bắt Đầu'],
        'thoi_gian_co_dien': ['Giờ có điện', 'Kết Thúc', 'Giờ Kết Thúc'],
        'ly_do': ['Lý do'],
        'doi_quan_ly_dien': ['Đội QL Điện', 'Đội QL'],
        'quan_ly_tram': ['Quản lý trạm', 'Quản Lý']
    }
    return generic_import(PowerSchedule, col_map, 'generator.generator', date_cols=['ngay_mat_dien'], dup_cols=['id_tram', 'ngay_mat_dien', 'thoi_gian_cup_dien'])


# ============================================================
# MANUAL FETCH OUTAGES
# ============================================================

@generator_bp.route('/admin/fetch-outages')
@login_required
def manual_fetch_outages():
    try:
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fetch_outages.py')
        python_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            '.venv', 'bin', 'python'
        )

        if not os.path.exists(python_path):
            python_path = 'python'

        result = subprocess.run(
            [python_path, script_path],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        stdout = result.stdout or ""
        stderr = result.stderr or ""

        if result.returncode == 0:
            last_line = stdout.splitlines()[-1] if stdout.strip() else "Quét xong (không có output)."
            flash(f'Đã quét xong! Nội dung: {last_line}', 'success')
        else:
            flash(f'Lỗi khi quét: {stderr}', 'danger')

    except Exception as e:
        flash(f'Lỗi hệ thống: {str(e)}', 'danger')

    return redirect(url_for('generator.generator'))
