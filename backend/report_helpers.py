import os
from datetime import datetime, timedelta
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

# Environment & Supabase Client configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_missing_logs_recommendations(start_date=None, end_date=None, grace_days=2, current_date=None):
    """
    Scans power schedule events and checks if they lack a corresponding generator run log.
    If the outage is >= 3 hours, and has no log within 7 days, it flags it.
    Also queries nearby refueling transactions (+/- 5 days) to help verify if fuel was added.
    """
    if current_date is None:
        current_date = datetime.now().date()
    elif isinstance(current_date, str):
        try:
            current_date = datetime.strptime(current_date, '%Y-%m-%d').date()
        except:
            current_date = datetime.now().date()
            
    # 1. Query PowerSchedules in period
    p_query = supabase.table("power_schedule").select("*")
    if start_date:
        p_query = p_query.gte("ngay_mat_dien", start_date)
    if end_date:
        p_query = p_query.lte("ngay_mat_dien", end_date)
    
    res_schedules = p_query.execute()
    schedules = res_schedules.data or []
    if not schedules:
        return []
        
    schedules.sort(key=lambda x: x.get("ngay_mat_dien") or "")
        
    # 2. Query GeneratorLogs
    logs_query = supabase.table("generator_logs").select("site_id, date, run_details")
    if start_date:
        s_dt = datetime.strptime(start_date, '%Y-%m-%d') - timedelta(days=5)
        logs_query = logs_query.gte("date", s_dt.strftime('%Y-%m-%d'))
    if end_date:
        e_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=10)
        logs_query = logs_query.lte("date", e_dt.strftime('%Y-%m-%d'))
    res_logs = logs_query.execute()
    logs = res_logs.data or []
    
    # 3. Query fuel_and_expenses (refuel)
    refuel_query = supabase.table("fuel_and_expenses").select("site_id, date, fuel_tracking")
    if start_date:
        s_dt = datetime.strptime(start_date, '%Y-%m-%d') - timedelta(days=10)
        refuel_query = refuel_query.gte("date", s_dt.strftime('%Y-%m-%d'))
    if end_date:
        e_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=10)
        refuel_query = refuel_query.lte("date", e_dt.strftime('%Y-%m-%d'))
    res_refuel = refuel_query.execute()
    refuels = res_refuel.data or []

    # Query datasites to map station codes
    res_sites = supabase.table("datasites").select("site_id, site_id_old, name, infrastructure_info").execute()
    datasites = res_sites.data or []
    
    map_id_to_site_id = {}
    ton_by_site = {}
    for s in datasites:
        s_id = (s.get("site_id") or "").strip().upper()
        s_old = (s.get("site_id_old") or "").strip().upper()
        
        infra = s.get("infrastructure_info") or {}
        mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
        nl_ton_val = 0.0
        if mpd_list and len(mpd_list) > 0:
            nl_ton_val = float(mpd_list[0].get("nl_ton") or 0.0)
            
        if s_id:
            map_id_to_site_id[s_id] = s_id
            ton_by_site[s_id] = nl_ton_val
        if s_old:
            map_id_to_site_id[s_old] = s_id
            if s_id not in ton_by_site:
                ton_by_site[s_id] = nl_ton_val

    # Group logs by resolved site_id
    logs_by_station = defaultdict(list)
    for l in logs:
        l_site = (l.get("site_id") or "").strip().upper()
        resolved = map_id_to_site_id.get(l_site, l_site)
        if resolved:
            logs_by_station[resolved].append(l)
            
    # Group refuels by resolved site_id
    refuels_by_station = defaultdict(list)
    for r in refuels:
        r_site = (r.get("site_id") or "").strip().upper()
        resolved = map_id_to_site_id.get(r_site, r_site)
        ft = r.get("fuel_tracking") or {}
        if resolved and ft and ft.get("is_approved") is True and (ft.get("quantity") or 0) > 0:
            refuels_by_station[resolved].append(r)
            
    def calc_hours(s_t, e_t):
        try:
            t1 = datetime.strptime(s_t.strip(), "%H:%M")
            t2 = datetime.strptime(e_t.strip(), "%H:%M")
            diff = (t2 + timedelta(days=1) - t1).total_seconds() if t2 < t1 else (t2 - t1).total_seconds()
            return round(diff / 3600.0, 1)
        except:
            return 0.0

    recommendations = []
    for o in schedules:
        station_raw = (o.get("id_tram") or '').strip().upper()
        if not station_raw:
            continue
            
        site_id = map_id_to_site_id.get(station_raw, station_raw)
            
        try:
            outage_date_val = o.get("ngay_mat_dien")
            outage_date = datetime.strptime(outage_date_val, "%Y-%m-%d").date()
        except:
            continue

        if (current_date - outage_date).days <= grace_days:
            continue
            
        hours = calc_hours(o.get("thoi_gian_cup_dien") or '', o.get("thoi_gian_co_dien") or '')
        if hours < 3.0:
            continue
            
        station_logs = logs_by_station.get(site_id, [])
        has_log = False
        for log in station_logs:
            log_date_val = log.get("date")
            if log_date_val:
                try:
                    log_date = datetime.strptime(log_date_val, "%Y-%m-%d").date()
                    if 0 <= (log_date - outage_date).days <= 7:
                        has_log = True
                        break
                except:
                    pass
                    
        if not has_log:
            station_refuels = refuels_by_station.get(site_id, [])
            has_refuel = False
            refuel_amount = 0.0
            refuel_date_str = ""
            for ref in station_refuels:
                ref_date_val = ref.get("date")
                if ref_date_val:
                    try:
                        ref_date = datetime.strptime(ref_date_val, "%Y-%m-%d").date()
                        if abs((ref_date - outage_date).days) <= 5:
                            ft = ref.get("fuel_tracking") or {}
                            has_refuel = True
                            refuel_amount = float(ft.get("quantity") or 0.0)
                            refuel_date_str = ref_date_val
                            break
                    except:
                        pass
                        
            ngay_dmy = outage_date.strftime("%d/%m/%Y")
            nl_ton_val = ton_by_site.get(site_id, 0.0)
            recommendations.append({
                'id_tram': site_id,
                'ngay_mat_dien': ngay_dmy,
                'hours': hours,
                'refuel_amount': refuel_amount if has_refuel else 0.0,
                'refuel_date': refuel_date_str if has_refuel else "",
                'nl_ton': nl_ton_val,
                'ly_do': o.get("ly_do") or 'Bảo trì lưới điện',
                'msg': f"Cần yêu cầu nhân viên nhập bổ sung log chạy máy phát điện cho đợt cúp điện ngày {ngay_dmy} (chạy khoảng {hours} tiếng tại trạm {site_id})."
            })
                
    return recommendations


