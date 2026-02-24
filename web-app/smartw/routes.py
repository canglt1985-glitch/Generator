"""
SmartW Routes — /vhkt page + API endpoints
"""
from flask import render_template, jsonify, request, flash, redirect, url_for, session
from datetime import datetime, timedelta
from . import smartw_bp
from .config import load_smartw_config, save_smartw_config

# Cleared alarms older than this are hidden from the UI
CLEAR_HIDE_HOURS = 2
# --- Page Route ---

@smartw_bp.route('/vhkt')
def vhkt():
    """Main VHKT monitoring page."""
    # Will be implemented in Phase 05
    return render_template('vhkt.html')


# --- Admin Config Route ---

@smartw_bp.route('/admin/smartw-config', methods=['POST'])
def save_config():
    """Save SmartW credentials (encrypted)."""
    if session.get('role') != 'admin':
        flash('Chỉ admin mới được thay đổi cài đặt SmartW.', 'danger')
        return redirect(url_for('admin', tab='smartw'))

    username = request.form.get('smartw_username', '').strip()
    password = request.form.get('smartw_password', '').strip()

    if not username or not password:
        flash('Vui lòng nhập đầy đủ tài khoản SmartW.', 'warning')
        return redirect(url_for('admin', tab='smartw'))

    try:
        save_smartw_config(username, password)
        # Reset circuit breaker so polling resumes immediately
        from .worker import reset_login_failures
        reset_login_failures()
        flash('✅ Đã lưu cài đặt SmartW thành công!', 'success')
    except Exception as e:
        flash(f'❌ Lỗi lưu cài đặt: {e}', 'danger')

    return redirect(url_for('admin', tab='smartw'))


# --- API Endpoints (Skeleton — will be implemented in Phase 04) ---

@smartw_bp.route('/api/smartw/summary')
def api_summary():
    """Dashboard summary counts with cross-check."""
    from .scraper import load_cached_data
    from .worker import get_scrape_status

    md_raw = load_cached_data('md')
    mpd_raw = load_cached_data('mpd')
    mll_raw = load_cached_data('mll')
    status = get_scrape_status()

    # Classify and count only ACTIVE records
    md_active = [r for r in _classify_records(md_raw) if r.get('status') == 'ACTIVE']
    mpd_active = [r for r in _classify_records(mpd_raw) if r.get('status') == 'ACTIVE']
    mll_active = [r for r in _classify_records(mll_raw) if r.get('status') == 'ACTIVE']

    # Cross-check: MĐ sites without MPĐ → ung_cuu (only active ones)
    md_sites = {r.get('site_id', '').strip() for r in md_active if r.get('site_id')}
    mpd_sites = {r.get('site_id', '').strip() for r in mpd_active if r.get('site_id')}
    ung_cuu = list(md_sites - mpd_sites)

    # Format last_poll timestamp
    last_poll = status.get('last_alarm_poll')
    if last_poll:
        try:
            dt = datetime.fromisoformat(last_poll)
            last_poll = dt.strftime('%H:%M')
        except (ValueError, TypeError):
            pass

    # Extract last error PER SOURCE for per-tab display
    errors = status.get('errors', [])
    last_alarm_error = None
    last_vhkt_error = None
    for err in reversed(errors):
        source = err.get('source', '')
        if not source:
            source = 'vhkt' if err.get('error', '').startswith('VHKT') else 'alarm'
        if source == 'alarm' and not last_alarm_error:
            err_time = err.get('time', '')
            try:
                err_time = datetime.fromisoformat(err_time).strftime('%d/%m %H:%M')
            except (ValueError, TypeError):
                pass
            last_alarm_error = {'message': err.get('error', ''), 'time': err_time}
        elif source == 'vhkt' and not last_vhkt_error:
            err_time = err.get('time', '')
            try:
                err_time = datetime.fromisoformat(err_time).strftime('%d/%m %H:%M')
            except (ValueError, TypeError):
                pass
            last_vhkt_error = {'message': err.get('error', ''), 'time': err_time}
        if last_alarm_error and last_vhkt_error:
            break
    # Count unique MĐ stations (not total alarms)
    md_stations = {r.get('site_id', '').strip() for r in md_active if r.get('site_id')}

    return jsonify({
        'md_count': len(md_stations),
        'mpd_count': len(mpd_active),
        'mll_count': len(mll_active),
        'ung_cuu_count': len(ung_cuu),
        'last_poll': last_poll,
        'status': 'running' if status.get('is_running') else ('configured' if md_raw else 'not_configured'),
        'last_alarm_error': last_alarm_error,
        'last_vhkt_error': last_vhkt_error,
        'login_paused': status.get('login_paused', False),
        'login_fail_count': status.get('login_fail_count', 0)
    })


