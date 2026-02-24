"""
Helper functions extracted from app.py for cleaner code organization.
"""
from datetime import datetime
from collections import defaultdict
from sqlalchemy import func
from extensions import db
from models import (
    GeneralInfo, PowerSchedule, GeneratorLog,
    FuelLedger, FuelRefillLog, FuelPurchaseLog, OtherExpense
)


# ── Central Stock ────────────────────────────────────────────────
def _fuel_type_filter(fuel_type):
    """Build filter for loai_nhien_lieu. NULL/empty treated as 'Dầu'."""
    if fuel_type == 'Dầu':
        return (FuelLedger.loai_nhien_lieu == 'Dầu') | \
               (FuelLedger.loai_nhien_lieu == None) | \
               (FuelLedger.loai_nhien_lieu == '')
    return FuelLedger.loai_nhien_lieu == fuel_type


def get_central_stock():
    """Calculate central warehouse fuel stock from FuelLedger.
    Returns dict: {'Dầu': float, 'Xăng': float, 'total': float}
    Stock per type = STOCK_IN - STATION_OUT + central ADJUSTMENT
    NULL/empty loai_nhien_lieu is treated as 'Dầu'.
    """
    result = {}
    for fuel_type in ['Dầu', 'Xăng']:
        ft = _fuel_type_filter(fuel_type)

        stock_in = db.session.query(db.func.sum(FuelLedger.so_luong)).filter(
            FuelLedger.type == 'STOCK_IN', FuelLedger.is_approved == True, ft
        ).scalar() or 0

        station_out = db.session.query(db.func.sum(FuelLedger.so_luong)).filter(
            FuelLedger.type == 'STATION_OUT', FuelLedger.is_approved == True, ft
        ).scalar() or 0

        adjustments = db.session.query(db.func.sum(FuelLedger.so_luong)).filter(
            FuelLedger.type == 'ADJUSTMENT', FuelLedger.is_approved == True, ft,
            (FuelLedger.id_tram == None) | (FuelLedger.id_tram == '')
        ).scalar() or 0

        result[fuel_type] = stock_in - station_out + adjustments

    result['total'] = result['Dầu'] + result['Xăng']
    return result


# ── Dashboard Stats ──────────────────────────────────────────────
def get_dashboard_stats(current_month, selected_year):
    """Aggregate monthly/yearly stats for dashboard cards."""
    purchases_all = FuelPurchaseLog.query.all()
    expenses_all = OtherExpense.query.all()

    # Monthly
    m_purchases = [p for p in purchases_all if p.ngay_mua and p.ngay_mua.startswith(current_month)]
    m_liters = sum(p.so_luong or 0 for p in m_purchases)
    m_cost = sum(p.thanh_tien or 0 for p in m_purchases)
    m_expenses = sum(e.so_tien or 0 for e in expenses_all if e.ngay_su_dung and e.ngay_su_dung.startswith(current_month))

    # Yearly
    y_purchases = [p for p in purchases_all if p.ngay_mua and p.ngay_mua.startswith(selected_year)]
    y_liters = sum(p.so_luong or 0 for p in y_purchases)
    y_cost = sum(p.thanh_tien or 0 for p in y_purchases)
    y_expenses = sum(e.so_tien or 0 for e in expenses_all if e.ngay_su_dung and e.ngay_su_dung.startswith(selected_year))

    logs = GeneratorLog.query.all()
    this_month_logs = [l for l in logs if l.ngay_van_hanh and l.ngay_van_hanh.startswith(current_month)]
    total_hours = sum(l.thoi_gian_hoat_dong or 0 for l in this_month_logs)
    total_revenue = sum(l.thanh_tien or 0 for l in logs if l.ngay_van_hanh and l.ngay_van_hanh.startswith(selected_year))

    # Stock Discrepancy (legacy)
    total_bought = sum(p.so_luong or 0 for p in purchases_all)
    total_refilled = sum(r.so_luong or 0 for r in FuelRefillLog.query.all())
    stock_balance = max(0.0, total_bought - total_refilled)

    return {
        'total_liters': m_liters, 'total_cost': m_cost, 'm_expenses': m_expenses,
        'year_liters': y_liters, 'year_cost': y_cost, 'y_expenses': y_expenses,
        'total_revenue': total_revenue, 'other_expenses_total': y_expenses,
        'stock_balance': stock_balance, 'total_hours': total_hours
    }