def get_inactive_generators(days=90):
    """
    Identifies active diesel generators that have not logged an approved run in the last 'days'.
    """
    limit_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    
    res_sites = supabase.table("datasites").select("site_id, site_id_old, location_info, infrastructure_info").execute()
    datasites = res_sites.data or []
    
    generators = []
    for s in datasites:
        infra = s.get("infrastructure_info") or {}
        mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
        if mpd_list and len(mpd_list) > 0:
            mp = mpd_list[0]
            dinh_muc = float(mp.get("dinh_muc") or 0)
            fuel = str(mp.get("nhien_lieu") or '').lower()
            
            is_diesel = dinh_muc > 0 and (
                'dầu' in fuel or 
                'dau' in fuel or 
                'diesel' in fuel or 
                fuel == ''
            )
            if is_diesel:
                loc = s.get("location_info") or {}
                huyen = loc.get("huyen_cu") or loc.get("huyen") or '—'
                generators.append({
                    'site_id': s.get("site_id"),
                    'site_id_old': s.get("site_id_old"),
                    'huyen': huyen,
                    'may_phat_dien': mp.get("ten") or 'Máy nổ cố định',
                    'loai_nl': mp.get("nhien_lieu") or 'Dầu',
                    'dinh_muc': dinh_muc,
                    'nl_ton': float(mp.get("nl_ton") or 0.0),
                    'dung_tich': float(mp.get("dung_tich") or 0.0),
                    'nhan_hieu': mp.get("nhan_hieu") or '—'
                })
                
    if not generators:
        return []
        
    res_runs = supabase.table("generator_logs").select("site_id, date").eq("run_details->>status", "approved").execute()
    runs = res_runs.data or []
    
    last_run_by_station = {}
    for r in runs:
        site = (r.get("site_id") or "").strip().upper()
        r_date = r.get("date")
        if site and r_date:
            if site not in last_run_by_station or r_date > last_run_by_station[site]:
                last_run_by_station[site] = r_date
                
    inactive_list = []
    today = datetime.now().date()
    
    for g in generators:
        station = (g['site_id'] or '').strip().upper()
        if not station:
            continue
            
        last_run_str = last_run_by_station.get(station)
        
        if last_run_str and last_run_str >= limit_date:
            continue
            
        days_inactive = "Chưa từng chạy"
        last_run_date = "—"
        if last_run_str:
            try:
                lr_dt = datetime.strptime(last_run_str, '%Y-%m-%d').date()
                days_inactive = f"{(today - lr_dt).days} ngày"
                last_run_date = lr_dt.strftime('%d/%m/%Y')
            except:
                pass
                
        inactive_list.append({
            'id_tram': g['site_id'],
            'huyen': g['huyen'],
            'may_phat_dien': g['may_phat_dien'],
            'loai_nl': g['loai_nl'],
            'dinh_muc': g['dinh_muc'],
            'last_run': last_run_date,
            'days_inactive': days_inactive,
            'nl_ton': g['nl_ton'],
            'dung_tich': g['dung_tich']
        })
        
    def sort_key(item):
        if item['days_inactive'] == "Chưa từng chạy":
            return 999999
        try:
            return int(item['days_inactive'].split(' ')[0])
        except:
            return 0
            
    inactive_list.sort(key=sort_key, reverse=True)
    return inactive_list


