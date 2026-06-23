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
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

current_dir = os.path.dirname(os.path.abspath(__file__))
# Load env
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

supabase = create_client(os.getenv("VITE_SUPABASE_URL"), os.getenv("VITE_SUPABASE_ANON_KEY")) if os.getenv("VITE_SUPABASE_URL") else None

from datetime import datetime, timedelta

logger = logging.getLogger("smartw_worker")

DATA_DIR = os.path.join(current_dir, 'data', 'smartw')
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

def _split_site_id(site_id) -> tuple[str, str]:
    """Split a site ID into its base and suffix.
    Example: 'DNIXTC06_1' -> ('DNIXTC06', '_1')
    """
    if not site_id:
        return "", ""
    s = str(site_id).strip()
    for delimiter in ['_', '-']:
        if delimiter in s:
            parts = s.split(delimiter)
            if parts[0]:
                base = parts[0]
                suffix = delimiter + delimiter.join(parts[1:])
                return base, suffix
    return s, ""

_datasites_cache = None

def _get_datasites_list():
    global _datasites_cache
    if _datasites_cache is not None:
        return _datasites_cache
    if not supabase:
        return []
    try:
        res = supabase.table("datasites").select("site_id, site_id_old").execute()
        _datasites_cache = res.data or []
    except Exception as e:
        logger.error(f'SmartW failed to fetch datasites cache: {e}')
        _datasites_cache = []
    return _datasites_cache


def _get_site_label(site_id) -> str:
    """Return '*ID_MOI* (ID_CU)' label for Viber display on V2."""
    if not site_id:
        return ""
    site_str = str(site_id).strip().upper()
    base_id, suffix = _split_site_id(site_str)
    site_upper = base_id.strip().upper()
    try:
        data = _get_datasites_list()
        # Sort by site_id length desc to match the most specific prefix first
        sorted_data = sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True)
        for s in sorted_data:
            s_id = (s.get("site_id") or "").upper()
            s_old = (s.get("site_id_old") or "").upper()
            
            matched = False
            # Check exact match on base
            if site_upper == s_id or site_upper == s_old:
                matched = True
            # Or prefix match on full string (supporting tech suffixes like DNIBLC12CM4CC)
            elif (s_id and site_str.startswith(s_id)) or (s_old and site_str.startswith(s_old)):
                matched = True
                matched_prefix = s_id if (s_id and site_str.startswith(s_id)) else s_old
                suffix = site_str[len(matched_prefix):]
                
            if matched:
                if s.get("site_id_old") and s.get("site_id") != s.get("site_id_old"):
                    return f"*{s.get('site_id')}{suffix}* ({s.get('site_id_old')}{suffix})"
                return f"*{s.get('site_id')}{suffix}*"
    except Exception as e:
        logger.error(f'SmartW _get_site_label V2 error: {e}')
    return f"*{site_id}*"


def _is_managed_site(site_id) -> bool:
    """Check if the site exists in datasites table (i.e. managed by Telecom Team 3)."""
    if not site_id:
        return False
    site_str = str(site_id).strip().upper()
    try:
        data = _get_datasites_list()
        if not data:
            # Fallback if datasites list cannot be fetched: assume managed to avoid missing alerts
            return True
            
        base_id, _ = _split_site_id(site_str)
        site_upper = base_id.strip().upper()
        
        # Sort by site_id length desc to match the most specific prefix first
        sorted_data = sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True)
        for s in sorted_data:
            s_id = (s.get("site_id") or "").upper()
            s_old = (s.get("site_id_old") or "").upper()
            
            # Exact matches (after delimiter split)
            if site_upper == s_id or site_upper == s_old:
                return True
                
            # Prefix matches (to support cell IDs or site IDs with tech suffixes, e.g. DNIBLC12CM4CC)
            if s_id and site_str.startswith(s_id):
                return True
            if s_old and site_str.startswith(s_old):
                return True
    except Exception as e:
        logger.error(f'Error checking managed site {site_id}: {e}')
        return True
    return False


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


def _old_id(site_id) -> str:
    """Look up legacy site ID from V2 datasites table."""
    if not site_id:
        return ""
    site_str = str(site_id).strip().upper()
    try:
        data = _get_datasites_list()
        sorted_data = sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True)
        for s in sorted_data:
            s_id = (s.get("site_id") or "").upper()
            s_old = (s.get("site_id_old") or "").upper()
            if site_str == s_id or site_str == s_old:
                return s.get("site_id_old") or s.get("site_id")
            if s_id and site_str.startswith(s_id):
                suffix = site_str[len(s_id):]
                old_base = s.get("site_id_old") or s.get("site_id")
                return f"{old_base}{suffix}"
            if s_old and site_str.startswith(s_old):
                suffix = site_str[len(s_old):]
                old_base = s.get("site_id_old") or s.get("site_id")
                return f"{old_base}{suffix}"
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


