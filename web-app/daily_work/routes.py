"""
Daily Work routes — extracted from app.py
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session
from datetime import datetime
from extensions import db
from models import DailyWork, GeneralInfo, MobileEquipment, EquipmentTransfer
from auth import login_required
from daily_work import daily_work_bp


@daily_work_bp.route('/daily-work')
@login_required
def daily_work():
    active_tab = request.args.get('tab', 'work')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    works = []
    mobile_equipments = []
    transfer_history = []

    if active_tab == 'work':
        query = DailyWork.query
        if start_date:
            query = query.filter(DailyWork.ngay >= start_date)
        if end_date:
            query = query.filter(DailyWork.ngay <= end_date)
        works = query.order_by(DailyWork.ngay.desc()).all()
    elif active_tab == 'equipment':
        mobile_equipments = MobileEquipment.query.order_by(MobileEquipment.loai, MobileEquipment.ma_thiet_bi).all()
        transfer_history = EquipmentTransfer.query.order_by(
            EquipmentTransfer.ngay_dieu_chuyen.desc()
        ).limit(15).all()

    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
    return render_template('daily_work.html',
                         works=works,
                         stations=stations,
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
            ton_tai_vhkt=request.form.get('ton_tai_vhkt'),
            ton_tai_csht=request.form.get('ton_tai_csht'),
            ghi_chu=request.form.get('ghi_chu')
        )
        db.session.add(new_work)
        db.session.commit()
        flash('Đã lưu công việc hàng ngày thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi khi lưu: {str(e)}', 'danger')
    return redirect(url_for('daily_work.daily_work'))


@daily_work_bp.route('/daily-work/edit/<int:id>', methods=['POST'])
@login_required
def edit_daily_work(id):
    try:
        item = DailyWork.query.get_or_404(id)
        item.ngay = request.form.get('ngay')
        item.id_tram = request.form.get('id_tram')
        item.noi_dung = request.form.get('noi_dung')
        item.hang_muc = request.form.get('hang_muc')
        item.ton_tai_vhkt = request.form.get('ton_tai_vhkt')
        item.ton_tai_csht = request.form.get('ton_tai_csht')
        item.ghi_chu = request.form.get('ghi_chu')
        item.ngay_cap_nhat = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        db.session.commit()
        flash('Cập nhật công việc thành công!', 'success')
    except Exception as e:
        flash(f'Lỗi cập nhật: {str(e)}', 'danger')
    return redirect(request.referrer or url_for('daily_work.daily_work'))
