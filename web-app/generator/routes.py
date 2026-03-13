"""
Generator routes — Power Schedule, Fuel, General Info, Generator Logs, Expenses
Extracted from app.py
"""
from flask import render_template, request, redirect, url_for, flash, send_file, session, jsonify
import json
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
from auth import login_required, admin_required, cost_access_required
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


# ── Backward compatibility redirects ──
@generator_bp.route('/power-schedule')
@generator_bp.route('/lich-cup')
@login_required
def legacy_schedule_redirect():
    """Redirect old power schedule URLs to Daily Work."""
    return redirect(url_for('daily_work.daily_work', tab='schedule'))


# ============================================================
# MAIN GENERATOR PAGE (now: Chi Phí)
# ============================================================

@generator_bp.route('/generator')
@login_required
@cost_access_required
def generator():
    active_tab = request.args.get('tab', 'fuel')
    # Redirect schedule tab → daily_work
    if active_tab == 'schedule':
        return redirect(url_for('daily_work.daily_work', tab='schedule'))

    now = datetime.now()
    today_str = now.strftime('%Y-%m-%d')

    # ── Shared lightweight data (always needed for modals/forms) ──
    stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()

    # ── Safe defaults (unused tabs get empty data) ──
    schedules = []
    fuel_logs = []
    central_stock = {'Dầu': 0, 'Xăng': 0, 'total': 0}
    fuel_year = now.year
    fuel_month = now.month
    fuel_years = list(range(2025, now.year + 1))
    expenses = []
    exp_year = now.year
    exp_month = now.month
    exp_years = list(range(2025, now.year + 1))
    payment_data = {}
    payment_records = {}
    payment_groups = {
        'mua_ngoai': {'so_tien_da_tt': 0, 'da_thanh_toan_den': '', 'ghi_chu': '', 'updated_at': '', 'updated_by': ''},
        'cx222': {'so_tien_da_tt': 0, 'da_thanh_toan_den': '', 'ghi_chu': '', 'updated_at': '', 'updated_by': ''}
    }
    pay_month = None
    pay_year = now.year
    pay_years = list(range(2025, now.year + 1))
    mua_ngoai_total = 0
    cx222_total = 0
    mua_ngoai_new = 0
    cx222_new = 0



    # ── Tab-specific data loading ──
    if active_tab == 'fuel':
        # Nhiên liệu: lọc tháng/năm, default tháng hiện tại
        fuel_year = request.args.get('fuel_year', type=int, default=now.year)
        fuel_month_raw = request.args.get('fuel_month', '')
        fuel_month = int(fuel_month_raw) if fuel_month_raw.strip() else None
        central_stock = get_central_stock()
        if fuel_month:
            f_start = f"{fuel_year}-{fuel_month:02d}-01"
            f_end = f"{fuel_year}-{fuel_month+1:02d}-01" if fuel_month < 12 else f"{fuel_year+1}-01-01"
        else:
            f_start = f"{fuel_year}-01-01"
            f_end = f"{fuel_year+1}-01-01"
        fuel_logs = FuelLedger.query.filter(
            FuelLedger.ngay >= f_start, FuelLedger.ngay < f_end
        ).order_by(FuelLedger.ngay.desc()).limit(30).all()

    elif active_tab == 'expense':
        # Chi phí khác: lọc tháng/năm, default tháng hiện tại
        exp_year = request.args.get('exp_year', type=int, default=now.year)
        exp_month_raw = request.args.get('exp_month', '')
        exp_month = int(exp_month_raw) if exp_month_raw.strip() else None
        if exp_month:
            e_start = f"{exp_year}-{exp_month:02d}-01"
            e_end = f"{exp_year}-{exp_month+1:02d}-01" if exp_month < 12 else f"{exp_year+1}-01-01"
        else:
            e_start = f"{exp_year}-01-01"
            e_end = f"{exp_year+1}-01-01"
        expenses = OtherExpense.query.filter(
            OtherExpense.ngay_su_dung >= e_start, OtherExpense.ngay_su_dung < e_end
        ).order_by(OtherExpense.ngay_su_dung.desc()).limit(30).all()

    elif active_tab == 'payment':
        # Payment aggregation (heaviest query — only when needed)
        from core.routes import load_payment_records, load_payment_groups
        payment_records = load_payment_records()
        payment_groups = load_payment_groups()

        pay_year = request.args.get('pay_year', type=int, default=now.year)
        pay_month_raw = request.args.get('pay_month', '')
        pay_month = int(pay_month_raw) if pay_month_raw.strip() else None

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

        # Group totals
        fuel_grp_q = db.session.query(
            FuelLedger.nha_cung_cap, fn.sum(FuelLedger.thanh_tien)
        ).filter(
            FuelLedger.ngay >= p_start, FuelLedger.ngay < p_end,
            FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
        ).group_by(FuelLedger.nha_cung_cap).all()

        for ncc, amt in fuel_grp_q:
            ncc_up = (ncc or '').strip().upper()
            if 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up:
                cx222_total += (amt or 0)
            else:
                mua_ngoai_total += (amt or 0)
        oe_total = db.session.query(fn.sum(OtherExpense.so_tien)).filter(
            OtherExpense.ngay_su_dung >= p_start,
            OtherExpense.ngay_su_dung < p_end
        ).scalar() or 0
        mua_ngoai_total += oe_total

        # New expenses since last payment
        today_str2 = now.strftime('%Y-%m-%d')
        def _calc_new(group_key, cutoff):
            if not cutoff:
                return 0
            try:
                if group_key == 'cx222':
                    result = 0
                    for ncc2, amt2 in db.session.query(
                        FuelLedger.nha_cung_cap, fn.sum(FuelLedger.thanh_tien)
                    ).filter(
                        FuelLedger.ngay > cutoff, FuelLedger.ngay <= today_str2,
                        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
                    ).group_by(FuelLedger.nha_cung_cap).all():
                        ncc_u = (ncc2 or '').strip().upper()
                        if 'CX' in ncc_u or 'CÂY XĂNG' in ncc_u or 'CX222' in ncc_u:
                            result += (amt2 or 0)
                    return result
                else:
                    result = 0
                    for ncc2, amt2 in db.session.query(
                        FuelLedger.nha_cung_cap, fn.sum(FuelLedger.thanh_tien)
                    ).filter(
                        FuelLedger.ngay > cutoff, FuelLedger.ngay <= today_str2,
                        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
                    ).group_by(FuelLedger.nha_cung_cap).all():
                        ncc_u = (ncc2 or '').strip().upper()
                        if 'CX' not in ncc_u and 'CÂY XĂNG' not in ncc_u and 'CX222' not in ncc_u:
                            result += (amt2 or 0)
                    result += db.session.query(fn.sum(OtherExpense.so_tien)).filter(
                        OtherExpense.ngay_su_dung > cutoff,
                        OtherExpense.ngay_su_dung <= today_str2
                    ).scalar() or 0
                    return result
            except Exception:
                return 0

        mua_ngoai_new = _calc_new('mua_ngoai', payment_groups['mua_ngoai'].get('da_thanh_toan_den', ''))
        cx222_new = _calc_new('cx222', payment_groups['cx222'].get('da_thanh_toan_den', ''))



    # ── Pre-compute fuel prices + fuel stock for instant rendering ──
    fuel_prices = {'xang_ron95': 0, 'dau_do': 0}
    fuel_stock_json = '{}'
    try:
        from fuel_price import get_fuel_prices
        fuel_prices = get_fuel_prices()
    except Exception:
        pass
    if active_tab == 'fuel':
        try:
            from generator.routes_fuel import get_audit_data
            audit = get_audit_data()
            all_st = GeneralInfo.query.all()
            fs = {}
            for s in all_st:
                fs[s.id_tram] = {'ton_real': 0}
            for row in audit:
                fs[row['id_tram']] = {'ton_real': row['ton_real']}
            fuel_stock_json = json.dumps(fs)
        except Exception:
            pass

    return render_template('generator.html',
                           schedules=schedules,
                           stations=stations,
                           fuel_logs=fuel_logs,
                           central_stock=central_stock,
                           fuel_year=fuel_year,
                           fuel_month=fuel_month,
                           fuel_years=fuel_years,
                           expenses=expenses,
                           exp_year=exp_year,
                           exp_month=exp_month,
                           exp_years=exp_years,
                           now_date=today_str,
                           now_dt=now.strftime('%Y-%m-%dT%H:%M'),
                           active_tab=active_tab,
                           payment_data=payment_data,
                           payment_records=payment_records,
                           pay_month=pay_month,
                           pay_year=pay_year,
                           pay_years=pay_years,
                           payment_groups=payment_groups,
                           mua_ngoai_total=mua_ngoai_total,
                           cx222_total=cx222_total,
                           mua_ngoai_new=mua_ngoai_new,
                           cx222_new=cx222_new,
                           fuel_prices=fuel_prices,
                           fuel_stock_json=fuel_stock_json,
                           users=[])