def get_weekly_anomaly_report(days_scan=7):
    """
    Identifies stations that have had multiple refueling events (STOCK_IN)
    within 'days_scan' but have not logged a single approved generator run since.
    """
    from datetime import datetime, timedelta
    
    scan_start = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    
    res_sites = supabase.table("datasites").select("site_id, site_id_old, infrastructure_info").execute()
    datasites = res_sites.data or []
    
    map_id_to_site_id = {}
    fuel_by_site = {}
    for s in datasites:
        s_id = (s.get("site_id") or "").strip().upper()
        s_old = (s.get("site_id_old") or "").strip().upper()
        
        infra = s.get("infrastructure_info") or {}
        mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
        fuel_type = "Dầu"
        if mpd_list and len(mpd_list) > 0:
            fuel_type = mpd_list[0].get("nhien_lieu") or "Dầu"
            
        if s_id:
            map_id_to_site_id[s_id] = s_id
            fuel_by_site[s_id] = fuel_type
        if s_old:
            map_id_to_site_id[s_old] = s_id
            if s_id not in fuel_by_site:
                fuel_by_site[s_id] = fuel_type

    res_refuels = supabase.table("fuel_and_expenses")\
        .select("site_id, date, fuel_tracking")\
        .gte("date", scan_start)\
        .eq("fuel_tracking->>type", "STOCK_IN")\
        .eq("fuel_tracking->>is_approved", "true")\
        .execute()
    transactions = res_refuels.data or []
    
    transactions.sort(key=lambda x: x.get("date") or "")
    
    refuels_by_station = defaultdict(list)
    for tx in transactions:
        site = tx.get("site_id")
        if site:
            resolved = map_id_to_site_id.get(site.strip().upper(), site.strip().upper())
            refuels_by_station[resolved].append(tx)
            
    anomalies = []
    
    res_logs = supabase.table("generator_logs")\
        .select("site_id, date")\
        .gte("date", scan_start)\
        .eq("run_details->>status", "approved")\
        .execute()
    logs = res_logs.data or []
    
    logs_by_station = defaultdict(set)
    for l in logs:
        site = l.get("site_id")
        l_date = l.get("date")
        if site:
            resolved = map_id_to_site_id.get(site.strip().upper(), site.strip().upper())
            logs_by_station[resolved].add(l_date)
    
    for station, txs in refuels_by_station.items():
        if len(txs) < 2:
            continue
            
        for i in range(len(txs) - 1):
            try:
                d1 = datetime.strptime(txs[i]["date"], '%Y-%m-%d').date()
                d2 = datetime.strptime(txs[i+1]["date"], '%Y-%m-%d').date()
            except:
                continue
                
            if (d2 - d1).days <= days_scan:
                check_end = d2 + timedelta(days=7)
                
                station_log_dates = logs_by_station.get(station, set())
                has_run = False
                for log_date_str in station_log_dates:
                    try:
                        ld = datetime.strptime(log_date_str, '%Y-%m-%d').date()
                        if d2 <= ld <= check_end:
                            has_run = True
                            break
                    except:
                        pass
                
                if not has_run:
                    ft1 = txs[i].get("fuel_tracking") or {}
                    ft2 = txs[i+1].get("fuel_tracking") or {}
                    qty1 = float(ft1.get("quantity") or 0)
                    qty2 = float(ft2.get("quantity") or 0)
                    total_qty = qty1 + qty2
                    
                    # Determine fuel label: check transaction first, then station specs
                    f_type1 = str(ft1.get("fuel_type") or '').lower()
                    f_type2 = str(ft2.get("fuel_type") or '').lower()
                    gen_fuel = str(fuel_by_site.get(station, "Dầu")).lower()
                    
                    is_xang = ('xăng' in f_type1 or 'xang' in f_type1 or 
                               'xăng' in f_type2 or 'xang' in f_type2 or 
                               'xăng' in gen_fuel or 'xang' in gen_fuel)
                    fuel_label = 'xăng' if is_xang else 'dầu'
                    
                    anomalies.append({
                        'id_tram': station,
                        'date_range': f"{d1.strftime('%d/%m')} - {d2.strftime('%d/%m')}",
                        'refuel_count': 2,
                        'total_qty': total_qty,
                        'msg': f"Đổ {fuel_label} 2 lần liên tiếp ({total_qty}L từ {d1.strftime('%d/%m')} đến {d2.strftime('%d/%m')}) nhưng không chạy máy phát trong 7 ngày tiếp theo."
                    })
                    break
                    
    return anomalies


