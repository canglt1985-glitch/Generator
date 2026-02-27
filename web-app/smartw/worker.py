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
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'smartw')
STATUS_FILE = os.path.join(DATA_DIR, 'scrape_status.json')

# Track if a scrape is currently running (simple lock)
_is_running = False

# Circuit breaker: stop polling after this many consecutive login failures
MAX_LOGIN_FAILURES = 10

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

    # Build set of active site_ids + bat_dau for unique identification
    active_keys = set()
    for record in active:
        key = f"{record.get('site_id', '')}__{record.get('bat_dau', '')}"
        active_keys.add(key)

    # Find records in previous but not in active → they cleared
    cleared = []
    now = datetime.now().isoformat()
    for record in previous:
        key = f"{record.get('site_id', '')}__{record.get('bat_dau', '')}"
        if key not in active_keys:
            record['clear_time'] = now
            record['status'] = 'CLEARED'
            cleared.append(record)

    return cleared


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
    Timeout is 300s to allow for browser crash + retry scenarios.
    """
    import concurrent.futures
    try:
        loop = asyncio.get_running_loop()
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, coro_func())
            return future.result(timeout=300)
    except RuntimeError:
        return asyncio.run(coro_func())


def run_alarm_poll():
    """Poll MĐ + MPĐ + MLL active alarms.
    Called by APScheduler every 15 minutes.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    global _is_running
    if _is_running:
        logger.info('SmartW Worker: Already running, skipping this round')
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

            # Clear detection
            for table_type in ['md', 'mpd', 'mll', 'mll_cell']:
                cleared = _detect_cleared(table_type)
                if cleared:
                    _update_cleared_list(table_type, cleared)
                    logger.info(f'SmartW Worker: {len(cleared)} {table_type.upper()} alarm(s) cleared')

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
        _is_running = False
        _save_status(status)


def run_vhkt_poll():
    """Poll VHKT daily summary.
    Called by APScheduler once at 5:00 AM.
    Uses persistent session — logs in only once, reuses for subsequent polls.
    """
    global _is_running
    if _is_running:
        logger.info('SmartW Worker: Already running, skipping VHKT poll')
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