# ============================================================
# PAYMENT GROUP SAVE (accessible by all logged-in users)
# ============================================================

@generator_bp.route('/payment-group/save', methods=['POST'])
@login_required
def save_payment_group_gen():
    """Lưu trạng thái thanh toán nhóm (mua_ngoai / cx222). Không cần admin."""
    from flask import jsonify
    from core.routes import load_payment_groups, save_payment_groups
    data = request.get_json()
    if not data:
        return jsonify({'ok': False, 'msg': 'No data'}), 400

    group = data.get('group', '').strip()
    da_thanh_toan_den = data.get('da_thanh_toan_den', '').strip()
    so_tien_da_tt = data.get('so_tien_da_tt', 0)
    ghi_chu = data.get('ghi_chu', '').strip()

    if group not in ('mua_ngoai', 'cx222'):
        return jsonify({'ok': False, 'msg': 'Nhóm không hợp lệ'}), 400

    records = load_payment_groups()
    records[group] = {
        'da_thanh_toan_den': da_thanh_toan_den,
        'so_tien_da_tt': float(so_tien_da_tt),
        'ghi_chu': ghi_chu,
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M'),
        'updated_by': session.get('username', '')
    }
    try:
        save_payment_groups(records)
    except Exception as e:
        return jsonify({'ok': False, 'msg': str(e)}), 500
    return jsonify({'ok': True})