def _send_viber_report(lines: list, token: str = None, sender: str = None):
    """Send a formatted report to Viber Channel via pa/post."""
    if not lines:
        return
    text = "\n".join(lines)
    
    # Determine sender ID based on token if not explicitly provided
    from_id = sender
    if not from_id:
        pakh_token = "56b57ae5bbb11e4f-b8084d4fec7bf6ee-e681b83f2f40f110"
        if token == pakh_token:
            from_id = "7DjCba+6SC7OvtozmG+ySQ=="
        else:
            from_id = "OMu7ptWb9vbA4pvi5QfVjQ=="
            
    payload = {
        "from": from_id,
        "type": "text",
        "text": text
    }
    viber_token = token
    if not viber_token:
        config_path = os.path.join(current_dir, 'data', 'system_config.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    cfg = json.load(f)
                    viber_token = cfg.get('viber_bot_token_alarms')
            except:
                pass
    if not viber_token:
        viber_token = "567370461ff5bfce-6527e240db117ad7-ce130e1ad6041265"
        
    headers = {
        "X-Viber-Auth-Token": viber_token
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

# ── SSE Event System (Disabled in Decoupled Worker V2) ───────────
def _sse_broadcast(event_type: str, data: dict):
    pass


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
                if 'viber_sso_error_sent' not in data:
                    data['viber_sso_error_sent'] = False
                return data
        except (json.JSONDecodeError, IOError):
            pass
    return {
        'last_alarm_poll': None,
        'last_vhkt_poll': None,
        'errors': [],
        'is_running': False,
        'scheduler_enabled': False,
        'login_fail_count': 0,
        'viber_sso_error_sent': False
    }


def _save_status(status: dict):
    """Save scrape status to file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(STATUS_FILE, 'w', encoding='utf-8') as f:
        json.dump(status, f, ensure_ascii=False, indent=2)


VIBER_LOGIN_FAIL_THRESHOLD = MAX_LOGIN_FAILURES

def _record_login_failure(status: dict, source: str):
    """Increment login failure count and send a notification to Viber if threshold is reached."""
    status['login_fail_count'] = status.get('login_fail_count', 0) + 1
    fail_count = status['login_fail_count']
    logger.warning(f'SmartW Worker ({source}): Login failure #{fail_count}/{MAX_LOGIN_FAILURES}')
    
    # Notify Viber if threshold reached and notification not sent yet
    if fail_count >= VIBER_LOGIN_FAIL_THRESHOLD:
        if not status.get('viber_sso_error_sent'):
            msg = [
                "⚠️ *CẢNH BÁO: LỖI ĐĂNG NHẬP SSO SMARTW*",
                "------------",
                f"Hệ thống gặp lỗi đăng nhập SSO SmartW liên tiếp {fail_count} lần.",
                "Tác vụ tự động quét SmartW tạm thời không thể lấy dữ liệu mới.",
                "Tạm ngưng gửi các bản tin cảnh báo SmartW lên group Viber.",
                "------------",
                "👉 Vui lòng kiểm tra lại kết nối VPN Mobifone hoặc tài khoản/mật khẩu trong trang quản trị."
            ]
            try:
                _send_viber_report(msg)
                status['viber_sso_error_sent'] = True
                logger.info("SmartW Worker: Sent SSO login failure warning to Viber")
            except Exception as ve:
                logger.error(f"Failed to send SSO failure alert to Viber: {ve}")


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
    status['viber_sso_error_sent'] = False
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
    from smartw.scraper import SmartWScraper

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
            try:
                return future.result(timeout=1200)
            except (concurrent.futures.TimeoutError, TimeoutError):
                logger.error(f"SmartW Worker: ⏱️ Async task timed out after 1200s")
                # We can't easily kill the thread, but we can stop waiting for it
                return {'error': 'Hệ thống phản hồi chậm (Timeout 20m)'}
    except RuntimeError:
        return asyncio.run(coro_func())


def sync_alarms_to_supabase(result: dict):
    """Upsert scraped active/cleared alarms into Supabase smartw_alarms table,
    and automatically clear any stale active alarms that are no longer active in reality.
    """
    if not supabase:
        logger.warning("Supabase client not initialized, skipping DB sync.")
        return

    import uuid
    from datetime import datetime

    all_rows = []
    active_ids_in_scrape = set()
    
    def parse_to_iso(date_str):
        if not date_str:
            return None
        for fmt in ['%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M']:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.isoformat() + '+07:00'
            except ValueError:
                continue
        return None

    types = ['md', 'mpd', 'mll', 'mll_cell']
    for t in types:
        alarms_list = result.get(t, [])
        for alarm in alarms_list:
            site = (alarm.get('site') or '').strip()
            alarm_name = (alarm.get('alarmName') or '').strip()
            sdate_str = (alarm.get('sdateStr') or alarm.get('sdate_str') or '').strip()
            edate_str = (alarm.get('edateStr') or alarm.get('clear_time') or alarm.get('ket_thuc') or '').strip()
            
            if not site or not alarm_name or not sdate_str:
                continue
                
            sdate_iso = parse_to_iso(sdate_str)
            edate_iso = parse_to_iso(edate_str)
            
            # Construct a unique, deterministic ID using UUIDv5
            if t == 'mll_cell':
                cellid = (alarm.get('cellid') or '').strip()
                val_str = f"{t}_{site}_{cellid}_{alarm_name}_{sdate_str}"
            else:
                val_str = f"{t}_{site}_{alarm_name}_{sdate_str}"
                
            rec_id = str(uuid.uuid5(uuid.NAMESPACE_OID, val_str))
            status_val = "CLEARED" if edate_iso else "ACTIVE"
            
            if status_val == "ACTIVE":
                active_ids_in_scrape.add(rec_id)
                
            all_rows.append({
                "id": rec_id,
                "site": site,
                "network": alarm.get('network'),
                "cellid": alarm.get('cellid') if t == 'mll_cell' else None,
                "vendor": alarm.get('vendor'),
                "alarm_name": alarm_name,
                "alarm_type": t,
                "sdate": sdate_iso,
                "sdate_str": sdate_str,
                "edate": edate_iso,
                "edate_str": edate_str if edate_str else None,
                "duration": int(alarm.get('duration') or alarm.get('duaration') or alarm.get('minute') or 0),
                "status": status_val
            })

    if all_rows:
        try:
            chunk_size = 100
            for i in range(0, len(all_rows), chunk_size):
                chunk = all_rows[i:i+chunk_size]
                supabase.table("smartw_alarms").upsert(chunk).execute()
            logger.info(f"Supabase Sync: Upserted {len(all_rows)} active/cleared alarms.")
        except Exception as e:
            logger.error(f"Supabase Sync Error: Failed to upsert alarms: {e}")

    # 2. Automatically clear stale active alarms in Supabase.
    # Any alarm in Supabase with status = 'ACTIVE' that is NOT in the scraped active list must be cleared.
    try:
        res_supabase_active = supabase.table("smartw_alarms")\
            .select("id")\
            .eq("status", "ACTIVE")\
            .execute()
        supabase_active = res_supabase_active.data or []
        
        stale_ids = []
        for sa in supabase_active:
            sa_id = sa.get("id")
            if sa_id and sa_id not in active_ids_in_scrape:
                stale_ids.append(sa_id)
                
        if stale_ids:
            now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            now_iso = datetime.now().isoformat() + '+07:00'
            
            chunk_size = 50
            for i in range(0, len(stale_ids), chunk_size):
                batch = stale_ids[i:i+chunk_size]
                supabase.table("smartw_alarms")\
                    .update({
                        "status": "CLEARED",
                        "edate": now_iso,
                        "edate_str": now_str
                    })\
                    .in_("id", batch)\
                    .execute()
            logger.info(f"Supabase Sync: Marked {len(stale_ids)} stale active alarms as CLEARED.")
    except Exception as e:
        logger.error(f"Supabase Sync Error: Failed to clear stale alarms: {e}")


def upload_to_supabase_storage(local_path: str, destination_name: str):
    """Upload a local file to Supabase Storage smartw_data bucket."""
    if not supabase:
        logger.warning("Supabase client not initialized, skipping storage upload.")
        return
    try:
        with open(local_path, 'rb') as f:
            supabase.storage.from_("smartw_data").upload(
                path=destination_name,
                file=f,
                file_options={"x-upsert": "true", "cacheControl": "0", "cache_control": "0"}
            )
        logger.info(f"Supabase Storage: Uploaded {destination_name} successfully.")
    except Exception as e:
        logger.error(f"Supabase Storage Error: Failed to upload {destination_name}: {e}")


def save_vhkt_to_local_json(vhkt_raw: dict):
    """Save daily VHKT SLA records into a local JSON file and upload to Supabase storage."""
    if not vhkt_raw or not vhkt_raw.get('data'):
        return

    # Filter by TEAM_ALARM before saving
    from smartw.scraper import TEAM_ALARM
    filtered_data = [r for r in vhkt_raw.get('data', []) if TEAM_ALARM in (r.get('to_vt') or '')]

    payload = {
        "scraped_at": vhkt_raw.get('scraped_at') or datetime.now().isoformat(),
        "count": len(filtered_data),
        "data": filtered_data
    }

    local_path = os.path.join(DATA_DIR, 'vhkt_sla.json')
    try:
        with open(local_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        logger.info(f"Local Storage: Saved {len(filtered_data)} SLA records to vhkt_sla.json")
        
        # Upload to Supabase Storage
        upload_to_supabase_storage(local_path, 'vhkt_sla.json')
    except Exception as e:
        logger.error(f"Error saving/uploading VHKT SLA: {e}")



def send_daily_flapping_report(vhkt_data: list):
    """
    Analyzes VHKT (daily summary) data and sends a Viber report for:
    - Stations with flapping alarms (> 10 times) for MAC, GEN, or MLL.
    - Stations with MLL duration > 2 hours (> 120 minutes).
    """
    logger.info("SmartW Worker: 🕒 Starting daily flapping and long MLL report...")
    if not vhkt_data:
        logger.info("SmartW Worker: No VHKT data to analyze, skipping report.")
        return
        
    vhkt_data = [row for row in vhkt_data if _is_managed_site(row.get('tram') or '')]
    if not vhkt_data:
        logger.info("SmartW Worker: No TVT3 managed VHKT data to analyze, skipping report.")
        return
        
    sep = '------------'
    lines = ["📊 *BÁO CÁO CHẬP CHỜN & MLL KÉO DÀI (HÀNG NGÀY)* 📊"]
    lines.append(sep)
    
    mac_lines = []
    gen_lines = []
    mll_lines = []
    
    for row in vhkt_data:
        site = row.get('tram') or ''
        if not site:
            continue
            
        site_label = _get_site_label(site)
        
        # MAC (AC Fail)
        md_cnt = int(row.get('md_so_lan') or 0)
        if md_cnt > 10:
            mac_lines.append(f"  • {site_label} - {md_cnt} lần")
            
        # GEN (MPD)
        mpd_cnt = int(row.get('mpd_so_lan') or 0)
        if mpd_cnt > 10:
            gen_lines.append(f"  • {site_label} - {mpd_cnt} lần")
            
        # MLL
        mll_cnt = int(row.get('mll_so_lan') or 0)
        mll_duration = float(row.get('mll_phut') or 0.0)
        
        mll_reasons = []
        if mll_cnt > 10:
            mll_reasons.append(f"{mll_cnt} lần")
        if mll_duration > 120.0:
            mll_hours = round(mll_duration / 60.0, 1)
            mll_reasons.append(f"{mll_hours}h")
            
        if mll_reasons:
            mll_lines.append(f"  • {site_label} - {', '.join(mll_reasons)}")
            
    total_reported = len(mac_lines) + len(gen_lines) + len(mll_lines)
    
    if total_reported == 0:
        logger.info("SmartW Worker: No flapping or long MLL alarms found yesterday.")
        return

    # ── Section 1: MAC ──
    lines.append("⚡ *MAC (Chập chờn > 10 lần):*")
    if mac_lines:
        lines.extend(mac_lines)
    else:
        lines.append("  • Không có")
        
    lines.append("")
    
    # ── Section 2: GEN ──
    lines.append("🔋 *GEN (Chập chờn > 10 lần):*")
    if gen_lines:
        lines.extend(gen_lines)
    else:
        lines.append("  • Không có")
        
    lines.append("")
    
    # ── Section 3: MLL ──
    lines.append("📵 *MLL (Chập chờn > 10 lần hoặc MLL > 2h):*")
    if mll_lines:
        lines.extend(mll_lines)
    else:
        lines.append("  • Không có")
        
    lines.append(sep)
    
    _send_viber_report(lines)
    logger.info(f"SmartW Worker: ✅ Daily flapping and long MLL report sent ({total_reported} entries)")


def _get_val(row: dict, keys: list) -> str:
    for k in keys:
        if k in row:
            return str(row[k]).strip()
        for rk in row.keys():
            if rk.lower().strip() == k.lower().strip():
                return str(row[rk]).strip()
    return ""


def format_pakh_message(row: dict) -> str:
    so_thue_bao = row.get('soThueBao') or ''

    # Parse and format thoiGianGhiNhan (GMT+7)
    tg_nhan_raw = row.get('thoiGianGhiNhan') or row.get('tgTaoWo')
    tg_nhan = ""
    if tg_nhan_raw:
        try:
            from datetime import timezone, timedelta
            dt = datetime.fromisoformat(str(tg_nhan_raw).replace('Z', '+00:00'))
            dt_local = dt.astimezone(timezone(timedelta(hours=7)))
            tg_nhan = dt_local.strftime("%d/%m/%Y %H:%M:%S")
        except Exception:
            tg_nhan = str(tg_nhan_raw)

    tinh = row.get('tinhThanhPho') or ''
    xa = row.get('phuongXa') or ''
    dia_ban = f"{xa}, {tinh}".strip(', ')

    noi_dung = row.get('noiDungPhanAnh') or ''
    
    # Map Trạm/Cell to old/new ID using cache
    tram_cell = str(row.get('maTram') or '')
    tram_cell_display = tram_cell
    if tram_cell:
        try:
            data = _get_datasites_list()
            matched_site = None
            tram_upper = tram_cell.strip().upper()
            # Sort by site_id length desc to match the most specific site first
            for s in sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True):
                s_id = (s.get("site_id") or "").upper()
                s_old = (s.get("site_id_old") or "").upper()
                if s_id and tram_upper.startswith(s_id):
                    matched_site = s
                    break
                if s_old and tram_upper.startswith(s_old):
                    matched_site = s
                    break
            if matched_site:
                s_id = matched_site.get("site_id") or ""
                s_old = matched_site.get("site_id_old") or ""
                if s_old and s_id != s_old:
                    tram_cell_display = f"{tram_cell} ({s_id} / {s_old})"
                elif s_id:
                    tram_cell_display = f"{tram_cell} ({s_id})"
        except Exception as e:
            logger.error(f'SmartW format_pakh_message site mapping error: {e}')

    han_con_lai = row.get('tgclTtml') or row.get('tgConLai') or ''

    msg = f"""- PAKH: {so_thue_bao}
- THỜI GIAN NHẬN: {tg_nhan}
- ĐỊA BÀN: {dia_ban}
- NỘI DUNG PHẢN ÁNH: {noi_dung}
- TRẠM / CELL: {tram_cell_display}
- HẠN CÒN LẠI: {han_con_lai}"""
    return msg


def format_pakh_reminder_message(row: dict) -> str:
    so_thue_bao = row.get('soThueBao') or ''
    tinh = row.get('tinhThanhPho') or ''
    xa = row.get('phuongXa') or ''
    dia_ban = f"{xa}, {tinh}".strip(', ')
    
    # Map Trạm/Cell to old/new ID using cache
    tram_cell = str(row.get('maTram') or '')
    tram_cell_display = tram_cell
    if tram_cell:
        try:
            data = _get_datasites_list()
            matched_site = None
            tram_upper = tram_cell.strip().upper()
            for s in sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True):
                s_id = (s.get("site_id") or "").upper()
                s_old = (s.get("site_id_old") or "").upper()
                if s_id and tram_upper.startswith(s_id):
                    matched_site = s
                    break
                if s_old and tram_upper.startswith(s_old):
                    matched_site = s
                    break
            if matched_site:
                s_id = matched_site.get("site_id") or ""
                s_old = matched_site.get("site_id_old") or ""
                if s_old and s_id != s_old:
                    tram_cell_display = f"{tram_cell} ({s_id} / {s_old})"
                elif s_id:
                    tram_cell_display = f"{tram_cell} ({s_id})"
        except Exception as e:
            logger.error(f'SmartW format_pakh_reminder_message site mapping error: {e}')

    han_con_lai = row.get('tgclTtml') or row.get('tgConLai') or ''

    msg = f"""- SĐT PHẢN ÁNH: {so_thue_bao}
- ĐỊA BÀN: {dia_ban}
- TRẠM / CELL: {tram_cell_display}
- HẠN CÒN LẠI: {han_con_lai}"""
    return msg


def format_pakh_closed_message(c_id: str, details: dict) -> str:
    so_thue_bao = details.get("soThueBao") or ""
    tinh = details.get("tinhThanhPho") or ""
    xa = details.get("phuongXa") or ""
    dia_ban = f"{xa}, {tinh}".strip(', ')
    
    tram_cell = str(details.get("maTram") or "")
    tram_cell_display = tram_cell
    if tram_cell:
        try:
            data = _get_datasites_list()
            matched_site = None
            tram_upper = tram_cell.strip().upper()
            for s in sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True):
                s_id = (s.get("site_id") or "").upper()
                s_old = (s.get("site_id_old") or "").upper()
                if s_id and tram_upper.startswith(s_id):
                    matched_site = s
                    break
                if s_old and tram_upper.startswith(s_old):
                    matched_site = s
                    break
            if matched_site:
                s_id = matched_site.get("site_id") or ""
                s_old = matched_site.get("site_id_old") or ""
                if s_old and s_id != s_old:
                    tram_cell_display = f"{tram_cell} ({s_id} / {s_old})"
                elif s_id:
                    tram_cell_display = f"{tram_cell} ({s_id})"
        except Exception as e:
            logger.error(f'SmartW format_pakh_closed_message site mapping error: {e}')

    msg = f"""✅ *PAKH ĐÃ ĐÓNG / XỬ LÝ XONG*

- SĐT PHẢN ÁNH: {so_thue_bao}
- ĐỊA BÀN: {dia_ban}
- TRẠM / CELL: {tram_cell_display}"""
    return msg


def parse_vietnamese_duration(duration_str: str) -> int:
    """Parse Vietnamese duration string (e.g. '22 giờ 37 phút', '3 giờ', '15 phút') to total seconds."""
    if not duration_str:
        return None
    import re
    duration_str = duration_str.strip().lower()
    if 'quá hạn' in duration_str or 'qua han' in duration_str:
        return 0
    
    hours = 0
    minutes = 0
    
    h_match = re.search(r'(\d+)\s*(giờ|g|h)', duration_str)
    if h_match:
        hours = int(h_match.group(1))
        
    m_match = re.search(r'(\d+)\s*(phút|p|phut)', duration_str)
    if m_match:
        minutes = int(m_match.group(1))
        
    if not h_match and not m_match:
        digits = re.findall(r'\d+', duration_str)
        if digits:
            minutes = int(digits[0])
            
    return hours * 3600 + minutes * 60


def _is_pakh_closed(row: dict) -> bool:
    """Check if the PAKH ticket has been processed/closed based on nocStatus or trangThaiWo."""
    noc_status = str(row.get('nocStatus') or '').strip().upper()
    trang_thai_wo = str(row.get('trangThaiWo') or '').strip().upper()
    
    # NOC status DA_XU_LY means NOC has forwarded the ticket to TVT3, so it is NOT closed yet.
    closed_noc_statuses = {'DA_DONG', 'CHO_DUYET_DONG', 'DUYET_DONG', 'HOAN_THANH'}
    closed_wo_statuses = {'DA_XU_LY', 'DA_DONG', 'CHO_DUYET_DONG', 'DUYET_DONG', 'HOAN_THANH'}
    
    return noc_status in closed_noc_statuses or trang_thai_wo in closed_wo_statuses


def process_pakh_alerts(pakh_list: list, job_type: str = 'pakh'):
    """Process scraped PAKH list: detect new tickets and expiring tickets, and alert to Viber."""
    state_file = os.path.join(DATA_DIR, 'pakh_sent_alerts.json')
    
    # Load Viber configuration dynamically
    pakh_token = None
    pakh_sender = None
    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                pakh_token = cfg.get('viber_bot_token_pakh')
                pakh_sender = cfg.get('viber_sender_id_pakh')
        except Exception as ce:
            logger.warning(f"Failed to load Viber config for PAKH alerts: {ce}")
            
    # Default fallback to original hardcoded pakh bot token if not configured at all
    if not pakh_token:
        pakh_token = "56b57ae5bbb11e4f-b8084d4fec7bf6ee-e681b83f2f40f110"
        pakh_sender = "7DjCba+6SC7OvtozmG+ySQ=="
    
    # Load state
    state = {
        "alerted_new": [],
        "alerted_expiring": [],
        "alerted_expiring_milestones": {},
        "alerted_details": {},
        "newly_added_since_last_hour": [],
        "closed_since_last_hour": [],
        "closed_since_last_summary": []
    }
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                state = json.load(f)
                state.setdefault("alerted_new", [])
                state.setdefault("alerted_expiring", [])
                state.setdefault("alerted_expiring_milestones", {})
                state.setdefault("alerted_details", {})
                state.setdefault("newly_added_since_last_hour", [])
                state.setdefault("closed_since_last_hour", [])
                state.setdefault("closed_since_last_summary", [])
        except Exception:
            pass

    changed = False

    # Ensure all IDs in alerted_new are strings for consistent comparison
    state["alerted_new"] = [str(x) for x in state["alerted_new"]]
    milestones_dict = state.setdefault("alerted_expiring_milestones", {})

    # Helper function to format trạm mới / cũ
    def get_site_display(ma_tram):
        tram_cell_display = ma_tram
        if ma_tram:
            try:
                data = _get_datasites_list()
                matched_site = None
                tram_upper = ma_tram.strip().upper()
                for s in sorted(data, key=lambda x: len(x.get('site_id') or ''), reverse=True):
                    s_id = (s.get("site_id") or "").upper()
                    s_old = (s.get("site_id_old") or "").upper()
                    if s_id and tram_upper.startswith(s_id):
                        matched_site = s
                        break
                    if s_old and tram_upper.startswith(s_old):
                        matched_site = s
                        break
                if matched_site:
                    s_id = matched_site.get("site_id") or ""
                    s_old = matched_site.get("site_id_old") or ""
                    if s_old and s_id != s_old:
                        tram_cell_display = f"{ma_tram} ({s_id} / {s_old})"
                    elif s_id:
                        tram_cell_display = f"{ma_tram} ({s_id})"
            except Exception as e:
                logger.error(f'SmartW site mapping error: {e}')
        return tram_cell_display

    # Identify active and closed tickets from the current pakh_list
    active_ids = set()
    for row in pakh_list:
        pakh_id = _get_val(row, ['pakh', 'ma_pa', 'maPa', 'mã pa', 'id', 'ticket_id', 'ticketId', 'soPhanAnh', 'sđt', 'sdt', 'soThueBao'])
        if not pakh_id:
            continue
        pakh_id_str = str(pakh_id)
        
        # Check if site is managed by TVT3
        ma_tram = row.get('maTram') or ''
        if not _is_managed_site(ma_tram):
            continue

        if not _is_pakh_closed(row):
            active_ids.add(pakh_id_str)

        # Track details
        current_detail = state["alerted_details"].get(pakh_id_str, {})
        new_detail = {
            "soThueBao": row.get('soThueBao') or '',
            "maTram": row.get('maTram') or '',
            "tinhThanhPho": row.get('tinhThanhPho') or '',
            "phuongXa": row.get('phuongXa') or row.get('phuong_xa') or ''
        }
        if current_detail != new_detail:
            state["alerted_details"][pakh_id_str] = new_detail
            changed = True

        # Check for NEW tickets
        if pakh_id_str not in state["alerted_new"] and not _is_pakh_closed(row):
            state["alerted_new"].append(pakh_id_str)
            if pakh_id_str not in state["newly_added_since_last_hour"]:
                state["newly_added_since_last_hour"].append(pakh_id_str)
            changed = True

        # 2. Alert for expiring tickets (milestones: 16h, 8h, 2h) - only if not closed/processed
        remaining = None
        
        # Try parsing remaining duration from tgclTtml first (correct SLA for TTML/province), fallback to tgConLai
        tg_con_lai = _get_val(row, ['tgclTtml', 'tgConLai', 'tg_con_lai', 'thoiGianConLai'])
        if tg_con_lai:
            remaining = parse_vietnamese_duration(tg_con_lai)
            
        # Fallback to datetime deadline parsing if tgConLai is not available
        if remaining is None:
            tg_kt_str = _get_val(row, ['tg_kt', 'thoiGianKetThuc', 'ngayKetThuc', 'deadline', 'thời gian kết thúc', 'ngày kết thúc', 'hạn xử lý', 'edate', 'edateStr'])
            if tg_kt_str:
                kt_dt = parse_dt(tg_kt_str)
                if kt_dt:
                    now = datetime.now()
                    remaining = (kt_dt - now).total_seconds()

        if remaining is not None and not _is_pakh_closed(row):
            # Determine current milestone
            milestone = None
            auto_complete_milestones = []
            if 0 < remaining <= 2 * 3600:
                milestone = "2h"
                auto_complete_milestones = ["2h", "8h", "16h"]
            elif 2 * 3600 < remaining <= 8 * 3600:
                milestone = "8h"
                auto_complete_milestones = ["8h", "16h"]
            elif 8 * 3600 < remaining <= 16 * 3600:
                milestone = "16h"
                auto_complete_milestones = ["16h"]
                
            if milestone:
                already_sent = milestones_dict.get(pakh_id_str, [])
                if milestone not in already_sent:
                    milestone_lbl = "16" if milestone == "16h" else "8" if milestone == "8h" else "2"
                    msg = f"⏰ *CẢNH BÁO: PAKH CÒN {milestone_lbl} GIỜ XỬ LÝ (DEADLINE {milestone_lbl}H)*\n\n" + format_pakh_reminder_message(row)
                    _send_viber_report(msg.split('\n'), token=pakh_token, sender=pakh_sender)
                    
                    # Add new milestone + auto-complete higher ones to avoid duplicates
                    for m in auto_complete_milestones:
                        if m not in already_sent:
                            already_sent.append(m)
                    milestones_dict[pakh_id_str] = already_sent
                    changed = True

    # 3. Detect closed tickets (either missing from list, or present but marked as closed/processed)
    active_ids = set()
    for row in pakh_list:
        pakh_id = _get_val(row, ['pakh', 'ma_pa', 'maPa', 'mã pa', 'id', 'ticket_id', 'ticketId', 'soPhanAnh', 'sđt', 'sdt', 'soThueBao'])
        if pakh_id:
            ma_tram = row.get('maTram') or ''
            if _is_managed_site(ma_tram) and not _is_pakh_closed(row):
                active_ids.add(str(pakh_id))

    # Identify newly CLOSED tickets
    closed_ids = []
    for alerted_id in state["alerted_new"]:
        if alerted_id not in active_ids:
            closed_ids.append(alerted_id)

    if closed_ids:
        for c_id in closed_ids:
            if c_id in state["alerted_new"]:
                state["alerted_new"].remove(c_id)
            state["alerted_expiring_milestones"].pop(c_id, None)
            
            # Track closed lists
            if c_id not in state["closed_since_last_hour"]:
                state["closed_since_last_hour"].append(c_id)
            if c_id not in state["closed_since_last_summary"]:
                state["closed_since_last_summary"].append(c_id)
            changed = True

    # Job-specific alert dispatch logic
    if job_type == 'pakh_delta':
        # Báo cáo lẻ: mới/đóng trong giờ qua
        lines = ["🔔 *BÁO CÁO NHANH PAKH (CẬP NHẬT TRONG GIỜ)*\n"]
        has_content = False

        if state["newly_added_since_last_hour"]:
            lines.append("🆕 *Phiếu mới phát sinh:*")
            for n_id in state["newly_added_since_last_hour"]:
                det = state["alerted_details"].get(n_id, {})
                sdt = det.get("soThueBao") or "SĐT --"
                tram = get_site_display(det.get("maTram") or "")
                lines.append(f"  • SĐT: `{sdt}` - Trạm: `{tram}`")
            has_content = True

        if state["closed_since_last_hour"]:
            if has_content:
                lines.append("")
            lines.append("✅ *Phiếu đã xử lý xong:*")
            for c_id in state["closed_since_last_hour"]:
                det = state["alerted_details"].get(c_id, {})
                sdt = det.get("soThueBao") or "SĐT --"
                tram = get_site_display(det.get("maTram") or "")
                lines.append(f"  • SĐT: `{sdt}` - Trạm: `{tram}`")
            has_content = True

        if has_content:
            _send_viber_report(lines, token=pakh_token, sender=pakh_sender)
            logger.info("Viber Alert: Sent PAKH delta (hourly) report")
        else:
            logger.info("Viber Alert: No changes in PAKH delta this hour, skipped report")

        # Clear delta state
        state["newly_added_since_last_hour"] = []
        state["closed_since_last_hour"] = []
        changed = True

    elif job_type == 'pakh_summary':
        # Báo cáo chung:
        # Tin nhắn 1: Danh sách chưa xử lý (tồn đọng)
        active_tickets = []
        for row in pakh_list:
            pakh_id = _get_val(row, ['pakh', 'ma_pa', 'maPa', 'mã pa', 'id', 'ticket_id', 'ticketId', 'soPhanAnh', 'sđt', 'sdt', 'soThueBao'])
            if not pakh_id:
                continue
            pakh_id_str = str(pakh_id)
            if pakh_id_str in active_ids:
                active_tickets.append(row)

        if active_tickets:
            lines1 = ["⏳ *TỔNG HỢP PAKH CHƯA XỬ LÝ (TỒN ĐỌNG)*\n"]
            for row in active_tickets:
                sdt = row.get("soThueBao") or "SĐT --"
                ma_tram = row.get("maTram") or ""
                tram = get_site_display(ma_tram)
                tg_con_lai = row.get("tgConLai") or "N/A"
                lines1.append(f"• SĐT: `{sdt}` - Trạm: `{tram}`\n  ⏳ Hạn còn lại: `{tg_con_lai}`")
            _send_viber_report(lines1, token=pakh_token, sender=pakh_sender)
            logger.info("Viber Alert: Sent PAKH summary (unresolved) report")
        else:
            _send_viber_report(["⏳ *TỔNG HỢP PAKH CHƯA XỬ LÝ (TỒN ĐỌNG)*\n\n- Không có phiếu tồn đọng nào. 🎉"], token=pakh_token, sender=pakh_sender)
            logger.info("Viber Alert: No unresolved tickets, sent empty summary report")

        # Tin nhắn 2: Tổng hợp các phiếu đã xử lý (đóng) trong 2 giờ qua
        if state["closed_since_last_summary"]:
            lines2 = ["✅ *TỔNG HỢP PAKH ĐÃ XỬ LÝ (TRONG 2 GIỜ QUA)*\n"]
            for c_id in state["closed_since_last_summary"]:
                det = state["alerted_details"].get(c_id, {})
                sdt = det.get("soThueBao") or "SĐT --"
                tram = get_site_display(det.get("maTram") or "")
                lines2.append(f"• SĐT: `{sdt}` - Trạm: `{tram}`")
            _send_viber_report(lines2, token=pakh_token, sender=pakh_sender)
            logger.info("Viber Alert: Sent PAKH summary (resolved) report")

        # Clear state variables after summary report
        state["closed_since_last_summary"] = []
        state["newly_added_since_last_hour"] = []
        state["closed_since_last_hour"] = []
        changed = True

    # Limit state size to prevent infinite growth
    for key in ["alerted_new", "alerted_expiring", "newly_added_since_last_hour", "closed_since_last_hour", "closed_since_last_summary"]:
        if key in state and len(state[key]) > 500:
            state[key] = state[key][-500:]
            changed = True
    if len(state["alerted_expiring_milestones"]) > 500:
        keys_to_keep = list(state["alerted_expiring_milestones"].keys())[-500:]
        state["alerted_expiring_milestones"] = {k: state["alerted_expiring_milestones"][k] for k in keys_to_keep}
        changed = True
    if len(state["alerted_details"]) > 500:
        keys_to_keep = list(state["alerted_details"].keys())[-500:]
        state["alerted_details"] = {k: state["alerted_details"][k] for k in keys_to_keep}
        changed = True

    if changed:
        try:
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save PAKH alerts state: {e}")


def save_pakh_to_storage(pakh_list: list):
    """Save scraped PAKH tickets to pakh.json and upload to Supabase storage."""
    if pakh_list is None:
        pakh_list = []
        
    # Filter out closed/processed tickets so that only active ones are saved/uploaded
    active_pakh = [row for row in pakh_list if not _is_pakh_closed(row)]
        
    local_path = os.path.join(DATA_DIR, 'pakh.json')
    try:
        # Save to local JSON first
        payload = {
            "scraped_at": datetime.now().isoformat(),
            "count": len(active_pakh),
            "data": active_pakh
        }
        with open(local_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        logger.info(f"Local Storage: Saved {len(active_pakh)} active PAKH tickets to pakh.json")
        
        # Upload to Supabase Storage
        upload_to_supabase_storage(local_path, 'pakh.json')
    except Exception as e:
        logger.error(f"Error saving/uploading PAKH: {e}")



def run_pakh_poll(job_type: str = 'pakh'):
    """Poll PAKH reports and send Viber alerts for new or near-expiration tickets."""
    if not _acquire_lock():
        return

    from smartw.config import load_smartw_config
    config = load_smartw_config()
    if not config:
        logger.warning('SmartW Worker: Not configured, skipping PAKH poll')
        return

    # Circuit breaker
    status = _load_status()
    fail_count = status.get('login_fail_count', 0)
    if fail_count >= MAX_LOGIN_FAILURES:
        logger.warning(f'SmartW Worker: PAKH polling PAUSED — {fail_count} login failures.')
        return

    _is_running = True

    async def _do_pakh_poll():
        scraper = await _get_or_create_scraper(config['username'], config['password'])
        if not scraper:
            return {'error': 'Login thất bại'}

        results = {}
        try:
            await scraper._ensure_login()
            results['pakh'] = await scraper.scrape_pakh()
            results['status'] = 'success'
            results['scraped_at'] = datetime.now().isoformat()
        except Exception as e:
            err_str = str(e)
            logger.error(f'SmartW PAKH Scrape Error: {err_str}')

            # Retry once on browser crash
            crash_keywords = ['NoneType', 'send', 'closed', 'Target page']
            if any(kw in err_str for kw in crash_keywords):
                logger.info('SmartW Worker: PAKH browser crash — retrying...')
                await _destroy_scraper()
                try:
                    scraper = await _get_or_create_scraper(config['username'], config['password'])
                    if scraper:
                        await scraper._ensure_login()
                        results['pakh'] = await scraper.scrape_pakh()
                        results['status'] = 'success'
                        results['scraped_at'] = datetime.now().isoformat()
                    else:
                        results['error'] = 'Login thất bại (retry)'
                except Exception as retry_err:
                    results['error'] = str(retry_err)
                    await _destroy_scraper()
            else:
                results['error'] = err_str
                await _destroy_scraper()
        return results

    try:
        logger.info(f'⏰ SmartW Worker: Starting PAKH poll ({job_type}) at {datetime.now()}')
        result = _run_async(_do_pakh_poll) or {}

        if result.get('error'):
            logger.error(f'SmartW Worker: ❌ PAKH: {result["error"]}')
            status['errors'].append({
                'time': datetime.now().isoformat(),
                'error': f'PAKH: {result["error"]}',
                'source': 'pakh'
            })
            status['errors'] = status['errors'][-10:]
            err_lower = result['error'].lower()
            if any(kw in err_lower for kw in ['login', 'credentials']):
                _record_login_failure(status, 'pakh')
        else:
            status['login_fail_count'] = 0
            status['viber_sso_error_sent'] = False

            # Clear stale errors on success
            status['errors'] = [
                e for e in status['errors']
                if e.get('source') != 'pakh'
            ]

            pakh_list = result.get('pakh', [])
            process_pakh_alerts(pakh_list, job_type)
            try:
                save_pakh_to_storage(pakh_list)
            except Exception as e:
                logger.error(f"Error saving/uploading PAKH: {e}")

        status['last_pakh_poll'] = datetime.now().isoformat()

    except Exception as e:
        logger.error(f'SmartW Worker: ❌ PAKH unexpected error: {e}')
        status['errors'].append({
            'time': datetime.now().isoformat(),
            'error': str(e),
            'source': 'pakh'
        })
        status['errors'] = status['errors'][-10:]
    finally:
        _save_status(status)
        _release_lock()


def check_and_alert_flapping(all_new_alarms: dict):
    """
    Check if any site is experiencing flapping alarms (firing multiple times a day).
    Only checks for: 'md' (Mất AC), 'mll' (Mất liên lạc), and 'mpd' (Chạy máy phát).
    Threshold: 3 or more times a day.
    Saves state locally in data/smartw/alarm_history_today.json.
    """
    history_file = os.path.join(DATA_DIR, 'alarm_history_today.json')
    today_str = datetime.now().strftime('%Y-%m-%d')
    
    # Load existing history
    history_data = {"date": today_str, "history": [], "alerted": {}}
    if os.path.exists(history_file):
        try:
            with open(history_file, 'r', encoding='utf-8') as f:
                loaded = json.load(f)
                if loaded.get("date") == today_str:
                    history_data = loaded
                    if "alerted" not in history_data:
                        history_data["alerted"] = {}
        except Exception as e:
            logger.error(f"Failed to load alarm history: {e}")

    changed = False
    flapping_alerts = []

    # Map table_type to human-readable name
    type_names = {
        'md': 'Mất điện lưới (AC Fail)',
        'mll': 'Mất liên lạc (MLL)',
        'mpd': 'Chạy máy phát điện (MPD)'
    }

    # Process newly fired alarms
    for ttype in ['md', 'mll', 'mpd']:
        new_list = all_new_alarms.get(ttype, [])
        for alarm in new_list:
            site = _site_key(alarm)
            if site == 'Unknown':
                continue
            if not _is_managed_site(site):
                continue
                
            event_time = datetime.now().isoformat()
            history_data["history"].append({
                "site": site,
                "type": ttype,
                "time": event_time
            })
            changed = True

            # Count occurrences today
            count = sum(1 for item in history_data["history"] if item["site"] == site and item["type"] == ttype)
            
            # Check threshold (>= 3 times)
            if count >= 3:
                # Alert once per site and alarm type per day (prevent spamming 4, 5, etc. times)
                alert_key = f"{site}_{ttype}"
                if alert_key not in history_data["alerted"]:
                    site_label = _get_site_label(site)
                    alarm_name = type_names.get(ttype, ttype)
                    
                    message = [
                        "⚠️ *CẢNH BÁO CHẬP CHỜN (FLAPPING ALARM)*",
                        "------------",
                        f"Trạm {site_label} đang có hiện tượng chập chờn cảnh báo:",
                        f"• **Loại cảnh báo:** `{alarm_name}`",
                        f"• **Số lần xuất hiện hôm nay:** `{count} lần`"
                    ]
                    flapping_alerts.append(message)
                    history_data["alerted"][alert_key] = True

    if changed:
        try:
            with open(history_file, 'w', encoding='utf-8') as f:
                json.dump(history_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save alarm history: {e}")

    # Send alerts if any
    for msg in flapping_alerts:
        _send_viber_report(msg)



# sync_status_to_supabase removed (no longer syncing status to Supabase)


def run_alarm_poll():
    """Poll MĐ + MPĐ + MLL active alarms.
    Called by APScheduler every 15 minutes.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    if not _acquire_lock():
        return

    from smartw.config import load_smartw_config
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

        result = _run_async(_do_alarm_poll) or {}
        
        # If result is None or empty, ensure it's a dict
        if not isinstance(result, dict):
            result = {'error': 'Kết quả trả về không hợp lệ'}

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
                _record_login_failure(status, 'alarm')
        else:
            logger.info(f'SmartW Worker: ✅ Alarm poll done — '
                        f'MĐ: {len(result.get("md", []))}, '
                        f'MPĐ: {len(result.get("mpd", []))}, '
                        f'MLL: {len(result.get("mll", []))}, '
                        f'MLL Cell: {len(result.get("mll_cell", []))}')

            # Login succeeded → reset failure counter
            status['login_fail_count'] = 0
            status['viber_sso_error_sent'] = False

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

            # Real-time flapping alerts disabled (replaced by morning daily report based on VHKT summary)
            # if all_new:
            #     check_and_alert_flapping(all_new)

            if all_new or all_cleared:
                sep = '------------'
                
                # Filter for real-time reporting (skip mll_cell)
                new_md = [a for a in all_new.get('md', []) if _is_managed_site(_site_key(a))]
                new_mpd = [a for a in all_new.get('mpd', []) if _is_managed_site(_site_key(a))]
                new_mll = [a for a in all_new.get('mll', []) if _is_managed_site(_site_key(a))]
                
                cl_md = [a for (t, a) in all_cleared if t == 'md' and _is_managed_site(_site_key(a))]
                cl_mpd = [a for (t, a) in all_cleared if t == 'mpd' and _is_managed_site(_site_key(a))]
                cl_mll = [a for (t, a) in all_cleared if t == 'mll' and _is_managed_site(_site_key(a))]

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
                        mac_groups = {}
                        for alarm in new_md:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=False)
                            if site not in mac_groups:
                                mac_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
                            if net and net not in mac_groups[site]['nets']:
                                mac_groups[site]['nets'].append(net)
                        for site, grp in mac_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")
                    
                    if new_mpd:
                        lines.append("🔋 *GEN:*")
                        mpd_groups = {}
                        for alarm in new_mpd:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=False)
                            if site not in mpd_groups:
                                mpd_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
                            if net and net not in mpd_groups[site]['nets']:
                                mpd_groups[site]['nets'].append(net)
                        for site, grp in mpd_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")

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
                        cl_mac_groups = {}
                        for alarm in cl_md:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            clear_t = _fmt_sdate(alarm.get('clear_time') or alarm.get('edateStr') or '', full=False)
                            if site not in cl_mac_groups:
                                cl_mac_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': clear_t}
                            if net and net not in cl_mac_groups[site]['nets']:
                                cl_mac_groups[site]['nets'].append(net)
                        for site, grp in cl_mac_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")

                    if cl_mpd:
                        lines.append("🔋 *GEN:*")
                        cl_mpd_groups = {}
                        for alarm in cl_mpd:
                            site = _site_key(alarm)
                            net = _norm_net(alarm.get('network') or '')
                            clear_t = _fmt_sdate(alarm.get('clear_time') or alarm.get('edateStr') or '', full=False)
                            if site not in cl_mpd_groups:
                                cl_mpd_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': clear_t}
                            if net and net not in cl_mpd_groups[site]['nets']:
                                cl_mpd_groups[site]['nets'].append(net)
                        for site, grp in cl_mpd_groups.items():
                            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
                            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")

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
        # Sync to Supabase
        from smartw.scraper import load_cached_data
        md_raw = (load_cached_data('md') or {}).get('data', [])
        md_cl = (load_cached_data('md_cleared') or {}).get('data', [])
        
        mpd_raw = (load_cached_data('mpd') or {}).get('data', [])
        mpd_cl = (load_cached_data('mpd_cleared') or {}).get('data', [])
        
        mll_raw = (load_cached_data('mll') or {}).get('data', [])
        mll_cl = (load_cached_data('mll_cleared') or {}).get('data', [])
        
        mll_cell_raw = (load_cached_data('mll_cell') or {}).get('data', [])
        mll_cell_cl = (load_cached_data('mll_cell_cleared') or {}).get('data', [])

        compiled_result = {
            'md': md_raw + md_cl,
            'mpd': mpd_raw + mpd_cl,
            'mll': mll_raw + mll_cl,
            'mll_cell': mll_cell_raw + mll_cell_cl
        }
        sync_alarms_to_supabase(compiled_result)

        _sse_broadcast('scrape_done', {
            'scraped_at': status.get('last_alarm_poll'),
            'last_poll': datetime.now().strftime('%H:%M'),
            'status': 'configured',
            'md_count': len([r for r in md_raw if not r.get('edate')]),
            'mpd_count': len([r for r in mpd_raw if not r.get('edate')]),
            'mll_count': len(mll_raw),
            'mll_cell_count': len(mll_cell_raw),
            'has_error': bool(result.get('error')) if 'result' in dir() else False
        })


