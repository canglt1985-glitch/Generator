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
        Overnight (start ≥ 21h, end ≤ 7h, ≤ 10h) → 'approved' (normal night outage)
        ≤ 12 hours → 'approved' (normal)
        > 12 hours → 'pending' (likely stuck alarm, admin review needed)

    Returns: 'skip', 'approved', or 'pending'
    """
    if duration_min < 10:
        return 'skip'

    start_hour = start_dt.hour
    end_hour = end_dt.hour if end_dt else 0

    # Check if this is an overnight event (started at night)
    is_overnight_start = (start_hour >= 21)

    # Overnight OK: start ≥ 21:00 AND end ≤ 07:00 AND duration ≤ 600 min (10h)
    # This covers normal power outages at night
    if is_overnight_start and end_hour <= 7 and duration_min <= 600:
        return 'approved'

    # Overnight BAD: started at night but runs past 7 AM → likely stuck alarm
    if is_overnight_start and end_hour > 7:
        return 'pending'

    # Normal daytime: ≤ 12 hours (720 min)
    if duration_min <= 720:
        return 'approved'

    # Abnormal: > 12 hours
    return 'pending'


# ── Price Calculation ────────────────────────────────────────────

def get_pretax_price(fuel_type: str) -> float:
    """Get PVOil price ÷ 1.08 (trước VAT 8%).

    Args:
        fuel_type: 'Xăng' or 'Dầu' (from GeneralInfo.loai_nhien_lieu)
    Returns:
        Price per liter (trước VAT), rounded to integer.
    """
    from fuel_price import get_fuel_prices
    prices = get_fuel_prices()

    if fuel_type and 'Xăng' in fuel_type:
        raw = prices.get('xang_ron95', 0)
    else:
        raw = prices.get('dau_do', 0)

    return round(raw / 1.08) if raw else 0


# ── Station Info Lookup ──────────────────────────────────────────

def get_station_info(id_tram: str) -> dict | None:
    """Lookup GeneralInfo for a station.

    Returns dict with: dinh_muc, loai_nhien_lieu, may_phat_dien, loai_may, cong_suat_may
    Or None if station not found.
    """
    from models import GeneralInfo
    info = GeneralInfo.query.filter_by(id_tram=id_tram).first()
    if not info:
        return None

    return {
        'dinh_muc': info.dinh_muc or 0,
        'loai_nhien_lieu': info.loai_nhien_lieu or 'Dầu',
        'may_phat_dien': info.may_phat_dien or 'MLĐ',
        'loai_may': info.loai_may or '',
        'cong_suat_may': str(info.cong_suat) if info.cong_suat else '',
    }


# ── Duplicate Check ──────────────────────────────────────────────

def build_alarm_id(record: dict) -> str:
    """Build a unique alarm ID from SmartW record for duplicate detection.
    Uses: siteid + sdate (start time is unique enough per site).
    """
    site = record.get('siteid') or record.get('ne') or ''
    sdate = record.get('sdate') or ''
    return f'{site}__{sdate}'


def is_duplicate(alarm_id: str, id_tram: str = None, ngay: str = None, gio_bd: str = None, gio_kt: str = None) -> bool:
    """Check if this alarm was already imported (by alarm_id OR by id_tram+date+times)."""
    from models import GeneratorLog
    # Check by smartw_alarm_id
    if alarm_id:
        existing = GeneratorLog.query.filter_by(smartw_alarm_id=alarm_id).first()
        if existing:
            return True
    # Also check by id_tram + ngay + gio to catch manual/other imports
    if id_tram and ngay and gio_bd:
        q = GeneratorLog.query.filter_by(id_tram=id_tram, ngay_van_hanh=ngay, gio_bat_dau=gio_bd)
        if gio_kt:
            q = q.filter_by(gio_ket_thuc=gio_kt)
        if q.first():
            return True
    return False


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

    for record in raw_data:
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
        don_gia = get_pretax_price(loai_nhien_lieu)
        thanh_tien = round(nhien_lieu * don_gia)

        # 6. Create GeneratorLog record
        log = GeneratorLog(
            id_tram=site,
            site=site,
            cong_suat_may=cong_suat_may,
            loai_may=loai_may,
            dinh_muc=str(dinh_muc) if dinh_muc else '',
            ngay_van_hanh=start_dt.strftime('%Y-%m-%d'),
            gio_bat_dau=start_dt.strftime('%H:%M'),
            gio_ket_thuc=end_dt.strftime('%H:%M') if end_dt else '',
            thoi_gian_hoat_dong=hours,
            nhien_lieu_tieu_hao=nhien_lieu,
            don_gia=don_gia,
            thanh_tien=thanh_tien,
            nhien_lieu=loai_nhien_lieu,
            ghi_chu='',
            ket_qua_doi_soat='',
            # Auto-import fields
            status=status,
            source='smartw',
            smartw_alarm_id=alarm_id,
        )

        db.session.add(log)

        detail = f'{site} | {start_dt.strftime("%H:%M")}-{end_dt.strftime("%H:%M") if end_dt else "?"} | {duration_min}p | {status}'
        result['details'].append(detail)

        if status == 'approved':
            result['imported'] += 1
        else:
            result['pending'] += 1

    # Commit all at once
    try:
        db.session.commit()
        logger.info(f'MFD Import: {result["imported"]} imported, {result["pending"]} pending, '
                     f'{result["skipped"]} skipped, {result["duplicates"]} duplicates')
    except Exception as e:
        db.session.rollback()
        logger.error(f'MFD Import: DB commit failed: {e}')
        result['errors'].append(f'DB error: {str(e)}')

    return result