# ── Fuel Anomalies ───────────────────────────────────────────────
def detect_fuel_anomalies():
    """Detect suspicious fuel patterns (overflow, consecutive refills without run)."""
    anomalies = []
    refills = FuelRefillLog.query.all()
    logs = GeneratorLog.query.all()
    station_map = {s.id_tram: s for s in GeneralInfo.query.all()}

    refill_seq = defaultdict(list)
    for r in refills:
        r_day = r.ngay_cham.split(' ')[0] if r.ngay_cham else None
        if r_day:
            refill_seq[r.id_tram].append(r)

    log_map = {}
    for l in logs:
        key = (l.id_tram, l.ngay_van_hanh)
        log_map[key] = log_map.get(key, 0.0) + (l.thoi_gian_hoat_dong or 0.0)

    for sid, r_list in refill_seq.items():
        r_list.sort(key=lambda x: x.ngay_cham)
        station = station_map.get(sid)
        if not station or not station.dung_tich:
            continue

        station_refills = sum(r.so_luong or 0 for r in r_list)
        station_runs = [l for l in logs if l.id_tram == sid]
        station_consumed = sum((l.thoi_gian_hoat_dong or 0) * (station.dinh_muc_thuc_te or 0) for l in station_runs)
        estimated_stock = max(0, station_refills - station_consumed)

        if estimated_stock >= (station.dung_tich * 0.95):
            anomalies.append({
                'id_tram': sid, 'ngay': datetime.now().strftime('%Y-%m-%d'),
                'val': round(estimated_stock, 1),
                'ly_do': f'Tổng tồn dầu ({round(estimated_stock, 1)}L) sắp hoặc đã vượt dung tích bồn ({station.dung_tich}L)'
            })

        consecutive_no_run = 0
        for r in r_list:
            r_day = r.ngay_cham.split(' ')[0] if r.ngay_cham else None
            if not r_day:
                continue
            if log_map.get((sid, r_day), 0.0) <= 0:
                consecutive_no_run += 1
                if consecutive_no_run >= 2:
                    anomalies.append({
                        'id_tram': sid, 'ngay': r_day, 'val': consecutive_no_run,
                        'ly_do': f'Châm dầu {consecutive_no_run} lần liên tiếp không chạy máy'
                    })
            else:
                consecutive_no_run = 0
    return anomalies


# ── Upcoming Outages ─────────────────────────────────────────────
def get_upcoming_outages(today_str):
    """Get future outages with estimated fuel need per station."""
    future_outages = PowerSchedule.query.filter(PowerSchedule.ngay_mat_dien >= today_str).all()
    upcoming_list = []
    station_map = {s.id_tram: s for s in GeneralInfo.query.all()}

    for o in future_outages:
        need = 0.0
        try:
            if not o.thoi_gian_cup_dien or not o.thoi_gian_co_dien:
                raise ValueError
            pts_s = o.thoi_gian_cup_dien.split(':')
            pts_e = o.thoi_gian_co_dien.split(':')
            m_s = int(pts_s[0]) * 60 + int(pts_s[1])
            m_e = int(pts_e[0]) * 60 + int(pts_e[1])
            diff = (m_e - m_s) if m_e >= m_s else (m_e - m_s + 1440)
            st = station_map.get(o.id_tram)
            need = (diff / 60.0) * (st.dinh_muc_thuc_te if st else 0)
        except:
            pass
        upcoming_list.append({
            'site': o.id_tram, 'bat_dau': f"{o.thoi_gian_cup_dien} {o.ngay_mat_dien}",
            'ket_thuc': f"{o.thoi_gian_co_dien} {o.ngay_mat_dien}", 'du_kien_tieu_hao': round(need, 2)
        })
    return upcoming_list