def _classify_records(cached: dict | None) -> list[dict]:
    """Classify records as ACTIVE / CLEARED based on ket_thuc field.
    - ket_thuc empty → ACTIVE
    - ket_thuc < 2h ago → CLEARED (still visible)
    - ket_thuc >= 2h ago → HIDDEN (filtered out)
    """
    if not cached or not cached.get('data'):
        return []

    now = datetime.now()
    cutoff = now - timedelta(hours=CLEAR_HIDE_HOURS)
    results = []

    for r in cached['data']:
        ket_thuc = (r.get('ket_thuc') or '').strip()

        if not ket_thuc:
            # No end time → still active
            r['status'] = 'ACTIVE'
            results.append(r)
        else:
            # Try parsing end time to determine if within CLEAR_HIDE_HOURS
            try:
                # SmartW time formats: "DD/MM/YYYY HH:mm" or "HH:mm DD/MM/YYYY" etc.
                kt_dt = _parse_smartw_time(ket_thuc, r.get('ngay', ''))
                if kt_dt and kt_dt >= cutoff:
                    r['status'] = 'CLEARED'
                    results.append(r)
                # else: older than cutoff → hidden, skip
            except Exception:
                # Can't parse → show as cleared to be safe
                r['status'] = 'CLEARED'
                results.append(r)

    return results


def _parse_smartw_time(time_str: str, date_str: str = '') -> datetime | None:
    """Parse SmartW time string into datetime.
    Handles various formats SmartW might return."""
    # Common SmartW formats
    for fmt in [
        '%d/%m/%Y %H:%M',    # Full datetime
        '%d/%m/%Y %H:%M:%S',
        '%H:%M %d/%m/%Y',
        '%Y-%m-%d %H:%M',
        '%Y-%m-%d %H:%M:%S',
    ]:
        try:
            return datetime.strptime(time_str.strip(), fmt)
        except (ValueError, TypeError):
            continue

    # Maybe time_str is just time (HH:mm), combine with date_str
    if date_str and ':' in time_str and len(time_str) <= 8:
        for date_fmt in ['%d/%m/%Y', '%Y-%m-%d']:
            try:
                base = datetime.strptime(date_str.strip(), date_fmt)
                parts = time_str.strip().split(':')
                return base.replace(hour=int(parts[0]), minute=int(parts[1]))
            except (ValueError, TypeError, IndexError):
                continue

    return None


# --- Data API Endpoints ---

@smartw_bp.route('/api/smartw/md')
def api_md():
    """Return MĐ data — active + recently cleared (< 2h)."""
    from .scraper import load_cached_data
    cached = load_cached_data('md')
    mpd_cached = load_cached_data('mpd')
    records = _classify_records(cached)

    # Cross-check: flag MĐ sites that have no MPĐ active
    mpd_active_sites = set()
    if mpd_cached:
        for r in _classify_records(mpd_cached):
            if r.get('status') == 'ACTIVE' and r.get('site_id'):
                mpd_active_sites.add(r['site_id'].strip())

    for r in records:
        r['has_mpd'] = r.get('site_id', '').strip() in mpd_active_sites

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': cached.get('scraped_at') if cached else None
    })


@smartw_bp.route('/api/smartw/mpd')
def api_mpd():
    """Return MPĐ data — active + recently cleared (< 2h)."""
    from .scraper import load_cached_data
    cached = load_cached_data('mpd')
    records = _classify_records(cached)

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': cached.get('scraped_at') if cached else None
    })