@generator_bp.route('/payment-group/calc')
@login_required
def calc_payment_amount():
    """Tính số tiền CÒN LẠI cần thanh toán đến den_ngay cho nhóm group.
    Logic: Tổng CP(đầu năm → den_ngay) - số tiền đã TT trước đó.
    Nếu den_ngay <= ngày TT gần nhất → báo đã TT rồi.
    """
    from flask import jsonify
    from sqlalchemy import func as _fn
    from core.routes import load_payment_groups

    group = request.args.get('group', '').strip()
    den_ngay = request.args.get('den_ngay', '').strip()
    if group not in ('mua_ngoai', 'cx222') or not den_ngay:
        return jsonify({'ok': False, 'total': 0}), 400

    try:
        year = int(den_ngay[:4])
        p_start = f"{year}-01-01"
    except (ValueError, IndexError):
        return jsonify({'ok': False, 'total': 0}), 400

    # Đọc thông tin thanh toán gần nhất
    pg = load_payment_groups()
    grp_info = pg.get(group, {})
    last_paid_date = grp_info.get('da_thanh_toan_den', '')
    last_paid_amount = float(grp_info.get('so_tien_da_tt', 0))

    # Nếu ngày chọn <= ngày đã TT gần nhất → đã TT rồi
    if last_paid_date and den_ngay <= last_paid_date:
        return jsonify({'ok': True, 'total': 0, 'already_paid': True,
                        'last_paid_date': last_paid_date})

    # Tính tổng CP từ đầu năm đến den_ngay
    total_cp = 0
    fuel_q = db.session.query(
        FuelLedger.nha_cung_cap, _fn.sum(FuelLedger.thanh_tien)
    ).filter(
        FuelLedger.ngay >= p_start,
        FuelLedger.ngay <= den_ngay,
        FuelLedger.type.in_(['STOCK_IN', 'DIRECT_BUY'])
    ).group_by(FuelLedger.nha_cung_cap).all()

    for ncc, amt in fuel_q:
        ncc_up = (ncc or '').strip().upper()
        is_cx = 'CX' in ncc_up or 'CÂY XĂNG' in ncc_up or 'CX222' in ncc_up
        if group == 'cx222' and is_cx:
            total_cp += (amt or 0)
        elif group == 'mua_ngoai' and not is_cx:
            total_cp += (amt or 0)

    if group == 'mua_ngoai':
        oe = db.session.query(_fn.sum(OtherExpense.so_tien)).filter(
            OtherExpense.ngay_su_dung >= p_start,
            OtherExpense.ngay_su_dung <= den_ngay
        ).scalar() or 0
        total_cp += oe

    # Số còn lại = tổng CP - số đã TT
    con_lai = total_cp - last_paid_amount
    if con_lai < 0:
        con_lai = 0

    return jsonify({
        'ok': True,
        'total': total_cp,
        'da_tt': last_paid_amount,
        'con_lai': con_lai,
        'already_paid': False,
        'last_paid_date': last_paid_date
    })


