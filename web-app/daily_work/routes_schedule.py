"""
Power Schedule routes — moved from generator to daily_work
CRUD + Import/Export + Manual Fetch for Lịch Cúp Điện
"""
import os
import subprocess
import logging

from flask import request, redirect, url_for, flash, send_file
from io import BytesIO
import pandas as pd

from extensions import db
from models import PowerSchedule
from auth import login_required, admin_required
from daily_work import daily_work_bp


# --- Helper from generator (duplicated for independence) ---
def export_excel(query_data, filename, columns_map=None):
    """Export data to Excel. If query_data is None, create empty template."""
    if query_data is None:
        df = pd.DataFrame(columns=list(columns_map.values()) if columns_map else [])
    else:
        rows = []
        for item in query_data:
            row = {}
            for attr, label in (columns_map or {}).items():
                row[label] = getattr(item, attr, '')
            rows.append(row)
        df = pd.DataFrame(rows)

    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Data')
    output.seek(0)
    return send_file(output, as_attachment=True, download_name=filename,
                     mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


SCHEDULE_COL_MAP = {
    'id_tram': 'ID Trạm', 'ma_khach_hang': 'Mã KH', 'khu_vuc': 'Khu vực',
    'ngay_mat_dien': 'Ngày mất điện', 'thoi_gian_cup_dien': 'Giờ cúp',
    'thoi_gian_co_dien': 'Giờ có', 'ly_do': 'Lý do', 'doi_quan_ly_dien': 'Đội QL Điện',
    'quan_ly_tram': 'Quản lý trạm'
}


@daily_work_bp.route('/power-schedule/add', methods=['POST'])
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
        logging.error(f'Add power schedule error: {e}')
        flash('Có lỗi xảy ra khi thêm lịch cúp.', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='schedule'))


@daily_work_bp.route('/power-schedule/edit/<int:id>', methods=['POST'])
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
        logging.error(f'Edit power schedule error: {e}')
        flash('Có lỗi xảy ra khi cập nhật.', 'danger')
    return redirect(request.referrer or url_for('daily_work.daily_work', tab='schedule'))


@daily_work_bp.route('/power-schedule/delete/<int:id>', methods=['POST'])
@login_required
@admin_required
def delete_power_schedule(id):
    try:
        item = PowerSchedule.query.get_or_404(id)
        db.session.delete(item)
        db.session.commit()
        flash('Đã xóa!', 'success')
    except Exception as e:
        logging.error(f'Delete power schedule error: {e}')
        flash('Có lỗi xảy ra.', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='schedule'))


@daily_work_bp.route('/power-schedule/export')
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
    return export_excel(data, 'lich_cup_dien.xlsx', SCHEDULE_COL_MAP)


@daily_work_bp.route('/power-schedule/template')
@login_required
def template_power_schedule():
    return export_excel(None, 'mau_lich_cup_dien.xlsx', SCHEDULE_COL_MAP)


@daily_work_bp.route('/power-schedule/reset')
@login_required
@admin_required
def reset_power_schedule():
    try:
        PowerSchedule.query.delete()
        db.session.commit()
        flash('Đã xóa toàn bộ Lịch cúp điện!', 'success')
    except Exception as e:
        logging.error(f'Reset power schedule error: {e}')
        flash('Có lỗi xảy ra.', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='schedule'))


@daily_work_bp.route('/power-schedule/import', methods=['POST'])
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
    return generic_import(PowerSchedule, col_map, 'daily_work.daily_work',
                          date_cols=['ngay_mat_dien'],
                          dup_cols=['id_tram', 'ngay_mat_dien', 'thoi_gian_cup_dien'])


@daily_work_bp.route('/admin/fetch-outages')
@login_required
def manual_fetch_outages():
    try:
        script_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'fetch_outages.py')
        python_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.venv', 'bin', 'python')
        if not os.path.exists(python_path):
            # Try Windows path
            python_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.venv_win', 'Scripts', 'python.exe')
        
        if not os.path.exists(python_path):
            python_path = 'python'

        result = subprocess.run(
            [python_path, script_path],
            capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        stdout = result.stdout or ""
        stderr = result.stderr or ""

        if result.returncode == 0:
            last_line = stdout.splitlines()[-1] if stdout.strip() else "Quét xong."
            flash(f'Đã quét xong! {last_line}', 'success')
        else:
            flash(f'Lỗi khi quét: {stderr[:200]}', 'danger')
    except Exception as e:
        logging.error(f'Fetch outages error: {e}')
        flash('Có lỗi xảy ra khi quét lịch cúp.', 'danger')

    return redirect(url_for('daily_work.daily_work', tab='schedule'))
