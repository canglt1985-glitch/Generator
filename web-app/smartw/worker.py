"""
SmartW Worker — Background polling wrapper for scraper.
Handles alarm polling (15 min), VHKT morning poll, clear detection, and status tracking.
Uses a PERSISTENT scraper session to avoid re-login every poll cycle.
"""
import os
import json
import shutil
import asyncio
import logging
import threading
import queue
import requests
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'smartw')
STATUS_FILE = os.path.join(DATA_DIR, 'scrape_status.json')

# Track if a scrape is currently running (simple lock)
_is_running = False
LOCK_FILE = os.path.join(DATA_DIR, 'worker.lock')

def _acquire_lock():
    """Try to acquire a cross-process file lock. Returns True if successful."""
    global _is_running
    if _is_running:
        return False

    if os.path.exists(LOCK_FILE):
        # Stale lock check (>30 mins)
        try:
            mtime = os.path.getmtime(LOCK_FILE)
            if (datetime.now().timestamp() - mtime) < 1800:
                logger.info('SmartW Worker: Lock file exists, another process is likely polling.')
                return False
            else:
                logger.warning('SmartW Worker: Stale lock file detected (>30m), overriding.')
                os.remove(LOCK_FILE)
        except Exception:
            pass

    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(LOCK_FILE, 'w') as f:
            f.write(str(os.getpid()))
        _is_running = True
        return True
    except Exception as e:
        logger.error(f'SmartW Worker: Failed to create lock file: {e}')
        return False

def _release_lock():
    """Release the cross-process file lock."""
    global _is_running
    _is_running = False
    try:
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
    except Exception as e:
        logger.error(f'SmartW Worker: Failed to remove lock file: {e}')

# Circuit breaker: stop polling after this many consecutive login failures
MAX_LOGIN_FAILURES = 10

def _get_site_label(site_id: str) -> str:
    """Return '*ID_MOI* (ID_CU)' label for Viber display.
    Tries DsSiteRegistry first (site_id_new / site_id_old).
    Falls back to GeneralInfo.id_old if available.
    Returns '*SITE_ID*' alone when no mapping found.
    """
    try:
        from models import DsSiteRegistry
        row = DsSiteRegistry.query.filter(
            (DsSiteRegistry.site_id_new == site_id.upper()) |
            (DsSiteRegistry.site_id_old == site_id.upper())
        ).first()
        if row and row.site_id_new and row.site_id_old:
            return f"*{row.site_id_new}* ({row.site_id_old})"
        if row and row.site_id_new:
            return f"*{row.site_id_new}*"
    except Exception:
        pass

    # Fallback: try GeneralInfo for legacy id_old field
    try:
        from models import GeneralInfo
        info = GeneralInfo.query.filter_by(id_tram=site_id).first()
        if info:
            old_id = getattr(info, 'id_old', None)
            if old_id and old_id != site_id:
                return f"*{site_id}* ({old_id})"
    except Exception:
        pass

    # No mapping found - just return the site_id bolded
    return f"*{site_id}*"


def _site_key(alarm: dict) -> str:
    """Extract a consistent site key from raw alarm fields."""
    return alarm.get('site_id') or alarm.get('site') or alarm.get('tram') or alarm.get('ne') or 'Unknown'


def _norm_net(network: str) -> str:
    """Normalize network technology strings (2G, 3G, 4G, 5G)."""
    if not network:
        return ''
    n = network.upper()
    if '5G' in n: return '5G'
    if '4G' in n or 'LTE' in n: return '4G'
    if '3G' in n or 'WCDMA' in n: return '3G'
    if '2G' in n or 'GSM' in n: return '2G'
    return network


def _old_id(site_id: str) -> str:
    """Look up legacy site ID from site registry."""
    try:
        from models import DsSiteRegistry
        row = DsSiteRegistry.query.filter(
            (DsSiteRegistry.site_id_new == site_id.upper()) |
            (DsSiteRegistry.site_id_old == site_id.upper())
        ).first()
        if row and row.site_id_old:
            return row.site_id_old
    except Exception:
        pass
    return site_id


def _fmt_sdate(sdate_str: str, full: bool = False) -> str:
    """Format sdateStr 'DD/MM/YYYY HH:MM:SS' or ISO -> 'DD/MM HH:MM' or 'HH:MM'.
    Args:
        sdate_str: Time string to format.
        full: If True, returns 'DD/MM HH:MM'. If False, returns 'HH:MM'.
    """
    if not sdate_str:
        return ""
    try:
        dt = None
        # Check if ISO format (e.g., from clear_time)
        if "T" in sdate_str and "-" in sdate_str:
            dt = datetime.fromisoformat(sdate_str)
        else:
            # Standard format: DD/MM/YYYY HH:MM:SS
            # Or HH:MM DD/MM/YYYY
            parts = sdate_str.strip().split(" ")
            if len(parts) >= 2:
                # Assuming DD/MM/YYYY HH:MM:SS
                if "/" in parts[0] and ":" in parts[1]:
                    dparts = parts[0].split("/") # DD MM YYYY
                    tparts = parts[1].split(":") # HH MM SS
                    if len(dparts) >= 3 and len(tparts) >= 2:
                        dt = datetime(int(dparts[2]), int(dparts[1]), int(dparts[0]),
                                     int(tparts[0]), int(tparts[1]))
                # Assuming HH:MM DD/MM/YYYY
                elif ":" in parts[0] and "/" in parts[1]:
                    tparts = parts[0].split(":")
                    dparts = parts[1].split("/")
                    if len(dparts) >= 3 and len(tparts) >= 2:
                        dt = datetime(int(dparts[2]), int(dparts[1]), int(dparts[0]),
                                     int(tparts[0]), int(tparts[1]))

        if dt:
            if full:
                return dt.strftime('%d/%m %H:%M')
            else:
                # If alarm is from another day, always show full date
                if dt.date() != datetime.now().date():
                    return dt.strftime('%d/%m %H:%M')
                return dt.strftime('%H:%M')
                
    except Exception:
        pass
    return sdate_str