# ── Audit / KPI Data ─────────────────────────────────────────────

def _apply_date_filter(query, date_column, start_date, end_date):
    """Apply start/end date filters to a query."""
    if start_date:
        query = query.filter(date_column >= start_date)
    if end_date:
        query = query.filter(date_column <= end_date)
    return query


def _aggregate_generator_logs(start_date, end_date):
    """Aggregate generator log stats grouped by station."""
    gen_q = db.session.query(
        GeneratorLog.id_tram,
        func.sum(GeneratorLog.thoi_gian_hoat_dong).label('total_h'),
        func.count(GeneratorLog.id).label('gen_count'),
        func.sum(GeneratorLog.nhien_lieu_tieu_hao).label('gen_fuel'),
        func.sum(GeneratorLog.thanh_tien).label('gen_cost')
    )
    gen_q = _apply_date_filter(gen_q, GeneratorLog.ngay_van_hanh, start_date, end_date)
    return {r[0]: {'h': r[1] or 0, 'cnt': r[2] or 0, 'fuel': r[3] or 0, 'cost': r[4] or 0}
            for r in gen_q.group_by(GeneratorLog.id_tram).all()}


def _aggregate_fuel_ledger(start_date, end_date):
    """Aggregate FuelLedger DIRECT_BUY and STATION_OUT by station."""
    fl_q1 = db.session.query(
        FuelLedger.id_tram,
        func.sum(FuelLedger.so_luong).label('qty'),
        func.sum(FuelLedger.thanh_tien).label('cost')
    ).filter(FuelLedger.type == 'DIRECT_BUY')
    fl_q1 = _apply_date_filter(fl_q1, FuelLedger.ngay, start_date, end_date)
    direct_dict = {r[0]: {'qty': r[1] or 0, 'cost': r[2] or 0} for r in fl_q1.group_by(FuelLedger.id_tram).all()}

    fl_q2 = db.session.query(
        FuelLedger.id_tram,
        func.sum(FuelLedger.so_luong).label('qty')
    ).filter(FuelLedger.type == 'STATION_OUT')
    fl_q2 = _apply_date_filter(fl_q2, FuelLedger.ngay, start_date, end_date)
    station_out_dict = {r[0]: (r[1] or 0) for r in fl_q2.group_by(FuelLedger.id_tram).all()}

    return direct_dict, station_out_dict


def _aggregate_cumulative_received(end_date=None):
    """Aggregate ALL fuel received by each station up to end_date.
    Combines FuelRefillLog (2025 legacy) + FuelLedger DIRECT_BUY/STATION_OUT (2026+).
    """
    # Legacy refills from FuelRefillLog (2025 data)
    refill_q = db.session.query(
        FuelRefillLog.id_tram,
        func.sum(FuelRefillLog.so_luong).label('total')
    )
    if end_date:
        refill_q = refill_q.filter(FuelRefillLog.ngay_cham <= end_date)
    refill_dict = {r[0]: float(r[1] or 0) for r in refill_q.group_by(FuelRefillLog.id_tram).all()}

    # New ledger: DIRECT_BUY + STATION_OUT (2026+)
    for tx_type in ('DIRECT_BUY', 'STATION_OUT'):
        ledger_q = db.session.query(
            FuelLedger.id_tram,
            func.sum(FuelLedger.so_luong).label('total')
        ).filter(FuelLedger.type == tx_type)
        if end_date:
            ledger_q = ledger_q.filter(FuelLedger.ngay <= end_date)
        for r in ledger_q.group_by(FuelLedger.id_tram).all():
            refill_dict[r[0]] = refill_dict.get(r[0], 0) + float(r[1] or 0)

    return refill_dict


