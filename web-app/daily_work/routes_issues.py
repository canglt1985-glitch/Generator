"""
Station Issues routes — CRUD for tồn tại kỹ thuật trạm BTS
"""
import logging
from flask import request, redirect, url_for, flash, session
from datetime import datetime
from extensions import db
from models import StationIssue, GeneralInfo
from auth import login_required
from daily_work import daily_work_bp


HANG_MUC_LIST = [
    'Cột anten',
    'Nhà trạm',
    'Máy phát điện',
    'Máy lạnh',
    'Hệ thống điện',
    'Hệ thống tiếp đất',
    'Hệ thống PCCC',
    'Thiết bị truyền dẫn',
    'Thiết bị vô tuyến',
    'Khác'
]


@daily_work_bp.route('/issues/add', methods=['POST'])
@login_required
def add_issue():
    id_tram = request.form.get('id_tram')
    hang_mucs = request.form.getlist('hang_muc[]')
    mo_tas = request.form.getlist('mo_ta[]')
    ngay = request.form.get('ngay_phat_hien') or datetime.now().strftime('%Y-%m-%d')

    if not hang_mucs:
        flash('Vui lòng nhập ít nhất 1 tồn tại.', 'warning')
        return redirect(url_for('daily_work.daily_work', tab='issues'))

    count = 0
    try:
        for hm, mt in zip(hang_mucs, mo_tas):
            if not hm or not mt:
                continue
            issue = StationIssue(
                ngay_phat_hien=ngay,
                id_tram=id_tram,
                hang_muc=hm,
                mo_ta=mt.strip(),
                trang_thai='Chưa XL',
                nguoi_bao_cao=session.get('full_name') or session.get('username')
            )
            db.session.add(issue)
            count += 1
        db.session.commit()
        flash(f'Đã lưu {count} tồn tại thành công!', 'success')
    except Exception as e:
        db.session.rollback()
        logging.error(f'Add issue error: {e}')
        flash('Có lỗi xảy ra khi lưu tồn tại.', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='issues'))


@daily_work_bp.route('/issues/toggle/<int:id>', methods=['POST'])
@login_required
def toggle_issue(id):
    try:
        issue = StationIssue.query.get_or_404(id)
        issue.trang_thai = 'Đã XL' if issue.trang_thai == 'Chưa XL' else 'Chưa XL'
        issue.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash(f'Đã cập nhật trạng thái → {issue.trang_thai}', 'success')
    except Exception as e:
        logging.error(f'Toggle issue error: {e}')
        flash('Có lỗi xảy ra.', 'danger')
    return redirect(request.referrer or url_for('daily_work.daily_work', tab='issues'))


@daily_work_bp.route('/issues/delete/<int:id>', methods=['POST'])
@login_required
def delete_issue(id):
    try:
        issue = StationIssue.query.get_or_404(id)
        db.session.delete(issue)
        db.session.commit()
        flash('Đã xóa tồn tại!', 'success')
    except Exception as e:
        logging.error(f'Delete issue error: {e}')
        flash('Có lỗi xảy ra.', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='issues'))


@daily_work_bp.route('/issues/export', methods=['GET'])
@login_required
def export_issues():
    import io
    import openpyxl
    from flask import send_file
    from models import StationIssue, DsStation
    from datetime import datetime
    
    status_filter = request.args.get('status', 'Chưa XL')
    query = StationIssue.query
    if status_filter and status_filter != 'Tất cả':
        query = query.filter_by(trang_thai=status_filter)
    issues = query.all()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "TonTai"
    
    headers = ["STT", "Tên trạm", "Lat", "Long", "Địa chỉ", "Đánh giá tình trạng hư hỏng"]
    ws.append(headers)
    
    for i, issue in enumerate(issues, start=1):
        station = DsStation.query.filter_by(site_id=issue.id_tram).first()
        if station:
            ten_tram = station.ten_tram or issue.id_tram
            lat = station.vi_do or ""
            lon = station.kinh_do or ""
            dia_chi = station.dia_chi or ""
        else:
            ten_tram, lat, lon, dia_chi = issue.id_tram, "", "", ""
            
        ws.append([i, ten_tram, lat, lon, dia_chi, issue.mo_ta])
        
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    
    filename = f'BaoCao_TonTai_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    return send_file(
        out, 
        as_attachment=True, 
        download_name=filename, 
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