# Power schedule routes moved to daily_work/routes_schedule.py
# Legacy redirects for bookmarked URLs:
@generator_bp.route('/power-schedule/add', methods=['POST'])
@generator_bp.route('/power-schedule/edit/<int:id>', methods=['POST'])
@generator_bp.route('/power-schedule/delete/<int:id>')
@generator_bp.route('/power-schedule/export')
@generator_bp.route('/power-schedule/template')
@generator_bp.route('/power-schedule/reset')
@generator_bp.route('/power-schedule/import', methods=['POST'])
@generator_bp.route('/admin/fetch-outages')
@login_required
def legacy_power_redirect(**kwargs):
    return redirect(url_for('daily_work.daily_work', tab='schedule'))


# ============================================================
# GENERATOR LOG — APPROVE / REJECT  (Admin only)
# ============================================================

@generator_bp.route('/generator/approve/<int:id>', methods=['POST'])
@login_required
@admin_required
def approve_log(id):
    """Approve a pending GeneratorLog record."""
    log = GeneratorLog.query.get_or_404(id)
    log.status = 'approved'
    db.session.commit()
    flash(f'✅ Đã duyệt: {log.id_tram} ({log.ngay_van_hanh})', 'success')
    return redirect(request.referrer or url_for('generator.generator', tab='logs'))


@generator_bp.route('/generator/reject/<int:id>', methods=['POST'])
@login_required
@admin_required
def reject_log(id):
    """Reject a pending GeneratorLog record."""
    log = GeneratorLog.query.get_or_404(id)
    log.status = 'rejected'
    db.session.commit()
    flash(f'❌ Đã từ chối: {log.id_tram} ({log.ngay_van_hanh})', 'warning')
    return redirect(request.referrer or url_for('generator.generator', tab='logs'))


@generator_bp.route('/generator/update-log/<int:id>', methods=['POST'])
@login_required
@admin_required
def update_log(id):
    """Update a GeneratorLog record (edit times) and auto-approve."""
    log = GeneratorLog.query.get_or_404(id)

    # Update editable fields
    gio_bat_dau = request.form.get('gio_bat_dau', '').strip()
    gio_ket_thuc = request.form.get('gio_ket_thuc', '').strip()

    if gio_bat_dau:
        log.gio_bat_dau = gio_bat_dau
    if gio_ket_thuc:
        log.gio_ket_thuc = gio_ket_thuc

    # Recalculate duration + costs
    if gio_bat_dau and gio_ket_thuc:
        try:
            t1 = datetime.strptime(gio_bat_dau, '%H:%M')
            t2 = datetime.strptime(gio_ket_thuc, '%H:%M')
            
            diff = (t2 - t1).total_seconds() / 3600
            
            # If end time is before start time, it's overnight
            if t2.time() < t1.time():
                diff += 24  # Overnight
                if '(Chạy qua đêm)' not in (log.ghi_chu or ''):
                    log.ghi_chu = f"(Chạy qua đêm) {log.ghi_chu or ''}".strip()
                    
            log.thoi_gian_hoat_dong = round(diff, 2)

            # Recalculate fuel consumption
            dinh_muc = float(log.dinh_muc) if log.dinh_muc else 0
            log.nhien_lieu_tieu_hao = round(diff * dinh_muc, 2)

            # Recalculate cost with current PVOil price
            from generator.mfd_import import get_pretax_price
            log.don_gia = get_pretax_price(log.nhien_lieu)
            log.thanh_tien = round(log.nhien_lieu_tieu_hao * log.don_gia)
        except (ValueError, TypeError):
            pass

    # Auto-approve after edit
    log.status = 'approved'
    db.session.commit()
    flash(f'✅ Đã cập nhật và duyệt: {log.id_tram} ({log.ngay_van_hanh})', 'success')
    return redirect(request.referrer or url_for('generator.generator', tab='logs'))