def _send_viber_report(lines: list):
    """Send a formatted report to Viber Channel via pa/post."""
    if not lines:
        return
    text = "\n".join(lines)
    payload = {
        "from": "OMu7ptWb9vbA4pvi5QfVjQ==",
        "type": "text",
        "text": text
    }
    headers = {
        "X-Viber-Auth-Token": "567370461ff5bfce-6527e240db117ad7-ce130e1ad6041265"
    }
    try:
        req = requests.post("https://chatapi.viber.com/pa/post", headers=headers, json=payload, timeout=10)
        logger.info(f"Viber Report (Post): {req.status_code} - {req.text}")
    except Exception as e:
        logger.error(f"Viber Report Request Failed: {e}")


# Keep backward compat alias
_send_viber_messages = _send_viber_report


def _load_smartw_json(filename: str) -> list:
    """Helper to load alarm JSON files from DATA_DIR. Returns the 'data' list."""
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            payload = json.load(f)
            return payload.get('data', [])
    except Exception as e:
        logger.error(f"Error loading {filename}: {e}")
        return []

# ── SSE Event System ─────────────────────────────────────────────
_sse_subscribers: list[queue.Queue] = []
_sse_lock = threading.Lock()


def sse_subscribe() -> queue.Queue:
    """Subscribe a new SSE client. Returns a queue to read events from."""
    q = queue.Queue(maxsize=50)
    with _sse_lock:
        _sse_subscribers.append(q)
    return q


def sse_unsubscribe(q: queue.Queue):
    """Remove an SSE client subscription."""
    with _sse_lock:
        try:
            _sse_subscribers.remove(q)
        except ValueError:
            pass


def _sse_broadcast(event_type: str, data: dict):
    """Broadcast an event to all connected SSE clients."""
    import json as _json
    msg = _json.dumps(data, ensure_ascii=False)
    with _sse_lock:
        dead = []
        for q in _sse_subscribers:
            try:
                q.put_nowait({'event': event_type, 'data': msg})
            except queue.Full:
                dead.append(q)
        for q in dead:
            _sse_subscribers.remove(q)


# ── Persistent Scraper Session ───────────────────────────────────
_scraper = None           # SmartWScraper instance (persistent)
_scraper_creds = None     # (username, password) tuple — detect credential changes


# ── Debug Screenshot Cleanup ─────────────────────────────────────

def cleanup_debug_screenshots(max_age_hours: int = 24):
    """Delete debug_*.png and debug_pre_submit_*.png files older than max_age_hours."""
    import glob
    cutoff = datetime.now() - timedelta(hours=max_age_hours)
    patterns = [os.path.join(DATA_DIR, 'debug_*.png'),
                os.path.join(DATA_DIR, 'debug_pre_submit_*.png')]
    removed = 0
    for pattern in patterns:
        for f in glob.glob(pattern):
            try:
                mtime = datetime.fromtimestamp(os.path.getmtime(f))
                if mtime < cutoff:
                    os.remove(f)
                    removed += 1
            except OSError:
                pass
    if removed:
        logger.info(f'SmartW Worker: 🧹 Cleaned up {removed} old debug screenshots')

def _load_status() -> dict:
    """Load scrape status from file."""
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Ensure login_fail_count exists (migration)
                if 'login_fail_count' not in data:
                    data['login_fail_count'] = 0
                return data
        except (json.JSONDecodeError, IOError):
            pass
    return {
        'last_alarm_poll': None,
        'last_vhkt_poll': None,
        'errors': [],
        'is_running': False,
        'scheduler_enabled': False,
        'login_fail_count': 0
    }