def run_vhkt_poll(target_date: str = None):
    """Poll VHKT daily summary.
    Called by APScheduler once at 5:00 AM.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    if not _acquire_lock():
        return

    from smartw.config import load_smartw_config
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

            results['vhkt'] = await scraper.scrape_vhkt(target_date)
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
                        results['vhkt'] = await scraper.scrape_vhkt(target_date)
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
                _record_login_failure(status, 'vhkt')
        else:
            logger.info(f'SmartW Worker: ✅ VHKT poll done — {len(result.get("vhkt", []))} records')

            # Login succeeded → reset failure counter
            status['login_fail_count'] = 0
            status['viber_sso_error_sent'] = False

            # Clear stale VHKT errors on success
            status['errors'] = [
                e for e in status['errors']
                if e.get('source') != 'vhkt'  # keep non-vhkt errors
            ]

            # Trigger daily flapping & long MLL report
            try:
                send_daily_flapping_report(result.get('vhkt', []))
            except Exception as report_err:
                logger.error(f"Error sending daily flapping report: {report_err}")

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
        _save_status(status)
        _release_lock()
        from smartw.scraper import load_cached_data
        vhkt_raw = load_cached_data('vhkt')
        save_vhkt_to_local_json(vhkt_raw)


def run_mfd_import_poll(target_date: str = None):
    """Daily MFĐ reports scrape + auto-import into GeneratorLog.
    Called by APScheduler at 6:00 AM (scrapes yesterday's data).
    Can also be triggered manually with a specific date.

    Args:
        target_date: Optional date string (DD/MM/YYYY). Default: yesterday.
    """
    if not _acquire_lock():
        return {'error': 'Worker busy'}

    from smartw.config import load_smartw_config
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
                _record_login_failure(status, 'mfd_import')
        else:
            # Scrape OK → run import logic (needs Flask app context)
            status['login_fail_count'] = 0
            status['viber_sso_error_sent'] = False
            raw_data = scrape_result.get('data', [])

            if raw_data:
                from smartw.mfd_import import import_mfd_data, update_incomplete_records

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
                        from smartw.mfd_import import update_incomplete_records
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
        _save_status(status)
        _release_lock()

    return import_result


# ── DataSite Export Sync Worker ───────────────────────────────────
# Phase 03: Background job that uses the DataSite Export modal to
# bulk-download data by object name and upsert into DB.
# ─────────────────────────────────────────────────────────────────

# Track if DataSite deep sync is currently running
_datasite_sync_running = False
_datasite_sync_status: dict = {}  # Live progress dict


def run_datasite_export_sync(objects: list, area: str = None):
    pass


def get_datasite_sync_status() -> dict:
    return {}


def upsert_datasite_rows(object_name: str, rows: list) -> int:
    return 0


def send_periodic_full_report():
    """Send a full status report to Viber Channel (Periodic 2-hour Review).
    Explicitly triggered by scheduler even if no changes occur.
    """
    logger.info("SmartW Worker: 🕒 Starting periodic 2-hour review report...")
    
    # 1. Load latest active data from disk
    md_list = [r for r in _load_smartw_json('md.json') if _is_managed_site(_site_key(r))]
    mpd_list = [r for r in _load_smartw_json('mpd.json') if _is_managed_site(_site_key(r))]
    mll_list = [r for r in _load_smartw_json('mll.json') if _is_managed_site(_site_key(r))]
    cell_list = [r for r in _load_smartw_json('mll_cell.json') if _is_managed_site(_site_key(r))]
    
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
        mac_groups = {}
        for alarm in md_list:
            site = _site_key(alarm)
            net = _norm_net(alarm.get('network') or '')
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            if site not in mac_groups:
                mac_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
            if net and net not in mac_groups[site]['nets']:
                mac_groups[site]['nets'].append(net)
        for site, grp in mac_groups.items():
            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")
            total_active += 1

    # ── Section 2: GEN ──
    if mpd_list:
        lines.append("🔋 *GEN:*")
        mpd_groups = {}
        for alarm in mpd_list:
            site = _site_key(alarm)
            net = _norm_net(alarm.get('network') or '')
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            if site not in mpd_groups:
                mpd_groups[site] = {'label': _get_site_label(site), 'nets': [], 't': t}
            if net and net not in mpd_groups[site]['nets']:
                mpd_groups[site]['nets'].append(net)
        for site, grp in mpd_groups.items():
            net_part = f" [{', '.join(sorted(grp['nets']))}]" if grp['nets'] else ""
            lines.append(f"  • {grp['label']}{net_part} - {grp['t']}")
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
            old_id = _old_id(site)
            old_part = f" ({old_id})" if old_id and old_id != site else ""
            net = _norm_net(alarm.get('network') or '')
            t = _fmt_sdate(alarm.get('sdateStr') or alarm.get('sdate_str') or '', full=True)
            net_part = f" [{net}]" if net else ''
            display_cid = str(alarm.get('cellid') or alarm.get('cell_id') or cid)
            lines.append(f"  • {display_cid}{old_part}{net_part} - {t}")
            total_active += 1

    if total_active > 0:
        _send_viber_report(lines)
        logger.info(f"SmartW Worker: ✅ Periodic report sent ({total_active} active alarms)")
    else:
        logger.info("SmartW Worker: 🏠 No active alarms, skipping periodic report.")


if __name__ == '__main__':
    import argparse
    # Configure basic logging if running as a script
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    parser = argparse.ArgumentParser(description="SmartW Worker")
    parser.add_argument('--job', type=str, default='alarm', choices=['alarm', 'vhkt', 'mfd', 'report', 'pakh', 'pakh_delta', 'pakh_summary'],
                        help="Job to run (alarm, vhkt, mfd, report, pakh, pakh_delta, pakh_summary)")
    parser.add_argument('--date', type=str, default=None,
                        help="Target date for mfd job (YYYY-MM-DD)")
    args = parser.parse_args()
    
    if args.job == 'alarm':
        logger.info("Executing alarm poll job...")
        run_alarm_poll()
    elif args.job == 'vhkt':
        target_date = None
        if args.date:
            try:
                if '-' in args.date:
                    from datetime import datetime as _dt
                    target_date = _dt.strptime(args.date, '%Y-%m-%d').strftime('%d/%m/%Y')
                else:
                    target_date = args.date
            except Exception as e:
                logger.error(f"Error parsing date {args.date}: {e}")
                import sys
                sys.exit(1)
        logger.info(f"Executing VHKT morning poll job with date={target_date}...")
        run_vhkt_poll(target_date)
    elif args.job == 'mfd':
        logger.info(f"Executing MFD import job with date={args.date}...")
        run_mfd_import_poll(args.date)
    elif args.job == 'report':
        logger.info("Executing periodic report job...")
        send_periodic_full_report()
    elif args.job == 'pakh':
        logger.info("Executing PAKH poll job...")
        run_pakh_poll('pakh')
    elif args.job == 'pakh_delta':
        logger.info("Executing PAKH delta poll job...")
        run_pakh_poll('pakh_delta')
    elif args.job == 'pakh_summary':
        logger.info("Executing PAKH summary poll job...")
        run_pakh_poll('pakh_summary')
