"""
MFĐ Auto-Import — Process SmartW MFĐ reports → GeneratorLog.

Scrapes completed generator events from SmartW, classifies them,
calculates fuel consumption & cost, and inserts into GeneratorLog.
"""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


# ── Date Parsing ─────────────────────────────────────────────────

def parse_smartw_date(date_str: str) -> datetime | None:
    """Parse SmartW date format: 'Feb 28, 2026 4:31:44 PM' → datetime."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), '%b %d, %Y %I:%M:%S %p')
    except ValueError:
        try:
            # Fallback: try without seconds
            return datetime.strptime(date_str.strip(), '%b %d, %Y %I:%M %p')
        except ValueError:
            logger.warning(f'MFĐ Import: Cannot parse date: {date_str}')
            return None


# ── Classification ───────────────────────────────────────────────

def classify_event(start_dt: datetime, end_dt: datetime, duration_min: int) -> str:
    """Classify a generator event as normal or abnormal.

    Rules:
        < 10 min → 'skip' (test run, too short)
        ≤ 8 hours (480 min) → 'approved' (normal, covers all overnight runs)
        ≤ 12 hours → 'approved' (normal daytime)
        > 12 hours → 'pending' (likely stuck alarm, admin review needed)
        No end time → 'pending' (incomplete event, needs update)

    Returns: 'skip', 'approved', or 'pending'
    """
    if duration_min < 10:
        # No end time with unknown duration → pending (overnight incomplete)
        if not end_dt:
            return 'pending'
        return 'skip'

    # Any run ≤ 8 hours → always approved (covers overnight runs too)
    if duration_min <= 480:
        return 'approved'

    # Normal daytime: ≤ 12 hours (720 min)
    if duration_min <= 720:
        return 'approved'

    # Abnormal: > 12 hours
    return 'pending'


# ── Price Calculation ────────────────────────────────────────────

def get_pretax_price(fuel_type: str, date_str: str = None) -> float:
    """Get PVOil/webtygia price for a specific date (or current if no date given).

    Uses historical price table when date_str is provided, so backfilled
    records get the correct price for their actual run date.

    Args:
        fuel_type: 'Xăng' or 'Dầu' (from GeneralInfo.loai_nhien_lieu)
        date_str: Log date in 'YYYY-MM-DD' format (optional)
    Returns:
        Price per liter (trước VAT), rounded to integer.
    """
    from datetime import datetime
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    from fuel_price import get_fuel_price_for_date
    raw = get_fuel_price_for_date(date_str, fuel_type)

    if raw:
        if date_str >= '2026-03-26':
            return float(raw)  # VAT 0%
        else:
            return round(raw / 1.08)  # VAT 8%
    return 0


# ── Station Info Lookup ──────────────────────────────────────────

def get_station_info(id_tram: str) -> dict | None:
    """Lookup GeneralInfo for a station.

    Supports both Old and New Site IDs by cross-referencing DsSiteRegistry:
    1. Try direct lookup in GeneralInfo by id_tram.
    2. If not found, look up id_tram in DsSiteRegistry (as site_id_old or site_id_new).
    3. Retry GeneralInfo with the alternate ID found in registry.

    Returns dict with: dinh_muc, loai_nhien_lieu, may_phat_dien, loai_may, cong_suat_may
    Or None if station not found.
    """
    from models import GeneralInfo, DsSiteRegistry

    def _build_result(info):
        return {
            'dinh_muc': info.dinh_muc or 0,
            'loai_nhien_lieu': info.loai_nhien_lieu or 'Dầu',
            'may_phat_dien': info.may_phat_dien or 'MLĐ',
            'loai_may': info.loai_may or '',
            'cong_suat_may': str(info.cong_suat) if info.cong_suat else '',
        }

    # 1. Direct lookup
    info = GeneralInfo.query.filter_by(id_tram=id_tram).first()
    if info:
        return _build_result(info)

    # 2. Cross-lookup via DsSiteRegistry (old ↔ new)
    try:
        registry = DsSiteRegistry.query.filter(
            (DsSiteRegistry.site_id_old == id_tram) |
            (DsSiteRegistry.site_id_new == id_tram)
        ).first()

        if registry:
            # Try the alternate ID
            alternate_id = (
                registry.site_id_new if registry.site_id_old == id_tram
                else registry.site_id_old
            )
            if alternate_id:
                info = GeneralInfo.query.filter_by(id_tram=alternate_id).first()
                if info:
                    logger.info(f'get_station_info: {id_tram} → mapped to {alternate_id} via DsSiteRegistry')
                    return _build_result(info)
    except Exception as e:
        logger.warning(f'get_station_info: Registry lookup failed for {id_tram}: {e}')

    return None


def get_site_id_pair(id_tram: str) -> tuple:
    """Resolve the (old_id, new_id) pair for a given site ID using DsSiteRegistry.

    Returns:
        (site_id_old, site_id_new) — if only one direction is known the unknown
        side falls back to the original id_tram value so the column is never empty.
    """
    from models import DsSiteRegistry
    try:
        registry = DsSiteRegistry.query.filter(
            (DsSiteRegistry.site_id_old == id_tram) |
            (DsSiteRegistry.site_id_new == id_tram)
        ).first()
        if registry:
            old_id = registry.site_id_old or id_tram
            new_id = registry.site_id_new or id_tram
            return (old_id, new_id)
    except Exception as e:
        logger.warning(f'get_site_id_pair: Registry lookup failed for {id_tram}: {e}')
    # Fallback: same value in both columns
    return (id_tram, id_tram)


# ── Duplicate Check ──────────────────────────────────────────────

def build_alarm_id(record: dict) -> str:
    """Build a unique alarm ID from SmartW record for duplicate detection.
    Uses: siteid + sdate (start time is unique enough per site).
    """
    site = record.get('siteid') or record.get('ne') or ''
    sdate = record.get('sdate') or ''
    return f'{site}__{sdate}'


def is_duplicate(alarm_id: str, id_tram: str = None, ngay: str = None, gio_bd: str = None, gio_kt: str = None) -> bool:
    """Check if this alarm was already imported (by alarm_id OR by id_tram+date+start_time).
    Also checks the current session for pending objects to prevent duplicates within the same batch.
    """
    from models import GeneratorLog
    from extensions import db

    # 1. Check in Database
    # Check by smartw_alarm_id
    if alarm_id:
        existing = GeneratorLog.query.filter_by(smartw_alarm_id=alarm_id).first()
        if existing:
            return True
    # Check by id_tram + ngay + gio_bat_dau
    if id_tram and ngay and gio_bd:
        q = GeneratorLog.query.filter_by(id_tram=id_tram, ngay_van_hanh=ngay, gio_bat_dau=gio_bd)
        if q.first():
            return True

    # 2. Check in current session (pending objects not yet committed)
    for obj in db.session.new:
        if isinstance(obj, GeneratorLog):
            if alarm_id and obj.smartw_alarm_id == alarm_id:
                return True
            if id_tram and ngay and gio_bd:
                if obj.id_tram == id_tram and obj.ngay_van_hanh == ngay and obj.gio_bat_dau == gio_bd:
                    return True
    
    return False


def update_incomplete_records(raw_data: list[dict]) -> int:
    """Update existing records that are missing end time (overnight events).

    When an overnight event starts on day D but ends on day D+1, the D scrape
    creates a record with no end time. When we later scrape day D+1 (or re-scrape D),
    SmartW returns the completed event. This function finds and updates those records.

    Returns: number of records updated.
    """
    from extensions import db
    from models import GeneratorLog

    updated = 0
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

        # Find existing record with missing end time for this site+date+start
        existing = GeneratorLog.query.filter_by(
            id_tram=site, ngay_van_hanh=ngay, gio_bat_dau=gio_bd
        ).filter(
            (GeneratorLog.gio_ket_thuc == None) |
            (GeneratorLog.gio_ket_thuc == '')
        ).first()

        if not existing:
            continue

        # Calculate duration from timestamps if minuteNumber is missing
        if not duration_min and start_dt and end_dt:
            duration_min = int((end_dt - start_dt).total_seconds() / 60)

        # Update the record
        hours = round(duration_min / 60, 2)
        dinh_muc = float(existing.dinh_muc or 0)
        nhien_lieu = round(hours * dinh_muc, 2)
        don_gia = existing.don_gia or 0
        thanh_tien = round(nhien_lieu * don_gia)

        existing.gio_ket_thuc = gio_kt
        if gio_kt and gio_bd:
            try:
                t1 = datetime.strptime(gio_bd, '%H:%M').time()
                t2 = datetime.strptime(gio_kt, '%H:%M').time()
                if t2 < t1:
                    if '(Chạy qua đêm)' not in (existing.ghi_chu or ''):
                        existing.ghi_chu = f"(Chạy qua đêm) {existing.ghi_chu or ''}".strip()
            except ValueError:
                pass
        existing.thoi_gian_hoat_dong = hours
        existing.nhien_lieu_tieu_hao = nhien_lieu
        existing.thanh_tien = thanh_tien

        # Re-classify now that we have end time
        status = classify_event(start_dt, end_dt, duration_min)
        if status != 'skip':
            existing.status = status

        updated += 1
        logger.info(f'MFD Update: {site} {ngay} {gio_bd}→{gio_kt} ({hours}h) → {status}')

    if updated:
        try:
            db.session.commit()
            logger.info(f'MFD Update: {updated} incomplete records updated')
        except Exception as e:
            db.session.rollback()
            logger.error(f'MFD Update: DB commit failed: {e}')

    return updated


# ── Main Import Function ─────────────────────────────────────────

def import_mfd_data(raw_data: list[dict]) -> dict:
    """Process raw SmartW MFĐ records → insert into GeneratorLog.

    Args:
        raw_data: List of dicts from scraper.scrape_mfd_reports()

    Returns:
        {imported: int, pending: int, skipped: int, duplicates: int, errors: [str]}
    """
    from extensions import db
    from models import GeneratorLog

    result = {
        'imported': 0,
        'pending': 0,
        'skipped': 0,
        'duplicates': 0,
        'errors': [],
        'details': [],
    }

    # Internal batch dedup: remove exact duplicates from raw_data before processing
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

        # 1. Parse dates early (needed for dedup)
        start_dt = parse_smartw_date(record.get('sdate'))
        end_dt = parse_smartw_date(record.get('edate'))

        ngay = start_dt.strftime('%Y-%m-%d') if start_dt else None
        gio_bd = start_dt.strftime('%H:%M') if start_dt else None
        gio_kt = end_dt.strftime('%H:%M') if end_dt else None

        # 2. Check duplicate (alarm_id + id_tram+date+times)
        if is_duplicate(alarm_id, id_tram=site, ngay=ngay, gio_bd=gio_bd, gio_kt=gio_kt):
            result['duplicates'] += 1
            continue

        # 3. Validate dates
        duration_min = record.get('minuteNumber') or 0

        if not start_dt:
            result['errors'].append(f'{site}: Cannot parse start date')
            continue

        # Calculate duration from timestamps if minuteNumber is missing
        if not duration_min and start_dt and end_dt:
            duration_min = int((end_dt - start_dt).total_seconds() / 60)

        # 3. Classify
        status = classify_event(start_dt, end_dt, duration_min)
        if status == 'skip':
            result['skipped'] += 1
            continue

        # 4. Lookup station info
        station = get_station_info(site)
        dinh_muc = 0
        loai_nhien_lieu = 'Dầu'
        may_phat_dien = ''
        loai_may = ''
        cong_suat_may = ''

        if station:
            dinh_muc = station['dinh_muc']
            loai_nhien_lieu = station['loai_nhien_lieu']
            may_phat_dien = station['may_phat_dien']
            loai_may = station['loai_may']
            cong_suat_may = station['cong_suat_may']
        else:
            # Station not in GeneralInfo → flag as pending for admin review
            if status == 'approved':
                status = 'pending'
            result['errors'].append(f'{site}: Not found in GeneralInfo')

        # 5. Calculate
        hours = round(duration_min / 60, 2)
        nhien_lieu = round(hours * dinh_muc, 2)
        don_gia = get_pretax_price(loai_nhien_lieu, date_str=ngay)
        thanh_tien = round(nhien_lieu * don_gia)

        # 5b. Resolve old/new Site IDs for proper export columns
        site_id_old, site_id_new = get_site_id_pair(site)
        
        # Chỉ áp dụng Site ID mới từ tháng 4/2026
        ngay_van_hanh_str = start_dt.strftime('%Y-%m-%d')
        if ngay_van_hanh_str >= '2026-04-01':
            final_id_tram = site_id_old
            final_site = site_id_new
        else:
            final_id_tram = site_id_old
            final_site = site_id_old

        # 6. Create GeneratorLog record
        log = GeneratorLog(
            id_tram=final_id_tram,
            site=final_site,
            cong_suat_may=cong_suat_may,
            loai_may=loai_may,
            dinh_muc=str(dinh_muc) if dinh_muc else '',
            ngay_van_hanh=ngay_van_hanh_str,
            gio_bat_dau=start_dt.strftime('%H:%M'),
            gio_ket_thuc=end_dt.strftime('%H:%M') if end_dt else '',
            thoi_gian_hoat_dong=hours,
            nhien_lieu_tieu_hao=nhien_lieu,
            don_gia=don_gia,
            thanh_tien=thanh_tien,
            nhien_lieu=loai_nhien_lieu,
            ghi_chu='(Chạy qua đêm)' if gio_kt and gio_bd and datetime.strptime(gio_kt, '%H:%M').time() < datetime.strptime(gio_bd, '%H:%M').time() else '',
            ket_qua_doi_soat='',
            # Auto-import fields
            status=status,
            source='smartw',
            smartw_alarm_id=alarm_id,
        )

        db.session.add(log)
        db.session.flush()  # Make visible to is_duplicate() within same batch

        detail = f'{site} | {start_dt.strftime("%H:%M")}-{end_dt.strftime("%H:%M") if end_dt else "?"} | {duration_min}p | {status}'
        result['details'].append(detail)

        if status == 'approved':
            result['imported'] += 1
        else:
            result['pending'] += 1

    # Commit all at once
    try:
        db.session.commit()
        # After successful import & commit, resolve overlapping logs for the affected days
        resolve_overlapping_logs(raw_data)
        logger.info(f'MFD Import: {result["imported"]} imported, {result["pending"]} pending, '
                     f'{result["skipped"]} skipped, {result["duplicates"]} duplicates')
    except Exception as e:
        db.session.rollback()
        logger.error(f'MFD Import: DB commit failed: {e}')
        result['errors'].append(f'DB error: {str(e)}')

    return result


def resolve_overlapping_logs(raw_data: list[dict]) -> int:
    """Resolve overlapping generator logs by keeping the longest one.
    
    If a station has multiple logs on the same day that overlap in time,
    keep the one with the longest duration and delete the others.
    
    Returns: number of deleted overlapping records.
    """
    from extensions import db
    from models import GeneratorLog
    from datetime import datetime, timedelta
    
    # Collect unique dates affected by this import
    affected_dates = set()
    for record in raw_data:
        start_dt = parse_smartw_date(record.get('sdate'))
        if start_dt:
            affected_dates.add(start_dt.strftime('%Y-%m-%d'))
            
    if not affected_dates:
        return 0
        
    deleted_count = 0
    
    # Process day by day to keep memory low
    for target_date in affected_dates:
        # Get all logs for this date
        logs = GeneratorLog.query.filter_by(ngay_van_hanh=target_date).all()
        
        # Group logs by station
        by_station = {}
        for log in logs:
            if not log.gio_bat_dau or not log.thoi_gian_hoat_dong:
                continue
                
            site_id = log.id_tram
            if site_id not in by_station:
                by_station[site_id] = []
                
            # Calculate absolute start and end datetimes for proper overlap checking
            try:
                start_dt = datetime.strptime(f"{log.ngay_van_hanh} {log.gio_bat_dau}", "%Y-%m-%d %H:%M")
                
                # Use duration to calculate end (more reliable than string parsing for edge cases)
                duration_hours = float(log.thoi_gian_hoat_dong)
                end_dt = start_dt + timedelta(hours=duration_hours)
                
                by_station[site_id].append({
                    'log': log,
                    'start_dt': start_dt,
                    'end_dt': end_dt,
                    'duration': duration_hours,
                    'alarm_id': log.smartw_alarm_id
                })
            except Exception as e:
                logger.warning(f"Error parsing times for log {log.id}: {e}")
                
        # Resolve overlaps per station
        for site_id, station_logs in by_station.items():
            if len(station_logs) < 2:
                continue
                
            # Sort by duration, longest first
            station_logs.sort(key=lambda x: x['duration'], reverse=True)
            
            kept_logs = []
            
            for item in station_logs:
                is_overlapping = False
                
                # Check if this log overlaps with any log we've already decided to keep
                for kept in kept_logs:
                    # Overlap condition: max(start1, start2) < min(end1, end2)
                    overlap_start = max(item['start_dt'], kept['start_dt'])
                    overlap_end = min(item['end_dt'], kept['end_dt'])
                    
                    if overlap_start < overlap_end:
                        is_overlapping = True
                        break
                        
                if is_overlapping:
                    # This log overlaps with a longer one we are keeping, so delete it
                    logger.info(f"Deleting overlapping log {item['log'].id} for {site_id} (duration: {item['duration']}h)")
                    db.session.delete(item['log'])
                    deleted_count += 1
                else:
                    # Check for exact duplicates by alarm_id within the database
                    if item['alarm_id']:
                        # If we have multiple records with same alarm_id, keep only one (the one with longest duration or smallest ID)
                        # The sort above already ensured longest is first.
                        dup_alarm = [k for k in kept_logs if k['alarm_id'] == item['alarm_id']]
                        if dup_alarm:
                            logger.info(f"Deleting duplicate alarm_id log {item['log'].id} for {site_id}")
                            db.session.delete(item['log'])
                            deleted_count += 1
                            continue

                    # Keep this log
                    kept_logs.append(item)
                    
    if deleted_count > 0:
        try:
            db.session.commit()
            logger.info(f"Resolved overlapping logs: deleted {deleted_count} shorter records.")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to commit overlapping logs deletion: {e}")
            
    return deleted_count