def get_audit_data(huyen_filter=None, start_date=None, end_date=None):
    """Build per-station audit/KPI report.

    Period columns (gen, fuel received, outages) are filtered by start/end date.
    Cumulative stock (ton_real, ton_min) = ALL received up to end_date
                                          − ALL consumed up to end_date, floor=0.
    """
    # ── Period data (filtered by start_date → end_date) ──
    gen_dict = _aggregate_generator_logs(start_date, end_date)
    direct_dict, station_out_dict = _aggregate_fuel_ledger(start_date, end_date)

    # Outages (period)
    outage_q = db.session.query(PowerSchedule.id_tram, func.count(PowerSchedule.id).label('cnt'))
    outage_q = _apply_date_filter(outage_q, PowerSchedule.ngay_mat_dien, start_date, end_date)
    outage_dict = {o[0]: o[1] for o in outage_q.group_by(PowerSchedule.id_tram).all()}

    # ── Cumulative data (ALL TIME up to end_date) for stock calculation ──
    cum_received = _aggregate_cumulative_received(end_date)
    cum_gen = _aggregate_generator_logs(None, end_date)  # all time → end_date

    # Stations
    query = GeneralInfo.query
    if huyen_filter:
        query = query.filter_by(huyen=huyen_filter)
    stations = query.all()

    audit_data = []
    for s in stations:
        # Period metrics
        g = gen_dict.get(s.id_tram, {'h': 0, 'cnt': 0, 'fuel': 0, 'cost': 0})
        h = g['h']
        out_cnt = outage_dict.get(s.id_tram, 0)
        d = direct_dict.get(s.id_tram, {'qty': 0, 'cost': 0})
        so_qty = station_out_dict.get(s.id_tram, 0)

        # Period consumption
        actual_cons = h * (s.dinh_muc_thuc_te or 0)
        max_cons = h * (s.dinh_muc or 0)

        # Cumulative stock (ALL TIME up to end_date)
        cum_total_received = cum_received.get(s.id_tram, 0)
        cum_g = cum_gen.get(s.id_tram, {'h': 0})
        cum_consumed_real = cum_g['h'] * (s.dinh_muc_thuc_te or 0)
        cum_consumed_max = cum_g['h'] * (s.dinh_muc or 0)
        ton_real = max(0, cum_total_received - cum_consumed_real)
        ton_min = max(0, cum_total_received - cum_consumed_max)

        fuel_cost = d['cost']
        gen_payment = g['cost']
        chenh_lech = gen_payment - fuel_cost

        if h > 0 or cum_total_received > 0 or out_cnt > 0 or d['qty'] > 0 or so_qty > 0:
            audit_data.append({
                'id_tram': s.id_tram, 'huyen': s.huyen,
                'may_phat': s.may_phat_dien or '', 'dung_tich': s.dung_tich or 0,
                'loai_may': s.loai_may or '', 'loai_nl': s.loai_nhien_lieu or '',
                'dm_thuc_te': s.dinh_muc_thuc_te or 0, 'dm_thanh_toan': s.dinh_muc or 0,
                'gen_count': g['cnt'], 'run_h': round(h, 2),
                'gen_fuel': round(g['fuel'], 2), 'gen_cost': round(gen_payment, 0),
                'direct_buy_qty': round(d['qty'], 2), 'station_out_qty': round(so_qty, 2),
                'total_refill': round(d['qty'] + so_qty, 2), 'fuel_cost': round(fuel_cost, 0),
                'actual_cons': round(actual_cons, 2), 'max_cons': round(max_cons, 2),
                'ton_real': round(ton_real, 2), 'ton_min': round(ton_min, 2),
                'outages_cnt': out_cnt, 'chenh_lech': round(chenh_lech, 0),
            })
    return audit_data
