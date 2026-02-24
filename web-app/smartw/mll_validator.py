"""
MLL Validation Logic — Check missing causes and cross-network inconsistencies.
"""
from datetime import datetime, timedelta


def validate_mll_causes(mll_records: list[dict]) -> list[dict]:
    """Validate MLL records and add flags.
    Args:
        mll_records: list of MLL records from scraper
    Returns:
        Same list with added 'flags' dict per record:
          - missing_cause: True if any cause level is empty
          - inconsistent_cause: True if cause differs across networks for same site+time
          - inconsistent_detail: string describing the inconsistency
    """
    if not mll_records:
        return []

    # Step 1: Add missing_cause flag
    for r in mll_records:
        c1 = (r.get('nguyen_nhan_1') or '').strip()
        c2 = (r.get('nguyen_nhan_2') or '').strip()
        c3 = (r.get('nguyen_nhan_3') or '').strip()

        flags = {
            'missing_cause': not c1 or not c2 or not c3,
            'inconsistent_cause': False,
            'inconsistent_detail': ''
        }
        r['flags'] = flags

    # Step 2: Group by incident and check inconsistencies
    groups = _group_mll_by_incident(mll_records, threshold_minutes=15)
    for group in groups:
        if len(group) < 2:
            continue  # Single record, nothing to compare

        # Compare causes across records in the same group
        inconsistencies = _check_group_consistency(group)
        if inconsistencies:
            detail = '; '.join(inconsistencies)
            for r in group:
                r['flags']['inconsistent_cause'] = True
                r['flags']['inconsistent_detail'] = detail

    return mll_records


def _parse_time(time_str: str) -> datetime | None:
    """Parse time string from SmartW (various formats)."""
    if not time_str:
        return None
    formats = [
        '%d/%m/%Y %H:%M:%S',
        '%d/%m/%Y %H:%M',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d %H:%M',
        '%H:%M:%S',
        '%H:%M'
    ]
    for fmt in formats:
        try:
            return datetime.strptime(time_str.strip(), fmt)
        except ValueError:
            continue
    return None


def _group_mll_by_incident(records: list[dict], threshold_minutes: int = 15) -> list[list[dict]]:
    """Group MLL records by site_id + overlapping time window.
    Records with same site_id whose bat_dau times differ by <= threshold_minutes
    are considered part of the same incident.
    """
    if not records:
        return []

    # Sort by site_id, then bat_dau
    sorted_records = sorted(records, key=lambda r: (
        r.get('site_id', ''),
        r.get('bat_dau', '')
    ))

    groups = []
    current_group = [sorted_records[0]]
    current_site = sorted_records[0].get('site_id', '')
    current_time = _parse_time(sorted_records[0].get('bat_dau', ''))

    for r in sorted_records[1:]:
        site_id = r.get('site_id', '')
        bat_dau = _parse_time(r.get('bat_dau', ''))

        # Same site and within time threshold
        if site_id == current_site and bat_dau and current_time:
            diff = abs((bat_dau - current_time).total_seconds()) / 60
            if diff <= threshold_minutes:
                current_group.append(r)
                continue

        # New group
        groups.append(current_group)
        current_group = [r]
        current_site = site_id
        current_time = bat_dau

    groups.append(current_group)
    return groups


def _check_group_consistency(group: list[dict]) -> list[str]:
    """Check if causes are consistent within a group.
    Returns list of inconsistency descriptions.
    """
    inconsistencies = []

    for level, key in [('Cấp 1', 'nguyen_nhan_1'), ('Cấp 2', 'nguyen_nhan_2'), ('Cấp 3', 'nguyen_nhan_3')]:
        values = set()
        for r in group:
            val = (r.get(key) or '').strip()
            if val:  # Ignore empty values for comparison
                values.add(val)

        if len(values) > 1:
            networks = [r.get('mang', '?') for r in group]
            inconsistencies.append(
                f'{level}: {" vs ".join(values)} ({"/".join(networks)})'
            )

    return inconsistencies