def get_quarterly_fuel_anomalies():
    """
    Compares the total fuel refilled (STOCK_IN) with total fuel consumed (from logs)
    over the last 90 days. Identifies stations with high discrepancy (deficit > 50L).
    """
    from datetime import datetime, timedelta
    start_date = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    
    res_sites = supabase.table("datasites").select("site_id, site_id_old, infrastructure_info").execute()
    datasites = res_sites.data or []
    if not datasites:
        return []
        
    map_id_to_site_id = {}
    fuel_by_site = {}
    for s in datasites:
        s_id = (s.get("site_id") or "").strip().upper()
        s_old = (s.get("site_id_old") or "").strip().upper()
        
        infra = s.get("infrastructure_info") or {}
        mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
        fuel_type = "Dầu"
        if mpd_list and len(mpd_list) > 0:
            fuel_type = mpd_list[0].get("nhien_lieu") or "Dầu"
            
        if s_id:
            map_id_to_site_id[s_id] = s_id
            fuel_by_site[s_id] = fuel_type
        if s_old:
            map_id_to_site_id[s_old] = s_id
            if s_id not in fuel_by_site:
                fuel_by_site[s_id] = fuel_type

    res_refuels = supabase.table("fuel_and_expenses")\
        .select("site_id, date, fuel_tracking")\
        .gte("date", start_date)\
        .eq("fuel_tracking->>type", "STOCK_IN")\
        .eq("fuel_tracking->>is_approved", "true")\
        .execute()
    refuels = res_refuels.data or []
    
    refuel_by_station = {}
    for r in refuels:
        site = r.get("site_id")
        ft = r.get("fuel_tracking") or {}
        qty = float(ft.get("quantity") or 0.0)
        if site:
            s_up = map_id_to_site_id.get(site.strip().upper(), site.strip().upper())
            refuel_by_station[s_up] = refuel_by_station.get(s_up, 0.0) + qty
            
    res_logs = supabase.table("generator_logs")\
        .select("site_id, date, run_details")\
        .gte("date", start_date)\
        .eq("run_details->>status", "approved")\
        .execute()
    logs = res_logs.data or []
    
    consume_by_station = {}
    for l in logs:
        site = l.get("site_id")
        details = l.get("run_details") or {}
        consume = float(details.get("nhien_lieu_tieu_hao") or 0.0)
        if site:
            s_up = map_id_to_site_id.get(site.strip().upper(), site.strip().upper())
            consume_by_station[s_up] = consume_by_station.get(s_up, 0.0) + consume
            
    anomalies = []
    
    for g in datasites:
        station = (g.get('site_id') or '').strip().upper()
        if not station:
            continue
            
        refuel_sum = refuel_by_station.get(station, 0.0)
        consume_sum = consume_by_station.get(station, 0.0)
        
        diff = consume_sum - refuel_sum
        
        if refuel_sum > 0 and diff < -50.0:
            fuel_type = fuel_by_site.get(station, "Dầu")
            fuel_type_lower = str(fuel_type).lower()
            fuel_label = "xăng" if ("xăng" in fuel_type_lower or "xang" in fuel_type_lower) else "dầu"
            
            anomalies.append({
                'id_tram': station,
                'refuel_qty': round(refuel_sum, 1),
                'consume_qty': round(consume_sum, 1),
                'diff': round(diff, 1),
                'msg': f"Đổ {fuel_label} {refuel_sum}L nhưng tiêu hao log chỉ {consume_sum}L trong 3 tháng qua (hụt {abs(diff)}L)."
            })
            
    anomalies.sort(key=lambda x: x['diff'])
    return anomalies