@smartw_bp.route('/api/smartw/mll')
def api_mll():
    """Return MLL data — active + recently cleared (< 2h) with validation flags."""
    from .scraper import load_cached_data
    from .mll_validator import validate_mll_causes
    cached = load_cached_data('mll')
    records = _classify_records(cached)

    # Run MLL validation
    records = validate_mll_causes(records)

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': cached.get('scraped_at') if cached else None
    })


@smartw_bp.route('/api/smartw/vhkt')
def api_vhkt():
    """Return VHKT daily data — filtered by TVT Đồng Nai 3."""
    from .scraper import load_cached_data, TEAM_ALARM
    data = load_cached_data('vhkt')
    if not data:
        return jsonify({'count': 0, 'data': [], 'scraped_at': None})

    # Filter: only stations belonging to our TVT
    records = [r for r in data.get('data', [])
               if TEAM_ALARM in (r.get('to_vt') or '')]

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': data.get('scraped_at')
    })


@smartw_bp.route('/api/smartw/status')
def api_worker_status():
    """Worker status for admin panel."""
    from .worker import get_scrape_status
    return jsonify(get_scrape_status())


@smartw_bp.route('/admin/smartw-trigger', methods=['POST'])
def manual_trigger():
    """Manual trigger scrape from admin panel."""
    if session.get('role') != 'admin':
        flash('Chỉ admin mới được thực hiện.', 'danger')
        return redirect(url_for('admin', tab='smartw'))

    trigger_type = request.form.get('trigger_type', 'both')

    try:
        from .worker import run_alarm_poll, run_vhkt_poll
        import threading

        if trigger_type == 'both':
            def _run_both():
                run_alarm_poll()
                run_vhkt_poll()
            t = threading.Thread(target=_run_both, daemon=True)
            t.start()
            flash('⏳ Đang scrape MĐ/MPĐ/MLL + VHKT... refresh sau 60s để xem kết quả.', 'info')
        elif trigger_type == 'alarm':
            t = threading.Thread(target=run_alarm_poll, daemon=True)
            t.start()
            flash('⏳ Đang scrape MĐ/MPĐ/MLL... refresh sau 30s để xem kết quả.', 'info')
        elif trigger_type == 'vhkt':
            t = threading.Thread(target=run_vhkt_poll, daemon=True)
            t.start()
            flash('⏳ Đang scrape VHKT... refresh sau 30s để xem kết quả.', 'info')
        else:
            flash('Loại trigger không hợp lệ.', 'warning')
    except Exception as e:
        flash(f'❌ Lỗi: {e}', 'danger')

    return redirect(url_for('admin', tab='smartw'))


@smartw_bp.route('/api/smartw/trigger', methods=['POST'])
def api_trigger():
    """AJAX trigger scrape — uses admin credentials from config."""

    trigger_type = request.json.get('type', 'both') if request.is_json else 'both'

    from .worker import _is_running
    if _is_running:
        return jsonify({'ok': False, 'message': 'Đang scrape... vui lòng đợi.'})

    try:
        from .worker import run_alarm_poll, run_vhkt_poll
        import threading

        if trigger_type == 'both':
            def _run_both():
                run_alarm_poll()
                run_vhkt_poll()
            t = threading.Thread(target=_run_both, daemon=True)
            t.start()
            return jsonify({'ok': True, 'message': 'Đang scrape MĐ/MPĐ/MLL + VHKT...'})
        elif trigger_type == 'alarm':
            t = threading.Thread(target=run_alarm_poll, daemon=True)
            t.start()
            return jsonify({'ok': True, 'message': 'Đang scrape MĐ/MPĐ/MLL...'})
        elif trigger_type == 'vhkt':
            t = threading.Thread(target=run_vhkt_poll, daemon=True)
            t.start()
            return jsonify({'ok': True, 'message': 'Đang scrape VHKT...'})
        else:
            return jsonify({'ok': False, 'message': 'Loại trigger không hợp lệ'}), 400
    except Exception as e:
        return jsonify({'ok': False, 'message': str(e)}), 500