def _save_status(status: dict):
    """Save scrape status to file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


def get_scrape_status() -> dict:
    """Get current scrape status for display."""
    status = _load_status()
    status['is_running'] = _is_running
    status['login_paused'] = status.get('login_fail_count', 0) >= MAX_LOGIN_FAILURES
    return status


async def _destroy_scraper():
    """Close the persistent scraper and reset state."""
    global _scraper, _scraper_creds
    if _scraper:
        try:
            await _scraper.stop()
        except Exception:
            pass
    _scraper = None
    _scraper_creds = None
    logger.info('SmartW Worker: 🔄 Persistent scraper destroyed')


def _destroy_scraper_sync():
    """Synchronous wrapper for _destroy_scraper (safe to call from any context)."""
    global _scraper, _scraper_creds
    if _scraper:
        try:
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, _destroy_scraper())
                future.result(timeout=10)
        except Exception:
            # Force cleanup even if async close fails
            _scraper = None
            _scraper_creds = None


def reset_login_failures():
    """Reset login failure counter + destroy scraper. Called when credentials are updated."""
    status = _load_status()
    status['login_fail_count'] = 0
    # Clear login-related errors
    status['errors'] = [
        e for e in status['errors']
        if 'Login' not in e.get('error', '') and 'login' not in e.get('error', '')
    ]
    _save_status(status)
    # Destroy old scraper so next poll creates a fresh one with new credentials
    _destroy_scraper_sync()
    logger.info('SmartW Worker: 🔄 Login failure counter reset + scraper destroyed (credentials updated)')


# ── Clear Detection ──────────────────────────────────────────────

def _detect_cleared(table_type: str) -> list[dict]:
    """Compare active vs previous JSON to detect cleared alarms.
    Returns list of cleared records with clear_time.
    """
    active_file = os.path.join(DATA_DIR, f'{table_type}.json')
    previous_file = os.path.join(DATA_DIR, f'{table_type}_previous.json')

    if not os.path.exists(previous_file) or not os.path.exists(active_file):
        return []

    try:
        with open(previous_file, 'r', encoding='utf-8') as f:
            previous = json.load(f).get('data', [])
        with open(active_file, 'r', encoding='utf-8') as f:
            active = json.load(f).get('data', [])
    except (json.JSONDecodeError, IOError):
        return []

    # Build set of active site keys for unique identification
    active_keys = set()
    for record in active:
        key = f"{_site_key(record)}__{record.get('sdate') or record.get('sdateStr') or ''}"
        active_keys.add(key)

    # Find records in previous but not in active → they cleared
    cleared = []
    now = datetime.now().isoformat()
    for record in previous:
        key = f"{_site_key(record)}__{record.get('sdate') or record.get('sdateStr') or ''}"
        if key not in active_keys:
            record['clear_time'] = now
            record['status'] = 'CLEARED'
            cleared.append(record)

    return cleared


def _detect_new(table_type: str) -> list[dict]:
    """Compare active vs previous JSON to detect NEW alarms for Viber Alert.
    Returns list of newly fired records.
    """
    active_file = os.path.join(DATA_DIR, f'{table_type}.json')
    previous_file = os.path.join(DATA_DIR, f'{table_type}_previous.json')

    if not os.path.exists(active_file):
        return []

    try:
        with open(active_file, 'r', encoding='utf-8') as f:
            active = json.load(f).get('data', [])
        
        # If no previous file, treat all active as new
        if not os.path.exists(previous_file):
            return active
            
        with open(previous_file, 'r', encoding='utf-8') as f:
            previous = json.load(f).get('data', [])
    except (json.JSONDecodeError, IOError):
        return []

    # Build set of previous site keys
    previous_keys = set()
    for record in previous:
        key = f"{_site_key(record)}__{record.get('sdate') or record.get('sdateStr') or ''}"
        previous_keys.add(key)

    # Find records in active but not in previous → they are newly fired
    new_alarms = []
    for record in active:
        key = f"{_site_key(record)}__{record.get('sdate') or record.get('sdateStr') or ''}"
        if key not in previous_keys:
            new_alarms.append(record)

    return new_alarms


def _update_cleared_list(table_type: str, new_cleared: list[dict]):
    """Update cleared list, removing entries older than 1 hour."""
    cleared_file = os.path.join(DATA_DIR, f'{table_type}_cleared.json')

    # Load existing cleared
    existing = []
    if os.path.exists(cleared_file):
        try:
            with open(cleared_file, 'r', encoding='utf-8') as f:
                existing = json.load(f).get('data', [])
        except (json.JSONDecodeError, IOError):
            existing = []

    # Filter out entries older than 1 hour
    cutoff = (datetime.now() - timedelta(hours=1)).isoformat()
    still_valid = [r for r in existing if r.get('clear_time', '') > cutoff]

    # Add new cleared entries
    still_valid.extend(new_cleared)

    # Save
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(cleared_file, 'w', encoding='utf-8') as f:
        json.dump({
            'updated_at': datetime.now().isoformat(),
            'count': len(still_valid),
            'data': still_valid
        }, f, ensure_ascii=False, indent=2)


def _backup_active(table_type: str):
    """Copy active.json → previous.json before new scrape."""
    active_file = os.path.join(DATA_DIR, f'{table_type}.json')
    previous_file = os.path.join(DATA_DIR, f'{table_type}_previous.json')
    if os.path.exists(active_file):
        shutil.copy2(active_file, previous_file)


# ── Poll Functions (Persistent Session) ──────────────────────────

async def _get_or_create_scraper(username: str, password: str):
    """Get existing scraper or create a new one.
    - Reuses existing session if still alive + same credentials
    - Creates new browser + login if first time or session died
    - Destroys and recreates if credentials changed
    - Uses is_alive_deep() to actually ping the browser (catches stale connections)
    """
    global _scraper, _scraper_creds
    from .scraper import SmartWScraper

    creds = (username, password)

    # If credentials changed, destroy old scraper
    if _scraper and _scraper_creds != creds:
        logger.info('SmartW Worker: Credentials changed, recreating scraper')
        await _destroy_scraper()

    # If scraper exists, do a DEEP alive check (actually ping the browser)
    if _scraper:
        alive = await _scraper.is_alive_deep()
        if alive:
            logger.info('SmartW Worker: ♻️ Reusing existing session (no re-login needed)')
            return _scraper
        else:
            logger.warning('SmartW Worker: 💀 Browser died (is_alive_deep=False), recreating...')
            await _destroy_scraper()

    # Need to create new scraper
    scraper = SmartWScraper(username, password)
    await scraper.start()

    # Login
    logged_in = await scraper.login()
    if not logged_in:
        await scraper.stop()
        return None  # Caller will handle login failure

    _scraper = scraper
    _scraper_creds = creds
    logger.info('SmartW Worker: ✅ New persistent session created')
    return _scraper


def _run_async(coro_func):
    """Run an async function in a thread (safe from Flask/APScheduler context).
    Timeout is 1200s to allow for long DataSite deep sync operations.
    """
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro_func())
            return future.result(timeout=1200)
    except RuntimeError:
        return asyncio.run(coro_func())


def run_alarm_poll():
    """Poll MĐ + MPĐ + MLL active alarms.
    Called by APScheduler every 15 minutes.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    if not _acquire_lock():
        return

    from .config import load_smartw_config
    config = load_smartw_config()
    if not config:
        logger.warning('SmartW Worker: Not configured, skipping poll')
        return

    # Circuit breaker: stop if too many consecutive login failures
    status = _load_status()
    fail_count = status.get('login_fail_count', 0)
    if fail_count >= MAX_LOGIN_FAILURES:
        logger.warning(f'SmartW Worker: ⛔ Polling PAUSED — {fail_count} consecutive login failures. '
                       'Cập nhật lại mật khẩu trong Admin → SmartW Config để tiếp tục.')
        return

    _is_running = True

    # Auto-cleanup old debug screenshots (>24h)
    try:
        cleanup_debug_screenshots()
    except Exception:
        pass  # Don't let cleanup failure block polling

    async def _do_alarm_poll():
        scraper = await _get_or_create_scraper(config['username'], config['password'])
        if not scraper:
            return {'error': 'Login thất bại'}

        results = {}
        try:
            # Ensure session is still valid (auto re-login if expired)
            await scraper._ensure_login()

            results['md'] = await scraper.scrape_md()
            results['mpd'] = await scraper.scrape_mpd()
            mll_tram, mll_cell = await scraper.scrape_mll_all()
            results['mll'] = mll_tram
            results['mll_cell'] = mll_cell
            results['status'] = 'success'
            results['scraped_at'] = datetime.now().isoformat()
        except Exception as e:
            err_str = str(e)
            logger.error(f'SmartW Scrape Error: {err_str}')

            # If browser crashed, destroy and retry ONCE with a fresh browser
            crash_keywords = ['NoneType', 'send', 'closed', 'Target page']
            if any(kw in err_str for kw in crash_keywords):
                logger.info('SmartW Worker: 🔄 Alarm browser crash detected — retrying with fresh browser...')
                await _destroy_scraper()
                try:
                    scraper = await _get_or_create_scraper(config['username'], config['password'])
                    if scraper:
                        await scraper._ensure_login()
                        results['md'] = await scraper.scrape_md()
                        results['mpd'] = await scraper.scrape_mpd()
                        mll_tram, mll_cell = await scraper.scrape_mll_all()
                        results['mll'] = mll_tram
                        results['mll_cell'] = mll_cell
                        results['status'] = 'success'
                        results['scraped_at'] = datetime.now().isoformat()
                        logger.info('SmartW Worker: ✅ Alarm retry succeeded!')
                    else:
                        results['error'] = 'Login thất bại (retry)'
                except Exception as retry_err:
                    results['error'] = str(retry_err)
                    logger.error(f'SmartW Alarm Retry Error: {retry_err}')
                    await _destroy_scraper()
            else:
                results['error'] = err_str
                await _destroy_scraper()
        return results

    try:
        logger.info(f'⏰ SmartW Worker: Starting alarm poll at {datetime.now()}')
        _sse_broadcast('scrape_start', {'status': 'running'})

        # Backup active → previous (for clear detection)
        for table_type in ['md', 'mpd', 'mll', 'mll_cell']:
            _backup_active(table_type)

        result = _run_async(_do_alarm_poll)

        if result.get('error'):
            logger.error(f'SmartW Worker: ❌ {result["error"]}')
            status['errors'].append({
                'time': datetime.now().isoformat(),
                'error': result['error'],
                'source': 'alarm'
            })
            status['errors'] = status['errors'][-10:]
            # Increment login failure counter for login errors
            err_lower = result['error'].lower()
            if any(kw in err_lower for kw in ['login', 'đăng nhập', 'cooldown', 'credentials']):
                status['login_fail_count'] = status.get('login_fail_count', 0) + 1
                logger.warning(f'SmartW Worker: Login failure #{status["login_fail_count"]}/{MAX_LOGIN_FAILURES}')
        else:
            logger.info(f'SmartW Worker: ✅ Alarm poll done — '
                        f'MĐ: {len(result.get("md", []))}, '
                        f'MPĐ: {len(result.get("mpd", []))}, '
                        f'MLL: {len(result.get("mll", []))}, '
                        f'MLL Cell: {len(result.get("mll_cell", []))}')

            # Login succeeded → reset failure counter
            status['login_fail_count'] = 0

            # Clear stale alarm errors on success
            status['errors'] = [
                e for e in status['errors']
                if e.get('source') == 'vhkt'  # keep only vhkt errors
            ]

            # ── Collect new alarms & cleared for new Viber format ──
            all_new = {}   # table_type -> list of new alarms
            all_cleared = []  # list of (table_type, alarm)

            for table_type in ['md', 'mpd', 'mll', 'mll_cell']:
                cleared = _detect_cleared(table_type)
                if cleared:
                    _update_cleared_list(table_type, cleared)
                    logger.info(f'SmartW Worker: {len(cleared)} {table_type.upper()} alarm(s) cleared')
                    for alarm in cleared:
                        all_cleared.append((table_type, alarm))

                new_alarms = _detect_new(table_type)
                if new_alarms:
                    logger.info(f'SmartW Worker: {len(new_alarms)} {table_type.upper()} alarm(s) newly detected')
                    all_new[table_type] = new_alarms

            if all_new or all_cleared:
                sep = '------------'
                
                # Filter for real-time reporting (skip mll_cell)
                new_md = all_new.get('md', [])
                new_mpd = all_new.get('mpd', [])
                new_mll = all_new.get('mll', [])
                
                cl_md = [a for (t, a) in all_cleared if t == 'md']
                cl_mpd = [a for (t, a) in all_cleared if t == 'mpd']
                cl_mll = [a for (t, a) in all_cleared if t == 'mll']

                if not (new_md or new_mpd or new_mll or cl_md or cl_mpd or cl_mll):
                    # No real-time updates to report (only celloff changes)
                    status['last_alarm_poll'] = datetime.now().isoformat()
                    return

                lines = []

                # --- 1. ACTIVE SECTION ---
                if new_md or new_mpd or new_mll:
                    lines.append("🚨 *ACTIVE* 🚨")
                    lines.append(sep)
                    
                    if new_md:
                        lines.append("⚡ *MAC:*")
                        for alarm in new_md:
                            site = _site_key(alarm)
                            label = _get_site_label(site)
                            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=False)
                            lines.append(f"  • {label} - {t}")
                    
                    if new_mpd:
                        lines.append("🔋 *GEN:*")
                        for alarm in new_mpd:
                            site = _site_key(alarm)
                            label = _get_site_label(site)
                            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=False)
                            lines.append(f"  • {label} - {t}")

                    if new_mll:
                        mll_groups = {}
                        for alarm in new_mll:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=False)
                            if site not in mll_groups:
                                mll_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
                            if net and net not in mll_groups[site]['nets']:
                                mll_groups[site]['nets'].append(net)
                        
                        lines.append("📵 *MLL:*")
                        for site, grp in mll_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")

                # --- 2. CLEARED SECTION ---
                if cl_md or cl_mpd or cl_mll:
                    if lines: lines.append(sep) # Separator only if ACTIVE was present
                    lines.append("✅ *CLEARED* ✅")
                    lines.append(sep)

                    if cl_md:
                        lines.append("⚡ *MAC:*")
                        for alarm in cl_md:
                            site = _site_key(alarm)
                            label = _get_site_label(site)
                            clear_t = _fmt_sdate(alarm.get('clear_time') or alarm.get('edateStr') or '', full=False)
                            lines.append(f"  • {label} - {clear_t}")

                    if cl_mpd:
                        lines.append("🔋 *GEN:*")
                        for alarm in cl_mpd:
                            site = _site_key(alarm)
                            label = _get_site_label(site)
                            clear_t = _fmt_sdate(alarm.get('clear_time') or alarm.get('edateStr') or '', full=False)
                            lines.append(f"  • {label} - {clear_t}")

                    if cl_mll:
                        mll_cl_groups = {}
                        for alarm in cl_mll:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            clear_t = _fmt_sdate(alarm.get('clear_time') or alarm.get('edateStr') or '', full=False)
                            if site not in mll_cl_groups:
                                mll_cl_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': clear_t}
                            if net and net not in mll_cl_groups[site]['nets']:
                                mll_cl_groups[site]['nets'].append(net)
                        
                        lines.append("📵 *MLL:*")
                        for site, grp in mll_cl_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")

                # lines.append(sep)
                # lines.append("📢 Tổng: " + str(total_active) + " cảnh báo đang hoạt động")

                _send_viber_report(lines)

        status['last_alarm_poll'] = datetime.now().isoformat()

    except Exception as e:
        logger.error(f'SmartW Worker: ❌ Unexpected error: {e}')
        status['errors'].append({
            'time': datetime.now().isoformat(),
            'error': str(e),
            'source': 'alarm'
        })
        status['errors'] = status['errors'][-10:]
    finally:
        _save_status(status)
        _release_lock()
        # Broadcast to all connected browsers via SSE
        from .scraper import load_cached_data
        md_raw = load_cached_data('md')
        mpd_raw = load_cached_data('mpd')
        mll_raw = load_cached_data('mll')
        mll_cell_raw = load_cached_data('mll_cell')

        _sse_broadcast('scrape_done', {
            'scraped_at': status.get('last_alarm_poll'),
            'last_poll': datetime.now().strftime('%H:%M'),
            'status': 'configured',
            'md_count': len([r for r in (md_raw or {}).get('data', []) if not r.get('edate')]),
            'mpd_count': len([r for r in (mpd_raw or {}).get('data', []) if not r.get('edate')]),
            'mll_count': len((mll_raw or {}).get('data', [])),
            'mll_cell_count': len((mll_cell_raw or {}).get('data', [])),
            'has_error': bool(result.get('error')) if 'result' in dir() else False
        })


