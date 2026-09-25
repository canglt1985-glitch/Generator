import logging
from datetime import datetime, timedelta
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

logger = logging.getLogger("smartw_mfd_import")

# Configure environment and Supabase V2 Client
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend/smartw
backend_dir = os.path.dirname(current_dir) # backend

# Load env
load_dotenv(os.path.join(backend_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(backend_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase credentials missing in environment variables.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_smartw_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), '%b %d, %Y %I:%M:%S %p')
    except ValueError:
        try:
            return datetime.strptime(date_str.strip(), '%b %d, %Y %I:%M %p')
        except ValueError:
            logger.warning(f'MFĐ Import V2: Cannot parse date: {date_str}')
            return None

def classify_event(start_dt: datetime, end_dt: datetime, duration_min: int) -> str:
    if duration_min < 10:
        if not end_dt:
            return 'pending'
        return 'skip'
    # Các trạm chạy máy trên 15h (900 phút) bắt buộc phải qua phê duyệt (sự cố hy hữu / cúp điện sớm đóng trễ)
    if duration_min > 900:
        return 'pending'
    return 'approved'

def get_pretax_price(fuel_type: str, date_str: str = None) -> float:
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    # Add backend_dir to sys.path to import fuel_price
    if backend_dir not in sys.path:
        sys.path.append(backend_dir)
    try:
        from fuel_price import get_fuel_price_for_date
        raw = get_fuel_price_for_date(date_str, fuel_type)
    except ImportError:
        raw = 20000

    if raw:
        if date_str >= '2026-03-26':
            return float(raw)
        else:
            return round(raw / 1.08)
    return 0

def get_station_info(site_id: str, date_str: str = None) -> dict | None:
    """
    Lookup station info from V2 datasites table, parsing the infrastructure_info JSONB.
    Supports suffix stripping for ERA / SRAN technologies (e.g. DNIXLO10L -> DNIXLO10).
    """
    if not supabase or not site_id:
        return None
        
    s = str(site_id).strip().upper()
    for delimiter in ['_', '-']:
        if delimiter in s:
            parts = s.split(delimiter)
            if parts[0]:
                s = parts[0]
                break
    site_upper = s
    try:
        res = supabase.table("datasites").select("*").execute()
        station = None
        datasites = res.data or []
        # 1. Exact match
        for st in datasites:
            if (st.get("site_id") or "").upper() == site_upper or (st.get("site_id_old") or "").upper() == site_upper:
                station = st
                break
                
        # 2. Prefix match for ERA suffixes (e.g. DNIXLO10L, DNIXLO00UL, DNIXLO16N, DNXL01L...)
        if not station:
            for st in datasites:
                s_id = (st.get("site_id") or "").upper()
                s_old = (st.get("site_id_old") or "").upper()
                if s_id and site_upper.startswith(s_id):
                    station = st
                    break
                if s_old and site_upper.startswith(s_old):
                    station = st
                    break

        # 3. Fallback: 8 chars new id / 6 chars old id
        if not station:
            if len(site_upper) >= 8 and (site_upper.startswith("DN") or site_upper.startswith("26")):
                cand = site_upper[:8]
                for st in datasites:
                    if (st.get("site_id") or "").upper() == cand:
                        station = st
                        break
            elif len(site_upper) >= 6 and site_upper.startswith("DN"):
                cand = site_upper[:6]
                for st in datasites:
                    if (st.get("site_id_old") or "").upper() == cand:
                        station = st
                        break
                
        if not station:
            return None
            
        infra = station.get("infrastructure_info") or {}
        mpd_list = infra.get("may_phat_dien", {}).get("mpd", [])
        
        active_mpd = None
        if mpd_list:
            if date_str:
                for m in mpd_list:
                    start = m.get("ngay_bat_dau")
                    end = m.get("ngay_ket_thuc")
                    tinh_trang = m.get("tinh_trang")
                    
                    if tinh_trang == "ĐÃ ĐIỀU CHUYỂN":
                        continue
                        
                    is_active = True
                    if start and date_str < start:
                        is_active = False
                    if end and date_str > end:
                        is_active = False
                        
                    if is_active:
                        active_mpd = m
                        break
            
            if not active_mpd:
                active_mpds = [m for m in mpd_list if m.get("tinh_trang") != "ĐÃ ĐIỀU CHUYỂN"]
                if active_mpds:
                    active_mpd = active_mpds[0]
                elif len(mpd_list) > 0:
                    active_mpd = mpd_list[0]
                    
        # Mặc định chạy máy xăng lưu động nếu không có máy cố định
        dinh_muc_quy_chuan = 2.3
        dinh_muc_thuc_te = 2.0
        loai_nhien_lieu = 'Dầu'
        may_phat_dien = 'MÁY PHÁT ĐIỆN'
        loai_may = 'MÁY PHÁT ĐIỆN'
        cong_suat_may = '8.5 KVA'
        
        if active_mpd:
            dinh_muc_quy_chuan = float(active_mpd.get("dinh_muc") or 2.3)
            dinh_muc_thuc_te = float(active_mpd.get("dinh_muc_thuc_te") or active_mpd.get("dinh_muc") or 2.3)
            loai_nhien_lieu = active_mpd.get("nhien_lieu") or 'Dầu'
            may_phat_dien = active_mpd.get("ten") or 'MLĐ'
            loai_may = active_mpd.get("nhan_hieu") or ''
            cong_suat_may = str(active_mpd.get("cong_suat") or '')
            
        return {
            'dinh_muc': dinh_muc_quy_chuan,
            'dinh_muc_quy_chuan': dinh_muc_quy_chuan,
            'dinh_muc_thuc_te': dinh_muc_thuc_te,
            'loai_nhien_lieu': loai_nhien_lieu,
            'may_phat_dien': may_phat_dien,
            'loai_may': loai_may,
            'cong_suat_may': cong_suat_may,
            'resolved_site_id': station.get("site_id")
        }
    except Exception as e:
        logger.warning(f'get_station_info V2: Lookup failed for {site_id}: {e}')
    return None

def build_alarm_id(record: dict) -> str:
    site = record.get('siteid') or record.get('ne') or ''
    sdate = record.get('sdate') or ''
    return f'{site}__{sdate}'

def is_duplicate(alarm_id: str, site_id: str = None, ngay: str = None, gio_bd: str = None) -> bool:
    if not supabase:
        return False
        
    try:
        # 1. Check by smartw_alarm_id in run_details
        if alarm_id:
            res = supabase.table("generator_logs")\
                .select("gen_log_id")\
                .eq("run_details->>smartw_alarm_id", alarm_id)\
                .execute()
            if res.data:
                return True
                
        # 2. Check by site_id + date + gio_bat_dau
        if site_id and ngay and gio_bd:
            res = supabase.table("generator_logs")\
                .select("gen_log_id")\
                .eq("site_id", site_id)\
                .eq("date", ngay)\
                .eq("run_details->>gio_bat_dau", gio_bd)\
                .execute()
            if res.data:
                return True
    except Exception as e:
        logger.error(f"is_duplicate check failed: {e}")
    return False

def update_incomplete_records(raw_data: list[dict]) -> int:
    """
    Find existing logs in V2 generator_logs with missing end times, and complete them.
    """
    if not supabase:
        return 0

    updated = 0
    try:
        res_incomplete = supabase.table("generator_logs")\
            .select("*")\
            .or_("run_details->>gio_ket_thuc.eq.,run_details->>gio_ket_thuc.eq.--,run_details->>gio_ket_thuc.is.null")\
            .execute()
            
        incomplete_logs = res_incomplete.data or []
        if not incomplete_logs:
            return 0
            
        for record in raw_data:
            site = record.get('siteid') or record.get('ne') or ''
            start_dt = parse_smartw_date(record.get('sdate'))
            end_dt = parse_smartw_date(record.get('edate'))
            duration_min = record.get('minuteNumber') or 0

            if not start_dt or not end_dt:
                continue

            ngay = start_dt.strftime('%Y-%m-%d')
            gio_bd = start_dt.strftime('%H:%M')
            gio_kt = end_dt.strftime('%H:%M')
            alarm_id = build_alarm_id(record)

            matched_log = None
            for log in incomplete_logs:
                details = log.get("run_details") or {}
                l_site = log.get("site_id")
                l_date = log.get("date")
                l_gio_bd = details.get("gio_bat_dau")
                l_alarm_id = details.get("smartw_alarm_id")
                
                if (l_alarm_id == alarm_id) or (l_site == site and l_date == ngay and l_gio_bd == gio_bd):
                    matched_log = log
                    break
                    
            if not matched_log:
                continue

            if not duration_min:
                duration_min = int((end_dt - start_dt).total_seconds() / 60)

            hours = round(duration_min / 60, 2)
            run_details = matched_log.get("run_details") or {}
            
            dinh_muc = float(run_details.get("dinh_muc") or 0)
            nhien_lieu = round(hours * dinh_muc, 2)
            don_gia = run_details.get("don_gia") or 0
            thanh_tien = round(nhien_lieu * don_gia)

            run_details["gio_ket_thuc"] = gio_kt
            run_details["thoi_gian_hoat_dong"] = hours
            run_details["nhien_lieu_tieu_hao"] = nhien_lieu
            run_details["thanh_tien"] = thanh_tien
            
            try:
                t1 = datetime.strptime(gio_bd, '%H:%M').time()
                t2 = datetime.strptime(gio_kt, '%H:%M').time()
                if t2 < t1:
                    if '(Chạy qua đêm)' not in (run_details.get("ghi_chu") or ''):
                        run_details["ghi_chu"] = f"(Chạy qua đêm) {run_details.get('ghi_chu') or ''}".strip()
            except ValueError:
                pass

            status = classify_event(start_dt, end_dt, duration_min)
            if status != 'skip':
                run_details["status"] = status

            supabase.table("generator_logs").update({
                "run_details": run_details
            }).eq("gen_log_id", matched_log["gen_log_id"]).execute()
            
            updated += 1
            logger.info(f'MFD Update V2: {site} {ngay} {gio_bd}→{gio_kt} ({hours}h) → {status}')
            
    except Exception as e:
        logger.error(f"Failed to update incomplete records: {e}")
        
    return updated

def import_mfd_data(raw_data: list[dict]) -> dict:
    if not supabase:
        return {'error': 'Supabase Client not configured'}

    result = {
        'imported': 0,
        'pending': 0,
        'skipped': 0,
        'duplicates': 0,
        'errors': [],
        'details': [],
    }
    pending_alerts_to_send = []

    seen_in_batch = set()
    unique_raw_data = []
    for record in raw_data:
        alarm_id = build_alarm_id(record)
        if alarm_id in seen_in_batch:
            result['duplicates'] += 1
            continue
        seen_in_batch.add(alarm_id)
        unique_raw_data.append(record)

    for record in unique_raw_data:
        site = record.get('siteid') or record.get('ne') or ''
        alarm_id = build_alarm_id(record)

        start_dt = parse_smartw_date(record.get('sdate'))
        end_dt = parse_smartw_date(record.get('edate'))

        ngay = start_dt.strftime('%Y-%m-%d') if start_dt else None
        gio_bd = start_dt.strftime('%H:%M') if start_dt else None
        gio_kt = end_dt.strftime('%H:%M') if end_dt else None

        station_info = get_station_info(site, date_str=ngay)
        site_id = site
        
        dinh_muc = 0
        loai_nhien_lieu = 'Dầu'
        may_phat_dien = ''
        loai_may = ''
        cong_suat_may = ''
        
        if station_info:
            dinh_muc = station_info['dinh_muc']
            loai_nhien_lieu = station_info['loai_nhien_lieu']
            may_phat_dien = station_info['may_phat_dien']
            loai_may = station_info['loai_may']
            cong_suat_may = station_info['cong_suat_may']
            site_id = station_info['resolved_site_id']
        else:
            result['errors'].append(f'{site}: Not found in V2 Datasites')

        if is_duplicate(alarm_id, site_id=site_id, ngay=ngay, gio_bd=gio_bd):
            result['duplicates'] += 1
            continue

        if not start_dt:
            result['errors'].append(f'{site}: Cannot parse start date')
            continue

        duration_min = record.get('minuteNumber') or 0
        if not duration_min and start_dt and end_dt:
            duration_min = int((end_dt - start_dt).total_seconds() / 60)

        status = classify_event(start_dt, end_dt, duration_min)
        if status == 'skip':
            result['skipped'] += 1
            continue

        if not station_info and status == 'approved':
            status = 'pending'

        dinh_muc_quy_chuan = (station_info or {}).get('dinh_muc_quy_chuan') or dinh_muc
        dinh_muc_thuc_te = (station_info or {}).get('dinh_muc_thuc_te') or dinh_muc

        hours = round(duration_min / 60, 2)
        nhien_lieu = round(hours * dinh_muc_quy_chuan, 2)
        nhien_lieu_thuc_te = round(hours * dinh_muc_thuc_te, 2)
        don_gia = get_pretax_price(loai_nhien_lieu, date_str=ngay)
        thanh_tien = round(nhien_lieu * don_gia)

        run_details = {
            "gio_bat_dau": gio_bd,
            "gio_ket_thuc": gio_kt or '',
            "thoi_gian_hoat_dong": hours,
            "nhien_lieu_tieu_hao": nhien_lieu,
            "nhien_lieu_tieu_hao_thuc_te": nhien_lieu_thuc_te,
            "don_gia": don_gia,
            "thanh_tien": thanh_tien,
            "ghi_chu": '(Chạy qua đêm)' if gio_kt and gio_bd and datetime.strptime(gio_kt, '%H:%M').time() < datetime.strptime(gio_bd, '%H:%M').time() else '',
            "loai_may": loai_may,
            "cong_suat_may": cong_suat_may,
            "dinh_muc": dinh_muc_quy_chuan,
            "dinh_muc_quy_chuan": dinh_muc_quy_chuan,
            "dinh_muc_thuc_te": dinh_muc_thuc_te,
            "nhien_lieu_loai": loai_nhien_lieu,
            "status": status,
            "source": 'smartw',
            "smartw_alarm_id": alarm_id
        }

        try:
            res_insert = supabase.table("generator_logs").insert({
                "site_id": site_id,
                "date": ngay,
                "run_details": run_details
            }).execute()
            
            if res_insert.data:
                inserted_log = res_insert.data[0]
                detail = f'{site} | {gio_bd}-{gio_kt or "?"} | {duration_min}p | {status}'
                result['details'].append(detail)

                if status == 'approved':
                    result['imported'] += 1
                else:
                    result['pending'] += 1
                    pending_alerts_to_send.append({
                        "uuid": inserted_log.get("gen_log_id"),
                        "site_id": site_id,
                        "duration": hours,
                        "fuel": nhien_lieu,
                        "cost": thanh_tien,
                        "start_t": gio_bd,
                        "end_t": gio_kt,
                        "date": ngay
                    })
        except Exception as insert_err:
            logger.error(f"Insert failed for {site} log: {insert_err}")
            result['errors'].append(f"{site}: Insert failed: {insert_err}")

    try:
        resolve_overlapping_logs(raw_data)
    except Exception as overlap_err:
        logger.error(f"Failed to resolve overlaps: {overlap_err}")

    # Send Telegram Alerts using migrated bot_telegram
    if pending_alerts_to_send:
        try:
            if backend_dir not in sys.path:
                sys.path.append(backend_dir)
            from bot_telegram import send_pending_log_alert
            for log in pending_alerts_to_send:
                send_pending_log_alert(
                    log_uuid=log["uuid"],
                    site_id=log["site_id"],
                    duration=log["duration"],
                    fuel=log["fuel"],
                    cost=log["cost"],
                    start_t=log["start_t"],
                    end_t=log["end_t"],
                    date=log["date"]
                )
        except Exception as alert_err:
            logger.error(f'MFD Import V2: Failed to send pending Telegram alerts: {alert_err}')

    return result

def resolve_overlapping_logs(raw_data: list[dict] = None, target_dates: list[str] = None) -> int:
    """
    Resolve overlapping and contiguous generator runs on Supabase V2:
    1. If a log is enclosed in another log on the same site & date:
       Keep the longer run ('lấy cái nào chạy nhiều hơn').
    2. If logs overlap partially or are contiguous/adjacent (gap <= 15 minutes):
       Merge them into a single continuous run ('nối thời gian lại cho liên tục'):
       - new_start = min(start_A, start_B)
       - new_end = max(end_A, end_B)
       - Recalculate duration, fuel consumption and cost based on station quota and daily fuel price.
       - Delete redundant/absorbed log from database.
    """
    if not supabase:
        return 0

    affected_dates = set()
    if target_dates:
        affected_dates.update(target_dates)
    if raw_data:
        for record in raw_data:
            start_dt = parse_smartw_date(record.get('sdate'))
            if start_dt:
                affected_dates.add(start_dt.strftime('%Y-%m-%d'))

    if not affected_dates:
        # Default to checking past 7 days
        for d in range(7):
            affected_dates.add((datetime.now() - timedelta(days=d)).strftime('%Y-%m-%d'))

    merged_count = 0
    try:
        for target_date in affected_dates:
            res = supabase.table("generator_logs").select("*").eq("date", target_date).execute()
            logs = res.data or []
            if len(logs) < 2:
                continue

            by_station = {}
            for log in logs:
                details = log.get("run_details") or {}
                gio_bd = details.get("gio_bat_dau")
                gio_kt = details.get("gio_ket_thuc")
                duration = details.get("thoi_gian_hoat_dong")

                if not gio_bd:
                    continue

                site_id = log.get("site_id")
                if not site_id:
                    continue

                try:
                    start_dt = datetime.strptime(f"{target_date} {gio_bd}", "%Y-%m-%d %H:%M")
                    if gio_kt:
                        end_dt = datetime.strptime(f"{target_date} {gio_kt}", "%Y-%m-%d %H:%M")
                        if end_dt < start_dt:
                            end_dt += timedelta(days=1)
                    else:
                        duration_hours = float(duration) if duration is not None else 1.0
                        end_dt = start_dt + timedelta(hours=duration_hours)

                    duration_hours = round((end_dt - start_dt).total_seconds() / 3600.0, 2)
                    by_station.setdefault(site_id, []).append({
                        'log': log,
                        'start_dt': start_dt,
                        'end_dt': end_dt,
                        'duration': duration_hours,
                        'alarm_id': details.get("smartw_alarm_id"),
                        'status': details.get("status", "pending")
                    })
                except Exception as ex:
                    logger.warning(f"Error parsing log overlap times for {site_id}: {ex}")

            for site_id, station_logs in by_station.items():
                if len(station_logs) < 2:
                    continue

                # Sort chronologically by start time
                station_logs.sort(key=lambda x: x['start_dt'])

                i = 0
                while i < len(station_logs) - 1:
                    cur = station_logs[i]
                    nxt = station_logs[i + 1]

                    # Gap in minutes between end of cur and start of nxt
                    gap_min = (nxt['start_dt'] - cur['end_dt']).total_seconds() / 60.0

                    # Condition to merge: overlap (gap < 0) or contiguous within 15 minutes (0 <= gap <= 15)
                    # or identical alarm_id
                    is_overlap = gap_min <= 15.0
                    is_same_alarm = bool(cur['alarm_id'] and cur['alarm_id'] == nxt['alarm_id'])

                    if is_overlap or is_same_alarm:
                        # 1. Enclosed case: one range completely covers the other
                        # 2. Partial overlap or adjacent: merge start to min, end to max
                        merged_start = min(cur['start_dt'], nxt['start_dt'])
                        merged_end = max(cur['end_dt'], nxt['end_dt'])
                        merged_duration = round((merged_end - merged_start).total_seconds() / 3600.0, 2)

                        # Determine primary surviving log (prefer 'approved' status, then longer duration)
                        if cur['status'] == 'approved' and nxt['status'] != 'approved':
                            surviving = cur
                            absorbed = nxt
                        elif nxt['status'] == 'approved' and cur['status'] != 'approved':
                            surviving = nxt
                            absorbed = cur
                        else:
                            surviving = cur if cur['duration'] >= nxt['duration'] else nxt
                            absorbed = nxt if surviving is cur else cur

                        s_log = surviving['log']
                        a_log = absorbed['log']
                        s_details = dict(s_log.get("run_details") or {})
                        a_details = a_log.get("run_details") or {}

                        # Recalculate specs & costs
                        dinh_muc_qc = float(s_details.get("dinh_muc_quy_chuan") or s_details.get("dinh_muc") or 2.3)
                        dinh_muc_tt = float(s_details.get("dinh_muc_thuc_te") or dinh_muc_qc)
                        don_gia = float(s_details.get("don_gia") or 27540)

                        new_start_str = merged_start.strftime("%H:%M")
                        new_end_str = merged_end.strftime("%H:%M")

                        s_details["gio_bat_dau"] = new_start_str
                        s_details["gio_ket_thuc"] = new_end_str
                        s_details["thoi_gian_hoat_dong"] = merged_duration
                        s_details["nhien_lieu_tieu_hao"] = round(merged_duration * dinh_muc_qc, 2)
                        s_details["nhien_lieu_tieu_hao_thuc_te"] = round(merged_duration * dinh_muc_tt, 2)
                        s_details["thanh_tien"] = round(s_details["nhien_lieu_tieu_hao"] * don_gia)

                        # Check overnight
                        if merged_end.date() > merged_start.date():
                            if "(Chạy qua đêm)" not in (s_details.get("ghi_chu") or ""):
                                s_details["ghi_chu"] = f"(Chạy qua đêm) {s_details.get('ghi_chu') or ''}".strip()

                        # Merge note
                        cur_note = s_details.get("ghi_chu") or ""
                        abs_note = a_details.get("ghi_chu") or ""
                        if abs_note and abs_note not in cur_note:
                            cur_note = f"{cur_note} | {abs_note}".strip(' |')
                        if "(Nối liên tục)" not in cur_note:
                            cur_note = f"{cur_note} (Nối liên tục {new_start_str}-{new_end_str})".strip()
                        s_details["ghi_chu"] = cur_note

                        logger.info(f"V2 Overlap/Contiguous Merge: {site_id} on {target_date} -> {new_start_str}-{new_end_str} ({merged_duration}h). Absorbed {a_log['gen_log_id']}")

                        # Update surviving log on Supabase
                        supabase.table("generator_logs").update({
                            "run_details": s_details
                        }).eq("gen_log_id", s_log["gen_log_id"]).execute()

                        # Delete absorbed redundant log from Supabase
                        supabase.table("generator_logs").delete().eq("gen_log_id", a_log["gen_log_id"]).execute()
                        merged_count += 1

                        # Update cur node in memory and continue chaining
                        cur['start_dt'] = merged_start
                        cur['end_dt'] = merged_end
                        cur['duration'] = merged_duration
                        cur['log']['run_details'] = s_details
                        cur['status'] = s_details.get("status", "pending")
                        station_logs.pop(i + 1)
                    else:
                        i += 1
    except Exception as e:
        logger.error(f"Failed to resolve overlaps on V2 database: {e}")

    return merged_count
