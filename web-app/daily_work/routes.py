"""
Daily Work routes — extracted from app.py
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session
from datetime import datetime, timedelta
from extensions import db
from models import DailyWork, GeneralInfo, MobileEquipment, EquipmentTransfer, PowerSchedule, StationIssue
from auth import login_required
from daily_work import daily_work_bp


@daily_work_bp.route('/daily-work')
@login_required
def daily_work():
    active_tab = request.args.get('tab', 'schedule')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    works = []
    mobile_equipments = []
    transfer_history = []
    schedules = []
    issues = []

    fuel_stock = {}
    if active_tab == 'schedule':
        today_str = datetime.now().strftime('%Y-%m-%d')
        schedules = PowerSchedule.query.filter(
            PowerSchedule.ngay_mat_dien >= today_str
        ).order_by(PowerSchedule.ngay_mat_dien.asc()).all()
        # Load fuel stock for color-coding
        try:
            from generator.routes_fuel import get_audit_data
            audit = get_audit_data()
            all_stations = GeneralInfo.query.all()
            for s in all_stations:
                fuel_stock[s.id_tram] = {
                    'ton_real': 0, 'dung_tich': s.dung_tich or 0,
                    'dm_thuc_te': s.dinh_muc_thuc_te or 0,
                    'loai_nl': s.loai_nhien_lieu or '',
                    'may_phat': s.may_phat_dien or '',
                }
            for row in audit:
                fuel_stock[row['id_tram']] = {
                    'ton_real': row['ton_real'],
                    'dung_tich': row['dung_tich'],
                    'dm_thuc_te': row['dm_thuc_te'],
                    'loai_nl': row['loai_nl'],
                    'may_phat': row['may_phat'],
                }
        except Exception:
            pass
    elif active_tab == 'issues':
        status_filter = request.args.get('status')
        query = StationIssue.query
        if status_filter:
            query = query.filter(StationIssue.trang_thai == status_filter)
        issues = query.order_by(StationIssue.ngay_phat_hien.desc()).all()
    elif active_tab == 'work':
        query = DailyWork.query
        if start_date:
            query = query.filter(DailyWork.ngay >= start_date)
        if end_date:
            query = query.filter(DailyWork.ngay <= end_date)
        if not start_date and not end_date:
            # Auto-filter to current week (Mon→Sun)
            today = datetime.now().date()
            monday = today - timedelta(days=today.weekday())  # 0=Mon
            sunday = monday + timedelta(days=6)
            start_date = monday.strftime('%Y-%m-%d')
            end_date = sunday.strftime('%Y-%m-%d')
            query = query.filter(DailyWork.ngay >= start_date, DailyWork.ngay <= end_date)
        works = query.order_by(DailyWork.ngay.desc()).all()
    elif active_tab == 'equipment':
        mobile_equipments = MobileEquipment.query.order_by(MobileEquipment.loai, MobileEquipment.ma_thiet_bi).all()
        transfer_history = EquipmentTransfer.query.order_by(
            EquipmentTransfer.ngay_dieu_chuyen.desc()
        ).limit(15).all()

    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()

    # Import hang_muc list for issues
    from daily_work.routes_issues import HANG_MUC_LIST

    return render_template('daily_work.html',
                         works=works,
                         stations=stations,
                         schedules=schedules,
                         fuel_stock=fuel_stock,
                         today_str=datetime.now().strftime('%d/%m/%Y'),
                         issues=issues,
                         hang_muc_list=HANG_MUC_LIST,
                         now_date=datetime.now().strftime('%Y-%m-%d'),
                         start_date=start_date,
                         end_date=end_date,
                         active_tab=active_tab,
                         mobile_equipments=mobile_equipments,
                         transfer_history=transfer_history)


@daily_work_bp.route('/export-daily-work')
@login_required
def export_daily_work():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    query = DailyWork.query
    if start_date:
        query = query.filter(DailyWork.ngay >= start_date)
    if end_date:
        query = query.filter(DailyWork.ngay <= end_date)
    
    works = query.order_by(DailyWork.ngay.desc()).all()
    
    data = []
    for w in works:
        data.append({
            'Ngày': w.ngay,
            'ID Trạm': w.id_tram,
            'Hạng Mục': w.hang_muc,
            'Nội Dung': w.noi_dung,
            'Tồn Tại VHKT': w.ton_tai_vhkt,
            'Tồn Tại CSHT': w.ton_tai_csht,
            'Ghi Chú': w.ghi_chu,
            'Người Thực Hiện': w.nhan_vien
        })
    
    import pandas as pd
    import io
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='CongViecHangNgay')
    
    output.seek(0)
    filename = f"CongViecHangNgay_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(output, as_attachment=True, download_name=filename, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@daily_work_bp.route('/daily-work/delete/<int:work_id>', methods=['POST'])
@login_required
def delete_daily_work(work_id):
    try:
        record = DailyWork.query.get_or_404(work_id)
        db.session.delete(record)
        db.session.commit()
        flash('Xóa thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('daily_work.daily_work'))


@daily_work_bp.route('/daily-work/add', methods=['POST'])
@login_required
def add_daily_work():
    id_tram = request.form.get('id_tram')
    
    # Validate Station ID
    station_exists = GeneralInfo.query.filter_by(id_tram=id_tram).first()
    if not station_exists:
        flash(f'Mã trạm {id_tram} không tồn tại trong danh sách quản lý. Vui lòng nhập lại.', 'danger')
        return redirect(url_for('daily_work.daily_work'))

    try:
        new_work = DailyWork(
            ngay=request.form.get('ngay'),
            id_tram=id_tram,
            nhan_vien=session.get('full_name') or session.get('username'),
            noi_dung=request.form.get('noi_dung'),
            hang_muc=request.form.get('hang_muc'),
            ghi_chu=request.form.get('ghi_chu')
        )
        db.session.add(new_work)

        # Also create StationIssue records if any were filled in
        issue_hang_mucs = request.form.getlist('issue_hang_muc[]')
        issue_mo_tas = request.form.getlist('issue_mo_ta[]')
        issue_count = 0
        for hm, mt in zip(issue_hang_mucs, issue_mo_tas):
            if hm and mt and mt.strip():
                issue = StationIssue(
                    ngay_phat_hien=request.form.get('ngay'),
                    id_tram=id_tram,
                    hang_muc=hm,
                    mo_ta=mt.strip(),
                    trang_thai='Chưa XL',
                    nguoi_bao_cao=session.get('full_name') or session.get('username')
                )
                db.session.add(issue)
                issue_count += 1

        db.session.commit()
        msg = 'Đã lưu công việc hàng ngày thành công!'
        if issue_count > 0:
            msg += f' + {issue_count} tồn tại.'
        flash(msg, 'success')
    except Exception as e:
        flash(f'Lỗi khi lưu: {str(e)}', 'danger')
    return redirect(url_for('daily_work.daily_work', tab='work'))


@daily_work_bp.route('/daily-work/edit/<int:id>', methods=['POST'])
@login_required
def edit_daily_work(id):
    try:
        item = DailyWork.query.get_or_404(id)
        item.ngay = request.form.get('ngay')
        item.id_tram = request.form.get('id_tram')
        item.noi_dung = request.form.get('noi_dung')
        item.hang_muc = request.form.get('hang_muc')
        item.ghi_chu = request.form.get('ghi_chu')
        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash('Cập nhật công việc thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('daily_work.daily_work'))
