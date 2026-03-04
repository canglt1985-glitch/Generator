"""
Routes for Mobile Equipment (MPĐ lưu động / Pin lưu động)
CRUD + Transfer (dispatch/recall) + API for Lịch Cúp integration
"""
from flask import request, redirect, url_for, flash, jsonify, session
from datetime import datetime

from extensions import db
from models import MobileEquipment, EquipmentTransfer
from auth import login_required
from generator import generator_bp


# ============================================================
# API: Get all mobile equipment (for VHKT integration)
# ============================================================

@generator_bp.route('/api/mobile-equipment')
@login_required
def api_mobile_equipment():
    """Return all mobile equipment with current location."""
    equips = MobileEquipment.query.all()
    result = []
    for e in equips:
        result.append({
            'id': e.id,
            'ma': e.ma_thiet_bi,
            'loai': e.loai,
            'thong_so': e.thong_so or '',
            'trang_thai': e.trang_thai or 'Tốt',
            'vi_tri': e.vi_tri_hien_tai or 'KHO',
            'nl_ton': e.nl_ton or 0,
            'ghi_chu': e.ghi_chu or '',
        })
    return jsonify(result)


@generator_bp.route('/api/mobile-equipment/by-station')
@login_required
def api_equipment_by_station():
    """Return mobile equipment at a specific station.
    Used by: Lịch cúp modal to show assigned equipment.
    """
    station_id = request.args.get('station_id', '').strip()
    if not station_id:
        return jsonify([])
    equips = MobileEquipment.query.filter_by(
        vi_tri_hien_tai=station_id, trang_thai='Tốt'
    ).all()
    return jsonify([{
        'id': e.id, 'ma': e.ma_thiet_bi, 'loai': e.loai,
        'thong_so': e.thong_so or '', 'nl_ton': e.nl_ton or 0
    } for e in equips])


@generator_bp.route('/api/mobile-equipment/available')
@login_required
def api_equipment_available():
    """Return equipment available for dispatch (at KHO + status Tốt)."""
    equips = MobileEquipment.query.filter_by(
        vi_tri_hien_tai='KHO', trang_thai='Tốt'
    ).all()
    return jsonify([{
        'id': e.id, 'ma': e.ma_thiet_bi, 'loai': e.loai,
        'thong_so': e.thong_so or '', 'nl_ton': e.nl_ton or 0
    } for e in equips])


# ============================================================
# CRUD: Mobile Equipment
# ============================================================

@generator_bp.route('/mobile-equipment/add', methods=['POST'])
@login_required
def add_mobile_equipment():
    try:
        equip = MobileEquipment(
            ma_thiet_bi=request.form['ma_thiet_bi'].strip(),
            loai=request.form.get('loai', 'MPĐ'),
            thong_so=request.form.get('thong_so', '').strip(),
            trang_thai=request.form.get('trang_thai', 'Tốt'),
            vi_tri_hien_tai='KHO',
            nl_ton=float(request.form.get('nl_ton', 0) or 0),
            ghi_chu=request.form.get('ghi_chu', '').strip(),
        )
        db.session.add(equip)
        db.session.commit()
        flash(f'✅ Đã thêm {equip.ma_thiet_bi}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.generator', tab='equipment'))


@generator_bp.route('/mobile-equipment/edit/<int:id>', methods=['POST'])
@login_required
def edit_mobile_equipment(id):
    try:
        equip = MobileEquipment.query.get_or_404(id)
        equip.ma_thiet_bi = request.form['ma_thiet_bi'].strip()
        equip.loai = request.form.get('loai', equip.loai)
        equip.thong_so = request.form.get('thong_so', '').strip()
        equip.trang_thai = request.form.get('trang_thai', equip.trang_thai)
        equip.nl_ton = float(request.form.get('nl_ton', 0) or 0)
        equip.ghi_chu = request.form.get('ghi_chu', '').strip()
        db.session.commit()
        flash(f'✅ Đã cập nhật {equip.ma_thiet_bi}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.generator', tab='equipment'))


@generator_bp.route('/mobile-equipment/delete/<int:id>')
@login_required
def delete_mobile_equipment(id):
    try:
        equip = MobileEquipment.query.get_or_404(id)
        ma = equip.ma_thiet_bi
        db.session.delete(equip)
        db.session.commit()
        flash(f'Đã xóa {ma}', 'success')
    except Exception as e:
        flash(f'Lỗi: {e}', 'danger')
    return redirect(url_for('generator.generator', tab='equipment'))


# ============================================================
# TRANSFER: Dispatch / Recall equipment
# ============================================================

@generator_bp.route('/mobile-equipment/transfer', methods=['POST'])
@login_required
def transfer_equipment():
    """Dispatch equipment to station or recall to KHO."""
    try:
        equip_id = int(request.form['equipment_id'])
        den_vi_tri = request.form['den_vi_tri'].strip()
        nguoi = request.form.get('nguoi_dieu_chuyen', '').strip() or session.get('username', '')
        ghi_chu = request.form.get('ghi_chu', '').strip()

        equip = MobileEquipment.query.get_or_404(equip_id)
        tu_vi_tri = equip.vi_tri_hien_tai

        if tu_vi_tri == den_vi_tri:
            flash('Thiết bị đã ở vị trí này!', 'warning')
            return redirect(request.referrer or url_for('generator.generator', tab='equipment'))

        # Log transfer
        transfer = EquipmentTransfer(
            equipment_id=equip_id,
            tu_vi_tri=tu_vi_tri,
            den_vi_tri=den_vi_tri,
            nguoi_dieu_chuyen=nguoi,
            ghi_chu=ghi_chu
        )
        db.session.add(transfer)

        # Update current location
        equip.vi_tri_hien_tai = den_vi_tri
        db.session.commit()

        action = 'Thu hồi về KHO' if den_vi_tri == 'KHO' else f'Điều chuyển đến {den_vi_tri}'
        flash(f'✅ {equip.ma_thiet_bi}: {action}', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Lỗi: {e}', 'danger')
    return redirect(request.referrer or url_for('generator.generator', tab='equipment'))


@generator_bp.route('/api/mobile-equipment/transfers/<int:equip_id>')
@login_required
def api_equipment_transfers(equip_id):
    """Return transfer history for an equipment."""
    transfers = EquipmentTransfer.query.filter_by(equipment_id=equip_id)\
        .order_by(EquipmentTransfer.ngay_dieu_chuyen.desc()).limit(20).all()
    return jsonify([{
        'id': t.id,
        'tu': t.tu_vi_tri,
        'den': t.den_vi_tri,
        'ngay': t.ngay_dieu_chuyen,
        'nguoi': t.nguoi_dieu_chuyen or '',
        'ghi_chu': t.ghi_chu or ''
    } for t in transfers])