def run_vhkt_poll():
    """Poll VHKT daily summary.
    Called by APScheduler once at 5:00 AM.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    if not _acquire_lock():
        return

    from .config import load_smartw_config
    config = load_smartw_config()
    if not config:
        logger.warning('SmartW Worker: Not configured, skipping VHKT poll')
        return

    # Circuit breaker: stop if too many consecutive login failures
    status = _load_status()
    fail_count = status.get('login_fail_count', 0)
    if fail_count >= MAX_LOGIN_FAILURES:
        logger.warning(f'SmartW Worker: ⛔ VHKT polling PAUSED — {fail_count} consecutive login failures.')
        return

    _is_running = True

    async def _do_vhkt_poll():
        scraper = await _get_or_create_scraper(config['username'], config['password'])
        if not scraper:
            return {'error': 'Login thất bại'}

        results = {}
        try:
            await scraper._ensure_login()

            results['vhkt'] = await scraper.scrape_vhkt()
            results['status'] = 'success'
            results['scraped_at'] = datetime.now().isoformat()
        except Exception as e:
            err_str = str(e)
            logger.error(f'SmartW VHKT Scrape Error: {err_str}')

            # If browser crashed, destroy and retry ONCE with a fresh browser
            crash_keywords = ['NoneType', 'send', 'closed', 'Target page']
            if any(kw in err_str for kw in crash_keywords):
                logger.info('SmartW Worker: 🔄 VHKT browser crash detected — retrying with fresh browser...')
                await _destroy_scraper()
                try:
                    scraper = await _get_or_create_scraper(config['username'], config['password'])
                    if scraper:
                        await scraper._ensure_login()
                        results['vhkt'] = await scraper.scrape_vhkt()
                        results['status'] = 'success'
                        results['scraped_at'] = datetime.now().isoformat()
                        logger.info('SmartW Worker: ✅ VHKT retry succeeded!')
                    else:
                        results['error'] = 'Login thất bại (retry)'
                except Exception as retry_err:
                    results['error'] = str(retry_err)
                    logger.error(f'SmartW VHKT Retry Error: {retry_err}')
                    await _destroy_scraper()
            else:
                results['error'] = err_str
                await _destroy_scraper()
        return results

    try:
        logger.info(f'⏰ SmartW Worker: Starting VHKT poll at {datetime.now()}')

        result = _run_async(_do_vhkt_poll)

        if result.get('error'):
            logger.error(f'SmartW Worker: ❌ VHKT: {result["error"]}')
            status['errors'].append({
                'time': datetime.now().isoformat(),
                'error': f'VHKT: {result["error"]}',
                'source': 'vhkt'
            })
            status['errors'] = status['errors'][-10:]
            err_lower_v = result.get('error', '').lower()
            if any(kw in err_lower_v for kw in ['login', 'đăng nhập', 'cooldown', 'credentials']):
                status['login_fail_count'] = status.get('login_fail_count', 0) + 1
                logger.warning(f'SmartW Worker: Login failure #{status["login_fail_count"]}/{MAX_LOGIN_FAILURES}')
        else:
            logger.info(f'SmartW Worker: ✅ VHKT poll done — {len(result.get("vhkt", []))} records')

            # Login succeeded → reset failure counter
            status['login_fail_count'] = 0

            # Clear stale VHKT errors on success
            status['errors'] = [
                e for e in status['errors']
                if e.get('source') != 'vhkt'  # keep non-vhkt errors
            ]

        status['last_vhkt_poll'] = datetime.now().isoformat()

    except Exception as e:
        logger.error(f'SmartW Worker: ❌ Unexpected error: {e}')
        status['errors'].append({
            'time': datetime.now().isoformat(),
            'error': str(e),
            'source': 'vhkt'
        })
        status['errors'] = status['errors'][-10:]
    finally:
        _is_running = False
        _save_status(status)


def run_mfd_import_poll(target_date: str = None):
    """Daily MFĐ reports scrape + auto-import into GeneratorLog.
    Called by APScheduler at 6:00 AM (scrapes yesterday's data).
    Can also be triggered manually with a specific date.

    Args:
        target_date: Optional date string (DD/MM/YYYY). Default: yesterday.
    """
    if not _acquire_lock():
        return {'error': 'Worker busy'}

    from .config import load_smartw_config
    config = load_smartw_config()
    if not config:
        logger.warning('SmartW Worker: Not configured, skipping MFĐ import')
        return {'error': 'SmartW not configured'}

    # Circuit breaker
    status = _load_status()
    fail_count = status.get('login_fail_count', 0)
    if fail_count >= MAX_LOGIN_FAILURES:
        logger.warning(f'SmartW Worker: MFĐ import PAUSED — {fail_count} login failures.')
        return {'error': 'Login paused'}

    _is_running = True

    async def _do_mfd_scrape():
        scraper = await _get_or_create_scraper(config['username'], config['password'])
        if not scraper:
            return {'error': 'Login failed'}

        results = {}
        try:
            await scraper._ensure_login()
            mfd_data = await scraper.scrape_mfd_reports(target_date)
            results['raw_count'] = len(mfd_data)
            results['data'] = mfd_data
            results['status'] = 'success'
        except Exception as e:
            err_str = str(e)
            logger.error(f'SmartW MFĐ Import Scrape Error: {err_str}')

            # Browser crash → retry once
            crash_keywords = ['NoneType', 'send', 'closed', 'Target page']
            if any(kw in err_str for kw in crash_keywords):
                logger.info('SmartW Worker: MFĐ browser crash — retrying...')
                await _destroy_scraper()
                try:
                    scraper = await _get_or_create_scraper(config['username'], config['password'])
                    if scraper:
                        await scraper._ensure_login()
                        mfd_data = await scraper.scrape_mfd_reports(target_date)
                        results['raw_count'] = len(mfd_data)
                        results['data'] = mfd_data
                        results['status'] = 'success'
                    else:
                        results['error'] = 'Login failed (retry)'
                except Exception as retry_err:
                    results['error'] = str(retry_err)
                    await _destroy_scraper()
            else:
                results['error'] = err_str
                await _destroy_scraper()
        return results

    import_result = None
    try:
        date_label = target_date or 'yesterday'
        logger.info(f'SmartW Worker: Starting MFD import for {date_label}')

        scrape_result = _run_async(_do_mfd_scrape)

        if scrape_result.get('error'):
            logger.error(f'SmartW Worker: MFD scrape failed: {scrape_result["error"]}')
            status['errors'].append({
                'time': datetime.now().isoformat(),
                'error': f'MFD: {scrape_result["error"]}',
                'source': 'mfd_import'
            })
            status['errors'] = status['errors'][-10:]
            err_lower = scrape_result['error'].lower()
            if any(kw in err_lower for kw in ['login', 'credentials']):
                status['login_fail_count'] = status.get('login_fail_count', 0) + 1
        else:
            # Scrape OK → run import logic (needs Flask app context)
            status['login_fail_count'] = 0
            raw_data = scrape_result.get('data', [])

            if raw_data:
                from generator.mfd_import import import_mfd_data, update_incomplete_records

                # Step 1: Update any incomplete records from previous scrapes
                # (overnight events that now have end times in today's data)
                updated_count = update_incomplete_records(raw_data)
                if updated_count:
                    logger.info(f'SmartW Worker: MFD updated {updated_count} incomplete overnight records')

                # Step 2: Import new records
                import_result = import_mfd_data(raw_data)
                import_result['updated'] = updated_count
                logger.info(f'SmartW Worker: MFD import done — '
                            f'{import_result["imported"]} imported, '
                            f'{import_result["pending"]} pending, '
                            f'{import_result["skipped"]} skipped, '
                            f'{import_result["duplicates"]} duplicates, '
                            f'{updated_count} updated')
            else:
                import_result = {'imported': 0, 'pending': 0, 'skipped': 0,
                                 'duplicates': 0, 'updated': 0, 'errors': []}
                logger.info(f'SmartW Worker: MFD — no events for {date_label}')

            # Step 3: Also scrape the past 3 days to catch overnight events
            # that started previously and ended on D (now completed with end time)
            try:
                if target_date:
                    base_dt = datetime.strptime(target_date, '%d/%m/%Y')
                else:
                    base_dt = datetime.now() - timedelta(days=1)
                
                total_updated = 0
                for d in range(1, 4):  # Check 3 days back
                    prev_dt = base_dt - timedelta(days=d)
                    prev_date_str = prev_dt.strftime('%d/%m/%Y')

                    logger.info(f'SmartW Worker: MFD also checking {prev_date_str} for overnight updates...')

                    async def _scrape_prev(date_str=prev_date_str):
                        scraper = await _get_or_create_scraper(config['username'], config['password'])
                        if scraper:
                            await scraper._ensure_login()
                            return await scraper.scrape_mfd_reports(date_str)
                        return []

                    prev_data = _run_async(_scrape_prev)
                    if prev_data:
                        from generator.mfd_import import update_incomplete_records
                        prev_updated = update_incomplete_records(prev_data)
                        if prev_updated:
                            logger.info(f'SmartW Worker: MFD updated {prev_updated} records from {prev_date_str}')
                            total_updated += prev_updated
                
                if total_updated:
                    import_result['updated'] = import_result.get('updated', 0) + total_updated

            except Exception as prev_err:
                logger.warning(f'SmartW Worker: MFD prev-day scrape error (non-critical): {prev_err}')

        status['last_mfd_import'] = datetime.now().isoformat()

    except Exception as e:
        logger.error(f'SmartW Worker: MFD unexpected error: {e}')
        status['errors'].append({
            'time': datetime.now().isoformat(),
            'error': str(e),
            'source': 'mfd_import'
        })
        status['errors'] = status['errors'][-10:]
    finally:
        _is_running = False
        _save_status(status)

    return import_result


# ── DataSite Export Sync Worker ───────────────────────────────────
# Phase 03: Background job that uses the DataSite Export modal to
# bulk-download data by object name and upsert into DB.
# ─────────────────────────────────────────────────────────────────

# Track if DataSite deep sync is currently running
_datasite_sync_running = False
_datasite_sync_status: dict = {}  # Live progress dict


def run_datasite_export_sync(objects: list, area: str = None):
    """
    [Phase 03 - Deep Sync]
    Chạy DataSite Export Sync trong luồng nền.
    Broadcast tiến độ qua SSE cho mỗi đối tượng hoàn thành.

    Args:
        objects: List tên đối tượng từ EXPORT_OBJECT_MAP
                 VD: ['PHÒNG MÁY', 'MÁY PHÁT ĐIỆN']
        area:    Khu vực (optional, mặc định dùng unit đã select trong SDM)
    """
    global _datasite_sync_running, _datasite_sync_status

    if _datasite_sync_running:
        logger.warning('DataSite Export Sync: Đang chạy, bỏ qua yêu cầu mới.')
        return

    if not objects:
        logger.warning('DataSite Export Sync: Không có đối tượng nào được cung cấp.')
        return

    _datasite_sync_running = True
    total = len(objects)
    _datasite_sync_status = {
        'running': True,
        'total': total,
        'done': 0,
        'current': None,
        'results': {},
        'errors': [],
        'started_at': datetime.now().isoformat()
    }

    _sse_broadcast('ds_sync_start', {
        'total': total,
        'objects': objects,
        'message': f'Bắt đầu đồng bộ {total} đối tượng DataSite...'
    })

    async def _do_export_sync():
        from models import SystemConfig
        from datasite_scraper import DataSiteScraper

        conf_user = SystemConfig.query.filter_by(key='datasite_username').first()
        conf_pass = SystemConfig.query.filter_by(key='datasite_password').first()
        user = conf_user.value if conf_user and conf_user.value else os.getenv('DATASITE_USER', '')
        pwd = conf_pass.value if conf_pass and conf_pass.value else os.getenv('DATASITE_PWD', '')

        if not user or not pwd:
            logger.error('DataSite Export Sync: Chưa cấu hình tài khoản DataSite.')
            _datasite_sync_status['errors'].append('Chưa cấu hình tài khoản DataSite.')
            return

        scraper = DataSiteScraper(user, pwd)
        try:
            await scraper.start()
            await scraper.login()

            for i, obj_name in enumerate(objects):
                _datasite_sync_status['current'] = obj_name
                _sse_broadcast('ds_sync_progress', {
                    'current_object': obj_name,
                    'index': i + 1,
                    'total': total,
                    'percent': round((i / total) * 100),
                    'message': f'[{i + 1}/{total}] Đang xuất: {obj_name}...'
                })

                try:
                    row_dict = await scraper.scrape_export_data([obj_name], area=area)
                    rows = row_dict.get(obj_name, [])

                    if rows:
                        upserted = upsert_datasite_rows(obj_name, rows)
                        _datasite_sync_status['results'][obj_name] = upserted
                        _sse_broadcast('ds_sync_object_done', {
                            'object': obj_name,
                            'count': upserted,
                            'message': f'✅ {obj_name}: {upserted} bản ghi.'
                        })
                    else:
                        _datasite_sync_status['results'][obj_name] = 0
                        _sse_broadcast('ds_sync_object_done', {
                            'object': obj_name,
                            'count': 0,
                            'message': f'⚠️ {obj_name}: Không có dữ liệu.'
                        })

                except Exception as obj_err:
                    err_msg = f'❌ {obj_name}: {obj_err}'
                    logger.exception(f'DataSite Export Sync: {err_msg}')
                    _datasite_sync_status['errors'].append(err_msg)
                    _sse_broadcast('ds_sync_object_error', {
                        'object': obj_name,
                        'error': str(obj_err)
                    })

                _datasite_sync_status['done'] = i + 1

        except Exception as e:
            import traceback
            logger.error(f'DataSite Export Sync: Critical error: {e}')
            logger.error(traceback.format_exc())
            _datasite_sync_status['errors'].append(f'Critical: {e}')
            _sse_broadcast('ds_sync_object_error', {
                'object': 'System',
                'error': str(e)
            })
        finally:
            await scraper.stop()
            
            global _datasite_sync_running
            _datasite_sync_running = False
            _datasite_sync_status['running'] = False
            _datasite_sync_status['current'] = None
            _datasite_sync_status['finished_at'] = datetime.now().isoformat()
            
            total_upserted = sum(_datasite_sync_status['results'].values())
            _sse_broadcast('ds_sync_done', {
                'total_objects': total,
                'total_upserted': total_upserted,
                'errors': _datasite_sync_status['errors'],
                'message': f'Hoàn tất! Đã đồng bộ {total_upserted} bản ghi từ {total} đối tượng.'
            })
            logger.info(
                f'DataSite Export Sync: Complete — {total_upserted} rows upserted from {total} objects.'
            )

    try:
        _run_async(_do_export_sync)
    except Exception as e:
        logger.error(f'DataSite Export Sync: _run_async error: {e}')
        _datasite_sync_status['errors'].append(str(e))
        _datasite_sync_running = False
        _datasite_sync_status['running'] = False
        _sse_broadcast('ds_sync_done', {'message': f'Error starting background task: {e}'})


def get_datasite_sync_status() -> dict:
    """Trả về trạng thái hiện tại của DataSite Export Sync job."""
    return dict(_datasite_sync_status)


def upsert_datasite_rows(object_name: str, rows: list) -> int:
    """
    [Phase 03 - Deep Sync]
    Chèn hoặc cập nhật (Upsert) list rows vào DB tương ứng theo EXPORT_OBJECT_MAP.
    Dùng merge strategy: tìm record theo (site_id + loai + subcategory), nếu có thì update, không có thì insert.

    Returns:
        int: Số bản ghi đã xử lý (insert + update)
    """
    from datasite_sync_config import EXPORT_OBJECT_MAP
    from extensions import db
    from string import capwords

    cfg = EXPORT_OBJECT_MAP.get(object_name)
    if not cfg:
        logger.warning(f'upsert_datasite_rows: Không tìm thấy config cho "{object_name}"')
        return 0

    db_table = cfg.get('db_table')  # 'infrastructure' / 'equipment' / 'telecom'
    loai = cfg.get('loai', '')
    sync_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Import model tương ứng
    model_map = {
        'infrastructure': None,
        'equipment': None,
        'telecom': None,
    }
    try:
        from models import DsInfrastructure, DsEquipment, DsTelecom
        model_map['infrastructure'] = DsInfrastructure
        model_map['equipment'] = DsEquipment
        model_map['telecom'] = DsTelecom
    except ImportError as ie:
        logger.error(f'upsert_datasite_rows: Import models failed: {ie}')
        return 0

    Model = model_map.get(db_table)
    if not Model:
        logger.warning(f'upsert_datasite_rows: db_table "{db_table}" không hợp lệ')
        return 0

    upserted = 0
    try:
        for row in rows:
            site_id = row.get('site_id', '').upper().strip()
            if not site_id:
                continue

            extra_data = row.get('extra_data') or {}

            # Tìm record hiện có theo (site_id + loai + subcategory)
            existing = Model.query.filter_by(
                site_id=site_id,
                loai=loai,
                subcategory=object_name
            ).first()

            if existing:
                # Update
                if row.get('serial') is not None:
                    existing.serial = row.get('serial')
                if row.get('trang_thai') is not None:
                    existing.trang_thai = row.get('trang_thai')
                if row.get('han_bao_hanh') is not None:
                    existing.han_bao_hanh = row.get('han_bao_hanh')
                if row.get('han_bao_duong') is not None:
                    existing.han_bao_duong = row.get('han_bao_duong')
                if row.get('ngay_su_dung') is not None and hasattr(existing, 'ngay_su_dung'):
                    existing.ngay_su_dung = row.get('ngay_su_dung')
                if row.get('nhan_hieu') is not None and hasattr(existing, 'nhan_hieu'):
                    existing.nhan_hieu = row.get('nhan_hieu')
                # Merge extra_data
                if extra_data:
                    old_extra = existing.extra_data or {}
                    old_extra.update(extra_data)
                    existing.extra_data = old_extra
                existing.sync_date = sync_date
            else:
                # Insert
                kwargs = {
                    'site_id': site_id,
                    'loai': loai,
                    'subcategory': object_name,
                    'serial': row.get('serial'),
                    'trang_thai': row.get('trang_thai'),
                    'han_bao_hanh': row.get('han_bao_hanh'),
                    'han_bao_duong': row.get('han_bao_duong'),
                    'extra_data': extra_data if extra_data else None,
                    'sync_date': sync_date,
                }
                # Thêm các trường đặc biệt nếu Model có
                if hasattr(Model, 'nhan_hieu') and row.get('nhan_hieu'):
                    kwargs['nhan_hieu'] = row.get('nhan_hieu')
                if hasattr(Model, 'ngay_su_dung') and row.get('ngay_su_dung'):
                    kwargs['ngay_su_dung'] = row.get('ngay_su_dung')

                db.session.add(Model(**kwargs))

            upserted += 1

        db.session.commit()
        logger.info(f'upsert_datasite_rows: Upserted {upserted} rows for "{object_name}" ({loai})')
    except Exception as e:
        db.session.rollback()
        logger.error(f'upsert_datasite_rows: DB commit failed for "{object_name}": {e}')
        upserted = 0

    return upserted


def send_periodic_full_report():
    """Send a full status report to Viber Channel (Periodic 2-hour Review).
    Explicitly triggered by scheduler even if no changes occur.
    """
    logger.info("SmartW Worker: 🕒 Starting periodic 2-hour review report...")
    
    # 1. Load latest active data from disk
    md_list = _load_smartw_json('md.json')
    mpd_list = _load_smartw_json('mpd.json')
    mll_list = _load_smartw_json('mll.json')
    cell_list = _load_smartw_json('mll_cell.json')
    
    # Check if empty
    if not any([md_list, mpd_list, mll_list, cell_list]):
        pass

    sep = '------------'
    lines = ["📊 *SUMMARY (2H)* 📊"]
    lines.append(sep)
    
    total_active = 0
    
    # Setup mpd_sites for MAC marking
    mpd_sites = {str(r.get('site') or r.get('site_id') or '').upper() for r in mpd_list if r.get('site') or r.get('site_id')}

    # ── Section 1: MAC ──
    if md_list:
        lines.append("⚡ *MAC:*")
        for alarm in md_list:
            site = _site_key(alarm)
            label = _get_site_label(site)
            # Full format for summary
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            lines.append(f"  • {label} - {t}")
            total_active += 1

    # ── Section 2: GEN ──
    if mpd_list:
        lines.append("🔋 *GEN:*")
        for alarm in mpd_list:
            site = _site_key(alarm)
            label = _get_site_label(site)
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            lines.append(f"  • {label} - {t}")
            total_active += 1

    # ── Section 3: MLL ──
    if mll_list:
        mll_groups = {}
        for alarm in mll_list:
            site = _site_key(alarm)
            net = _norm_net(alarm.get('network') or '')
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            if site not in mll_groups:
                mll_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
            if net and net not in mll_groups[site]['nets']:
                mll_groups[site]['nets'].append(net)
        
        lines.append("📵 *MLL:*")
        for site, grp in mll_groups.items():
            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")
            total_active += 1

    # ── Section 4: CELLOFF ──
    if cell_list:
        seen_cells = {}
        for alarm in cell_list:
            cid = str(alarm.get('cellid') or alarm.get('cell_id') or '').strip().upper()
            if cid and cid not in seen_cells: seen_cells[cid] = alarm
            elif not cid: seen_cells[id(alarm)] = alarm
            
        lines.append("📵 *CELLOFF* (" + str(len(seen_cells)) + " cell):")
        for cid, alarm in seen_cells.items():
            site = _site_key(alarm)
            label = _get_site_label(site)
            net = _norm_net(alarm.get('network') or '')
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            net_part = f" [{net}]" if net else ''
            display_cid = str(alarm.get('cellid') or alarm.get('cell_id') or cid)
            lines.append(f"  • {label} | {display_cid}{net_part} - {t}")
            total_active += 1

    if total_active > 0:
        _send_viber_report(lines)
        logger.info(f"SmartW Worker: ✅ Periodic report sent ({total_active} active alarms)")
    else:
        logger.info("SmartW Worker: 🏠 No active alarms, skipping periodic report.")
