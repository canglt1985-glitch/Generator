"""
SmartW Routes — /vhkt page + API endpoints (VHKT RAN)
"""
from flask import render_template, jsonify, request, flash, redirect, url_for, session, Response
from datetime import datetime, timedelta, date as date_type
from . import smartw_bp
from .config import load_smartw_config, save_smartw_config


# ── SSE Endpoint ─────────────────────────────────────────────────
@smartw_bp.route('/api/smartw/events')
def api_sse_events():
    """Server-Sent Events stream — pushes scrape status to browsers in real-time."""
    from .worker import sse_subscribe, sse_unsubscribe
    import queue as _queue

    client_q = sse_subscribe()

    def event_stream():
        try:
            # Send initial heartbeat
            yield 'event: connected\ndata: {}\n\n'
            while True:
                try:
                    msg = client_q.get(timeout=30)  # 30s heartbeat
                    yield f'event: {msg["event"]}\ndata: {msg["data"]}\n\n'
                except _queue.Empty:
                    # Send heartbeat to keep connection alive
                    yield ': heartbeat\n\n'
        except GeneratorExit:
            pass
        finally:
            sse_unsubscribe(client_q)

    return Response(event_stream(), mimetype='text/event-stream',
                    headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

# Cleared alarms older than this are hidden from the UI
CLEAR_HIDE_HOURS = 2
# --- Page Route ---

@smartw_bp.route('/vhkt')
def vhkt():
    """Main VHKT monitoring page."""
    import json
    fuel_stock_json = '{}'
    try:
        from generator.routes_fuel import get_audit_data
        from models import GeneralInfo
        audit = get_audit_data()
        all_st = GeneralInfo.query.all()
        fs = {}
        for s in all_st:
            fs[s.id_tram] = {
                'ton_real': 0, 'dung_tich': s.dung_tich or 0,
                'dm_thuc_te': s.dinh_muc_thuc_te or 0,
                'loai_nl': s.loai_nhien_lieu or '',
                'may_phat': s.may_phat_dien or '',
            }
        for row in audit:
            fs[row['id_tram']] = {
                'ton_real': row['ton_real'],
                'dung_tich': row['dung_tich'],
                'dm_thuc_te': row['dm_thuc_te'],
                'loai_nl': row['loai_nl'],
                'may_phat': row['may_phat'],
            }
        fuel_stock_json = json.dumps(fs)
    except Exception:
        pass
    return render_template('vhkt.html', fuel_stock_json=fuel_stock_json)


# --- Admin Config Route ---

@smartw_bp.route('/admin/smartw-config', methods=['POST'])
def save_config():
    """Save SmartW credentials (encrypted)."""
    if session.get('role') != 'admin':
        flash('Chỉ admin mới được thay đổi cài đặt SmartW.', 'danger')
        return redirect(url_for('core.admin', tab='smartw'))

    username = request.form.get('smartw_username', '').strip()
    password = request.form.get('smartw_password', '').strip()

    if not username or not password:
        flash('Vui lòng nhập đầy đủ tài khoản SmartW.', 'warning')
        return redirect(url_for('core.admin', tab='smartw'))

    try:
        save_smartw_config(username, password)
        # Reset circuit breaker so polling resumes immediately
        from .worker import reset_login_failures
        reset_login_failures()
        flash('✅ Đã lưu cài đặt SmartW thành công!', 'success')
    except Exception as e:
        flash(f'❌ Lỗi lưu cài đặt: {e}', 'danger')

    return redirect(url_for('core.admin', tab='smartw'))


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
    mll_cell_raw = load_cached_data('mll_cell')
    mll_cell_active = [r for r in _classify_records(mll_cell_raw) if r.get('status') == 'ACTIVE']

    # Cross-check: MĐ sites without MPĐ → ung_cuu (only active ones)
    md_sites = {r.get('site', '').strip() for r in md_active if r.get('site')}
    mpd_sites = {r.get('site', '').strip() for r in mpd_active if r.get('site')}
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
    md_stations = {r.get('site', '').strip() for r in md_active if r.get('site')}

    # Count upcoming power schedules
    lich_cup_count = 0
    try:
        from models import PowerSchedule
        today_str = datetime.now().strftime('%Y-%m-%d')
        lich_cup_count = PowerSchedule.query.filter(
            PowerSchedule.ngay_mat_dien >= today_str
        ).count()
    except Exception:
        pass

    return jsonify({
        'md_count': len(md_stations),
        'mpd_count': len(mpd_active),
        'mll_count': len(mll_active),
        'mll_cell_count': len(mll_cell_active),
        'ung_cuu_count': len(ung_cuu),
        'lich_cup_count': lich_cup_count,
        'last_poll': last_poll,
        'scraped_at': status.get('last_alarm_poll'),  # raw ISO for change detection
        'status': 'running' if status.get('is_running') else ('configured' if md_raw else 'not_configured'),
        'last_alarm_error': last_alarm_error,
        'last_vhkt_error': last_vhkt_error,
        'login_paused': status.get('login_paused', False),
        'login_fail_count': status.get('login_fail_count', 0)
    })


def _classify_records(cached: dict | None) -> list[dict]:
    """Classify records as ACTIVE / CLEARED based on end-time field.
    Handles both:
    - New alarmLog-new JSON: 'edate' = epoch ms (int) or null
    - Old HTML-parsed data: 'ket_thuc' = date string or ''
    """
    if not cached or not cached.get('data'):
        return []

    now = datetime.now()
    cutoff = now - timedelta(hours=CLEAR_HIDE_HOURS)
    results = []

    for r in cached['data']:
        # New format: edate is epoch milliseconds (int) or null
        edate = r.get('edate')
        ket_thuc = (r.get('ket_thuc') or '').strip()

        if edate is None and not ket_thuc:
            # No end time → still active
            r['status'] = 'ACTIVE'
            results.append(r)
        elif edate is not None:
            # edate is epoch ms (e.g., 1772180947000)
            if isinstance(edate, (int, float)) and edate > 0:
                try:
                    kt_dt = datetime.fromtimestamp(edate / 1000)
                    if kt_dt >= cutoff:
                        r['status'] = 'CLEARED'
                        results.append(r)
                except (ValueError, OSError):
                    r['status'] = 'CLEARED'
                    results.append(r)
            else:
                # edate = 0 or invalid → treat as active
                r['status'] = 'ACTIVE'
                results.append(r)
        elif ket_thuc:
            # Old format: ket_thuc is a date string
            try:
                kt_dt = _parse_smartw_time(ket_thuc, r.get('ngay', ''))
                if kt_dt and kt_dt >= cutoff:
                    r['status'] = 'CLEARED'
                    results.append(r)
            except Exception:
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
            if r.get('status') == 'ACTIVE' and r.get('site'):
                mpd_active_sites.add(r['site'].strip())

    for r in records:
        r['has_mpd'] = r.get('site', '').strip() in mpd_active_sites

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


@smartw_bp.route('/api/smartw/mll-cell')
def api_mll_cell():
    """Return MLL Cell data — active CellOff (isDownSite=N)."""
    from .scraper import load_cached_data
    cached = load_cached_data('mll_cell')
    records = _classify_records(cached)

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': cached.get('scraped_at') if cached else None
    })


@smartw_bp.route('/api/smartw/lich-cup')
def api_lich_cup():
    """Return upcoming power outage schedules (ngay >= today)."""
    from models import PowerSchedule
    try:
        today_str = datetime.now().strftime('%Y-%m-%d')
        schedules = PowerSchedule.query.filter(
            PowerSchedule.ngay_mat_dien >= today_str
        ).order_by(PowerSchedule.ngay_mat_dien.asc()).all()

        data = [s.to_dict() for s in schedules]
        return jsonify({'data': data, 'total': len(data)})
    except Exception as e:
        return jsonify({'data': [], 'total': 0, 'error': str(e)})


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
        return redirect(url_for('core.admin', tab='smartw'))

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

    return redirect(url_for('core.admin', tab='smartw'))


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
