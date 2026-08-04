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
    if duration_min <= 480:
        return 'approved'
    if duration_min <= 720:
        return 'approved'
    return 'pending'

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
    """
    if not supabase:
        return None
        
    site_upper = site_id.strip().upper()
    try:
        res = supabase.table("datasites").select("*").execute()
        station = None
        for s in (res.data or []):
            if (s.get("site_id") or "").upper() == site_upper or (s.get("site_id_old") or "").upper() == site_upper:
                station = s
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
        dinh_muc = 2.0
        loai_nhien_lieu = 'Xăng'
        may_phat_dien = 'MÁY XĂNG LƯU ĐỘNG'
        loai_may = 'MÁY XĂNG LƯU ĐỘNG'
        cong_suat_may = '5 KVA'
        
        if active_mpd:
            dinh_muc = float(active_mpd.get("dinh_muc_thuc_te") or active_mpd.get("dinh_muc") or 2.0)
            loai_nhien_lieu = active_mpd.get("nhien_lieu") or 'Dầu'
            may_phat_dien = active_mpd.get("ten") or 'MLĐ'
            loai_may = active_mpd.get("nhan_hieu") or ''
            cong_suat_may = str(active_mpd.get("cong_suat") or '')
            
        return {
            'dinh_muc': dinh_muc,
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

        hours = round(duration_min / 60, 2)
        nhien_lieu = round(hours * dinh_muc, 2)
        don_gia = get_pretax_price(loai_nhien_lieu, date_str=ngay)
        thanh_tien = round(nhien_lieu * don_gia)

        run_details = {
            "gio_bat_dau": gio_bd,
            "gio_ket_thuc": gio_kt or '',
            "thoi_gian_hoat_dong": hours,
            "nhien_lieu_tieu_hao": nhien_lieu,
            "don_gia": don_gia,
            "thanh_tien": thanh_tien,
            "ghi_chu": '(Chạy qua đêm)' if gio_kt and gio_bd and datetime.strptime(gio_kt, '%H:%M').time() < datetime.strptime(gio_bd, '%H:%M').time() else '',
            "loai_may": loai_may,
            "cong_suat_may": cong_suat_may,
            "dinh_muc": dinh_muc,
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

def resolve_overlapping_logs(raw_data: list[dict]) -> int:
    if not supabase:
        return 0
        
    affected_dates = set()
    for record in raw_data:
        start_dt = parse_smartw_date(record.get('sdate'))
        if start_dt:
            affected_dates.add(start_dt.strftime('%Y-%m-%d'))
            
    if not affected_dates:
        return 0
        
    deleted_count = 0
    try:
        for target_date in affected_dates:
            res = supabase.table("generator_logs").select("*").eq("date", target_date).execute()
            logs = res.data or []
            
            by_station = {}
            for log in logs:
                details = log.get("run_details") or {}
                gio_bd = details.get("gio_bat_dau")
                duration = details.get("thoi_gian_hoat_dong")
                
                if not gio_bd or duration is None:
                    continue
                    
                site_id = log.get("site_id")
                if site_id not in by_station:
                    by_station[site_id] = []
                    
                try:
                    start_dt = datetime.strptime(f"{target_date} {gio_bd}", "%Y-%m-%d %H:%M")
                    duration_hours = float(duration)
                    end_dt = start_dt + timedelta(hours=duration_hours)
                    
                    by_station[site_id].append({
                        'log': log,
                        'start_dt': start_dt,
                        'end_dt': end_dt,
                        'duration': duration_hours,
                        'alarm_id': details.get("smartw_alarm_id")
                    })
                except Exception as ex:
                    logger.warning(f"Error parsing log overlap times: {ex}")
                    
            for site_id, station_logs in by_station.items():
                if len(station_logs) < 2:
                    continue
                    
                station_logs.sort(key=lambda x: x['duration'], reverse=True)
                kept_logs = []
                
                for item in station_logs:
                    is_overlapping = False
                    for kept in kept_logs:
                        overlap_start = max(item['start_dt'], kept['start_dt'])
                        overlap_end = min(item['end_dt'], kept['end_dt'])
                        if overlap_start < overlap_end:
                            is_overlapping = True
                            break
                            
                    if is_overlapping:
                        logger.info(f"V2 Overlap: Deleting log {item['log']['gen_log_id']} for {site_id}")
                        supabase.table("generator_logs").delete().eq("gen_log_id", item['log']['gen_log_id']).execute()
                        deleted_count += 1
                    else:
                        if item['alarm_id']:
                            dup_alarm = [k for k in kept_logs if k['alarm_id'] == item['alarm_id']]
                            if dup_alarm:
                                logger.info(f"V2 Alarm Duplicate: Deleting log {item['log']['gen_log_id']}")
                                supabase.table("generator_logs").delete().eq("gen_log_id", item['log']['gen_log_id']).execute()
                                deleted_count += 1
                                continue
                        kept_logs.append(item)
    except Exception as e:
        logger.error(f"Failed to resolve overlaps on V2 database: {e}")
        
    return deleted_count
