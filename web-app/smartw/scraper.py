"""
SmartW Playwright Scraper — Login SSO + Scrape 4 tables (MĐ, MPĐ, MLL, VHKT)

Usage:
    from smartw.scraper import SmartWScraper
    scraper = SmartWScraper(username, password)
    await scraper.start()
    data = await scraper.scrape_md()
    await scraper.stop()
"""
import os
import json
import asyncio
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'smartw')

# Debug screenshot retention (days)
DEBUG_RETENTION_DAYS = 3


def cleanup_old_debug_files():
    """Delete debug screenshots older than DEBUG_RETENTION_DAYS days."""
    try:
        cutoff = datetime.now() - timedelta(days=DEBUG_RETENTION_DAYS)
        count = 0
        for f in os.listdir(DATA_DIR):
            if f.startswith('debug_') and f.endswith('.png'):
                fpath = os.path.join(DATA_DIR, f)
                if os.path.getmtime(fpath) < cutoff.timestamp():
                    os.remove(fpath)
                    count += 1
        if count:
            logger.info(f'SmartW Cleanup: Deleted {count} debug screenshots older than {DEBUG_RETENTION_DAYS} days')
    except Exception as e:
        logger.warning(f'SmartW Cleanup: Error cleaning debug files: {e}')


# SmartW base URL
BASE_URL = 'https://smartw.mobifone.vn'

# SSO auth URL pattern
SSO_AUTH_BASE = 'https://auth-sso2fa.mobifone.vn:8080/realms/master/protocol/openid-connect/auth'

# Team & region constants
TEAM_ALARM = 'TVT Đồng Nai 3'
TEAM_MLL = 'MBF_MN_DONG_NAI_PVT_TVT3'
PROVINCE = 'Tỉnh Đồng Nai'
REGION = 'MN'

# ── Column mappings ──────────────────────────────────────────────
# Maps column header → JSON key.
# "!" prefix = important field, no prefix = informational

MD_COLUMNS = {
    'Ngày': 'ngay',
    'Site ID': 'site_id',
    'Cảnh báo': 'canh_bao',
    'Bắt đầu': 'bat_dau',
    'Kết thúc': 'ket_thuc',
    'Số phút': 'so_phut',
    'Tên thiết bị': 'ten_thiet_bi',
    'Cell ID': 'cell_id',
    'UCTT đóng bao': 'uctt',
    'Loại thiết bị': 'loai_thiet_bi',
    'Loại cảnh báo': 'loai_canh_bao',
    'XS/Phường': 'phuong',
    'Tỉnh/Thành phố': 'tinh',
    'Tổ viễn thông': 'to_vt',
    'Bài viễn thông': 'bai_vt',
    'Mạng': 'mang',
    'Vendor': 'vendor',
}

MPD_COLUMNS = {
    'Ngày': 'ngay',
    'Site ID': 'site_id',
    'Cảnh báo': 'canh_bao',
    'Bắt đầu': 'bat_dau',
    'Kết thúc': 'ket_thuc',
    'Số phút': 'so_phut',
    'Tên thiết bị': 'ten_thiet_bi',
    'Loại thiết bị': 'loai_thiet_bi',
    'Vendor': 'vendor',
    'XS/Phường': 'phuong',
    'Tỉnh/Thành phố': 'tinh',
    'Tổ viễn thông': 'to_vt',
    'Bài viễn thông': 'bai_vt',
}

MLL_COLUMNS = {
    'Site ID': 'site_id',
    'Bắt đầu': 'bat_dau',
    'Kết thúc': 'ket_thuc',
    'Số phút': 'so_phut',
    'Mạng': 'mang',
    'Cấp 1': 'nguyen_nhan_1',
    'Cấp 2': 'nguyen_nhan_2',
    'Cấp 3': 'nguyen_nhan_3',
    'Ticket Id': 'ticket_id',
    'Is Auto Ticket': 'auto_ticket',
    'Giảm trừ': 'giam_tru',
    'Ưu tiên PCLB': 'uu_tien_pclb',
    'Xã/Phường': 'phuong',
    'Tỉnh/Thành phố': 'tinh',
    'Tổ viễn thông': 'to_vt',
    'Đài viễn thông': 'dai_vt',
    'Miền': 'mien',
}

VHKT_COLUMNS = {
    'Ngày': 'ngay',
    'Trạm': 'tram',
    'Tổ viễn thông': 'to_vt',
    'MĐ — Số lần': 'md_so_lan',
    'MĐ — Thời gian (phút)': 'md_phut',
    'MĐ — SLA UC': 'md_sla',
    'MPĐ — Số lần': 'mpd_so_lan',
    'MPĐ — Thời gian (phút)': 'mpd_phut',
    'MLL — Số lần': 'mll_so_lan',
    'MLL — Thời gian (phút)': 'mll_phut',
    'MLL — SLA': 'mll_sla',
}


class SmartWScraper:
    """Playwright-based SmartW scraper with SSO login."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self._browser = None
        self._context = None
        self._page = None
        self._logged_in = False
        self._last_login_fail = 0       # timestamp of last failed login
        self._login_cooldown = 60       # seconds to wait before retrying (default 1min)

    # ── Lifecycle ────────────────────────────────────────────────

    async def start(self):
        """Launch browser and create a persistent context."""
        from playwright.async_api import async_playwright
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=True)
        self._context = await self._browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                       '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        self._page = await self._context.new_page()
        self._page.set_default_timeout(60000)
        cleanup_old_debug_files()
        logger.info('SmartW Scraper: Browser started')

    async def stop(self):
        """Close browser and cleanup."""
        try:
            if self._browser:
                await self._browser.close()
        except Exception:
            pass
        try:
            if self._pw:
                await self._pw.stop()
        except Exception:
            pass
        self._browser = None
        self._context = None
        self._page = None
        self._logged_in = False
        logger.info('SmartW Scraper: Browser closed')

    @property
    def is_alive(self) -> bool:
        """Check if browser is still running and usable.
        Uses browser.is_connected() as a quick check — but this can return
        True even when the connection is stale.  The real confirmation
        happens in is_alive_deep() which actually pings the page.
        """
        try:
            return (self._browser is not None
                    and self._browser.is_connected()
                    and self._page is not None)
        except Exception:
            return False

    async def is_alive_deep(self) -> bool:
        """Actually test the browser connection by running a trivial JS eval.
        This catches the 'NoneType has no attribute send' crash that
        browser.is_connected() misses.
        """
        if not self.is_alive:
            return False
        try:
            await self._page.evaluate('1')
            return True
        except Exception:
            logger.warning('SmartW Scraper: is_alive_deep failed — browser is dead')
            return False

    # ── SSO Login ────────────────────────────────────────────────

    async def login(self) -> bool:
        """Login to SmartW via SSO or direct login page.
        Flow: Navigate to SmartW → redirect to SSO or loginDefault → fill form → submit.
        Returns True if login succeeded.
        """
        try:
            page = self._page

            # Step 1: Navigate to SmartW — triggers SSO redirect
            logger.info('SmartW Login: Navigating to SmartW...')
            await page.goto(f'{BASE_URL}/smartw/', wait_until='networkidle', timeout=30000)

            # Step 2: Handle loginDefault.htm — go directly to SSO URL
            current_url = page.url
            if 'loginDefault' in current_url:
                logger.info('SmartW Login: loginDefault detected, navigating to SSO URL...')
                sso_url = (
                    'https://auth-sso2fa.mobifone.vn:8080/oauth/realms/sso-mobifone'
                    '/protocol/openid-connect/auth'
                    '?client_id=TTNOC_SMARTW&scope=openid&response_type=code'
                    '&redirect_uri=https://smartw.mobifone.vn/smartw/sso/callback.htm'
                )
                await page.goto(sso_url, wait_until='networkidle', timeout=30000)
                current_url = page.url
                logger.info(f'SmartW Login: After SSO navigate → {current_url}')

            # Step 3: Now on SSO page — fill credentials
            current_url = page.url
            if 'auth-sso2fa' in current_url or 'openid-connect/auth' in current_url:
                logger.info('SmartW Login: SSO page detected, filling credentials...')

                # Debug: dump ALL form inputs to understand page structure
                form_debug = await page.evaluate('''() => {
                    const inputs = document.querySelectorAll('input');
                    return Array.from(inputs).map((inp, i) => ({
                        index: i,
                        type: inp.type,
                        name: inp.name,
                        id: inp.id,
                        placeholder: inp.placeholder,
                        className: inp.className,
                        visible: inp.offsetParent !== null
                    }));
                }''')
                logger.info(f'SmartW Login: Form inputs found: {form_debug}')

                # Fill username — try multiple selectors
                username_filled = False
                for sel in [
                    'input[name="username"]',
                    'input#username',
                    'input[type="text"]:first-of-type',
                    'input[type="text"]',
                    'input[type="email"]',
                ]:
                    el = await page.query_selector(sel)
                    if el:
                        await el.fill(self.username)
                        logger.info(f'SmartW Login: Username filled via: {sel}')
                        username_filled = True
                        break
                if not username_filled:
                    logger.error('SmartW Login: ❌ Could not find username field!')

                # Fill password — try multiple strategies for SSO compatibility
                # Some SSO forms use React/custom inputs that need specific approaches
                password_filled = False
                pwd_selectors = [
                    'input[name="password"]',
                    'input#password',
                    'input[type="password"]',
                    'input[name="pwd"]',
                    'input[name="pass"]',
                ]
                
                for sel in pwd_selectors:
                    el = await page.query_selector(sel)
                    if el:
                        # Strategy 1: fill() — Playwright native (sets value + dispatches input/change events)
                        try:
                            await el.click()
                            await el.fill(self.password)
                            # Verify value was set
                            val = await el.evaluate('e => e.value')
                            if val == self.password:
                                logger.info(f'SmartW Login: Password filled via fill(): {sel} (verified ✅)')
                                password_filled = True
                                break
                            else:
                                logger.warning(f'SmartW Login: fill() set value but mismatch! Expected len={len(self.password)}, got len={len(val)}')
                        except Exception as e1:
                            logger.warning(f'SmartW Login: fill() failed for {sel}: {e1}')
                        
                        # Strategy 2: JS evaluate — set value directly + dispatch events
                        try:
                            await el.evaluate(f'''e => {{
                                e.value = '';
                                e.dispatchEvent(new Event('input', {{bubbles: true}}));
                            }}''')
                            await el.type(self.password, delay=30)
                            val = await el.evaluate('e => e.value')
                            if val == self.password:
                                logger.info(f'SmartW Login: Password typed via type(): {sel} (verified ✅)')
                                password_filled = True
                                break
                            else:
                                logger.warning(f'SmartW Login: type() value mismatch! Expected len={len(self.password)}, got len={len(val)}')
                        except Exception as e2:
                            logger.warning(f'SmartW Login: type() failed for {sel}: {e2}')
                        break  # Don't try other selectors if we found the element

                # Fallback: try the 2nd input on the page
                if not password_filled:
                    logger.warning('SmartW Login: Standard password selectors failed, trying 2nd input...')
                    el = await page.query_selector('input:nth-of-type(2)')
                    if el:
                        await el.click()
                        await el.fill(self.password)
                        logger.info('SmartW Login: Password filled via 2nd input fallback')
                        password_filled = True

                # Final fallback: label-based locator
                if not password_filled:
                    logger.warning('SmartW Login: Trying label-based locator...')
                    try:
                        pwd_loc = page.get_by_label('Mật khẩu')
                        if await pwd_loc.count() > 0:
                            await pwd_loc.first.click()
                            await pwd_loc.first.fill(self.password)
                            logger.info('SmartW Login: Password filled via label "Mật khẩu"')
                            password_filled = True
                    except Exception as e:
                        logger.warning(f'SmartW Login: Label locator failed: {e}')

                if not password_filled:
                    logger.error('SmartW Login: ❌ Could not find password field!')
                    debug_path = os.path.join(DATA_DIR, f'debug_login_{datetime.now().strftime("%H%M%S")}.png')
                    await page.screenshot(path=debug_path, full_page=True)
                    return False

                # Small delay to let SSO JS process the input
                await page.wait_for_timeout(500)

                # Pre-submit screenshot (verify fields are filled before clicking login)
                debug_pre = os.path.join(DATA_DIR, f'debug_pre_submit_{datetime.now().strftime("%H%M%S")}.png')
                await page.screenshot(path=debug_pre, full_page=True)
                logger.info(f'SmartW Login: Pre-submit screenshot saved: {debug_pre}')

                # Submit form
                submit_clicked = False
                for sel in [
                    'button:has-text("Đăng nhập")',
                    'input[type="submit"]',
                    'button[type="submit"]',
                    '#kc-login',
                ]:
                    el = await page.query_selector(sel)
                    if el:
                        await el.click()
                        logger.info(f'SmartW Login: Submit clicked via: {sel}')
                        submit_clicked = True
                        break

                if not submit_clicked:
                    logger.error('SmartW Login: ❌ Could not find submit button!')

                # Wait for redirect
                await page.wait_for_load_state('networkidle', timeout=15000)

                # Post-submit screenshot for diagnostics
                debug_post = os.path.join(DATA_DIR, f'debug_post_submit_{datetime.now().strftime("%H%M%S")}.png')
                await page.screenshot(path=debug_post, full_page=True)
                logger.info(f'SmartW Login: Post-submit screenshot saved: {debug_post}')

            # Step 4: Verify login success
            current_url = page.url
            if ('smartw.mobifone.vn' in current_url
                    and 'auth-sso2fa' not in current_url
                    and 'loginDefault' not in current_url):
                self._logged_in = True
                logger.info(f'SmartW Login: ✅ Success! URL: {current_url}')
                return True
            else:
                # Capture SSO error message for better diagnostics
                sso_error_msg = ''
                try:
                    err_el = await page.query_selector('.alert-error, .alert-danger, [class*="error"], [class*="Error"]')
                    if err_el:
                        sso_error_msg = (await err_el.text_content() or '').strip()
                except Exception:
                    pass

                # Save screenshot for debugging
                debug_path = os.path.join(DATA_DIR, f'debug_login_{datetime.now().strftime("%H%M%S")}.png')
                await page.screenshot(path=debug_path, full_page=True)

                # Detect SSO lockout (account temporarily disabled)
                import time
                if 'vô hiệu hóa' in sso_error_msg.lower() or 'disabled' in sso_error_msg.lower():
                    self._login_cooldown = 300  # wait 5 minutes before retrying
                    self._last_login_fail = time.time()
                    logger.error(f'SmartW Login: ⛔ SSO LOCKOUT detected! Cooldown {self._login_cooldown}s — {sso_error_msg}')
                else:
                    self._login_cooldown = 60   # normal failure: wait 1 minute
                    self._last_login_fail = time.time()

                logger.error(f'SmartW Login: ❌ Failed. URL: {current_url} — SSO error: {sso_error_msg} — screenshot: {debug_path}')
                return False

        except Exception as e:
            logger.error(f'SmartW Login: ❌ Error: {e}')
            return False

    async def _ensure_login(self):
        """Auto re-login if session expired (with cooldown to prevent SSO lockout)."""
        # First check if current URL indicates session expired
        if self._page:
            await self._handle_session_expired()
        if not self._logged_in:
            # Respect cooldown to avoid hammering SSO
            import time
            elapsed = time.time() - self._last_login_fail
            if self._last_login_fail > 0 and elapsed < self._login_cooldown:
                wait_left = int(self._login_cooldown - elapsed)
                raise RuntimeError(f'SmartW: Login cooldown — chờ {wait_left}s trước khi thử lại (tránh SSO khóa tài khoản).')
            success = await self.login()
            if not success:
                raise RuntimeError('SmartW: Không thể đăng nhập. Kiểm tra lại credentials.')

    # ── Table Parser (Shared) ────────────────────────────────────

    async def _parse_table(self, page, column_map: dict) -> list[dict]:
        """Parse jqxGrid data from current page using column mapping.

        SmartW renders data using jqxGrid widget (div-based, NOT <table>).
        - Headers: div[role="columnheader"] > span
        - Data rows: #contenttablejqxgrid > div[role="row"]
        - Data cells: div[role="gridcell"] > div (text content)

        The grid shows 30 rows per page. We read all pages by navigating pagination.
        """
        all_rows = []

        try:
            # Wait for jqxGrid to render data rows
            try:
                print('[PARSER DEBUG] Waiting for #contenttablejqxgrid div[role="row"]...')
                await page.wait_for_selector('#contenttablejqxgrid div[role="row"]', timeout=15000)
                print('[PARSER DEBUG] ✅ jqxGrid rows found!')
            except Exception as e:
                current_url = page.url
                print(f'[PARSER DEBUG] ❌ wait_for_selector FAILED: {e}')
                print(f'[PARSER DEBUG] Current URL: {current_url}')
                # Check if session expired (redirected to login page)
                if 'loginDefault' in current_url or 'auth-sso2fa' in current_url:
                    print(f'[PARSER DEBUG] Session expired detected!')
                    logger.warning(f'SmartW Parser: Session expired (at {current_url}), re-logging in...')
                    self._logged_in = False
                    success = await self.login()
                    if success:
                        logger.info('SmartW Parser: Re-login OK — caller should retry scrape')
                    else:
                        logger.error('SmartW Parser: Re-login failed')
                else:
                    # Save debug screenshot to see what SmartW shows
                    debug_path = os.path.join(DATA_DIR, f'debug_{datetime.now().strftime("%H%M%S")}.png')
                    await page.screenshot(path=debug_path, full_page=True)
                    print(f'[PARSER DEBUG] Screenshot saved: {debug_path}')
                    logger.error(f'SmartW Parser: jqxGrid rows not found — screenshot: {debug_path}')
                    logger.error(f'SmartW Parser: Current URL: {current_url}')
                return []

            # Extract headers and data from jqxGrid using page.evaluate
            table_data = await page.evaluate('''() => {
                // ── Extract column headers ──
                // jqxGrid renders headers as div[role="columnheader"]
                // Each header has a <span> with the column name
                // Headers include a filter row; we only want the actual column names
                const headerEls = document.querySelectorAll('#columntablejqxgrid div[role="columnheader"]');
                const headers = [];
                for (const hdr of headerEls) {
                    const span = hdr.querySelector('span');
                    if (span) {
                        const text = span.textContent.trim();
                        if (text) headers.push(text);
                    }
                }

                // ── Extract data rows ──
                const contentTable = document.getElementById('contenttablejqxgrid');
                if (!contentTable) return { headers, rows: [], totalInfo: '' };

                const rowEls = contentTable.querySelectorAll('div[role="row"]');
                const dataRows = [];
                for (const row of rowEls) {
                    const cells = row.querySelectorAll('div[role="gridcell"]');
                    const cellTexts = [];
                    for (const cell of cells) {
                        // The actual text is inside a nested <div>
                        const innerDiv = cell.querySelector('div');
                        cellTexts.push(innerDiv ? innerDiv.textContent.trim() : cell.textContent.trim());
                    }
                    if (cellTexts.length > 0) {
                        dataRows.push(cellTexts);
                    }
                }

                // ── Get pagination total info ──
                // jqxGrid pagination shows "1-30 of 141" text
                const pagerEl = document.querySelector('.jqx-grid-pager');
                let totalInfo = '';
                if (pagerEl) {
                    totalInfo = pagerEl.textContent.trim();
                }

                return { headers, rows: dataRows, totalInfo };
            }''')

            if not table_data or not table_data.get('headers'):
                print('[PARSER DEBUG] ❌ No jqxGrid headers found!')
                logger.warning('SmartW Parser: No jqxGrid headers found')
                return []

            headers = table_data['headers']
            print(f'[PARSER DEBUG] Headers ({len(headers)}): {headers}')
            print(f'[PARSER DEBUG] Rows on page: {len(table_data["rows"])}')
            if table_data["rows"]:
                print(f'[PARSER DEBUG] First row sample: {table_data["rows"][0][:5]}')
            logger.info(f'SmartW Parser: jqxGrid headers: {headers}')
            logger.info(f'SmartW Parser: Found {len(table_data["rows"])} rows on current page')
            if table_data.get('totalInfo'):
                print(f'[PARSER DEBUG] Pagination: {table_data["totalInfo"]}')
                logger.info(f'SmartW Parser: Pagination info: {table_data["totalInfo"]}')

            # Build index map: column_map key → column index
            # Use fuzzy matching (contains) for resilience against minor SmartW UI changes
            col_indices = {}
            for col_name, json_key in column_map.items():
                for idx, header in enumerate(headers):
                    if col_name.lower() in header.lower() or header.lower() in col_name.lower():
                        col_indices[json_key] = idx
                        break

            if not col_indices:
                logger.warning(f'SmartW Parser: No columns matched! Headers: {headers}, Map: {list(column_map.keys())}')
                return []

            logger.info(f'SmartW Parser: Column mapping resolved: {col_indices}')

            # Parse rows from current page
            def parse_rows(raw_rows):
                parsed = []
                for row_cells in raw_rows:
                    if not row_cells or all(c == '' for c in row_cells):
                        continue  # Skip empty rows

                    record = {}
                    for json_key, col_idx in col_indices.items():
                        if col_idx < len(row_cells):
                            value = row_cells[col_idx].strip()
                            # Parse numeric for 'so_phut' fields
                            if 'so_phut' in json_key or 'so_lan' in json_key or 'phut' in json_key:
                                try:
                                    value = float(value.replace(',', '')) if value else 0
                                except (ValueError, TypeError):
                                    value = 0
                            record[json_key] = value
                        else:
                            record[json_key] = ''

                    if record.get('site_id') or record.get('tram'):
                        parsed.append(record)
                return parsed

            all_rows.extend(parse_rows(table_data['rows']))

            # ── Handle pagination: navigate to next pages ──
            # jqxGrid pagination: click "next page" button until no more rows
            max_pages = 20  # Safety limit
            for page_num in range(2, max_pages + 1):
                # Check if there's a next page button and click it
                has_next = await page.evaluate('''() => {
                    // jqxGrid next page button
                    const nextBtn = document.querySelector('div[id$="pagerright"] div[type="button"]');
                    if (nextBtn && !nextBtn.classList.contains('jqx-fill-state-disabled')) {
                        nextBtn.click();
                        return true;
                    }
                    return false;
                }''')

                if not has_next:
                    logger.info(f'SmartW Parser: No more pages (stopped at page {page_num - 1})')
                    break

                # Wait for grid to reload
                await page.wait_for_timeout(2000)

                # Read rows from new page
                new_rows = await page.evaluate('''() => {
                    const contentTable = document.getElementById('contenttablejqxgrid');
                    if (!contentTable) return [];
                    const rowEls = contentTable.querySelectorAll('div[role="row"]');
                    const dataRows = [];
                    for (const row of rowEls) {
                        const cells = row.querySelectorAll('div[role="gridcell"]');
                        const cellTexts = [];
                        for (const cell of cells) {
                            const innerDiv = cell.querySelector('div');
                            cellTexts.push(innerDiv ? innerDiv.textContent.trim() : cell.textContent.trim());
                        }
                        if (cellTexts.length > 0) dataRows.push(cellTexts);
                    }
                    return dataRows;
                }''')

                if not new_rows:
                    logger.info(f'SmartW Parser: Page {page_num} returned no rows, stopping')
                    break

                parsed_new = parse_rows(new_rows)
                all_rows.extend(parsed_new)
                logger.info(f'SmartW Parser: Page {page_num}: +{len(parsed_new)} rows (total: {len(all_rows)})')

        except Exception as e:
            logger.error(f'SmartW Parser: Error parsing jqxGrid: {e}')
            import traceback
            logger.error(traceback.format_exc())

        logger.info(f'SmartW Parser: Total parsed: {len(all_rows)} records')
        return all_rows

    # ── Scrape Functions ─────────────────────────────────────────

    async def scrape_md(self) -> list[dict]:
        """Scrape MĐ (Mất Điện) — active alarms only (sActive=on)."""
        await self._ensure_login()
        sdate, edate = self._date_range()
        url = f'{BASE_URL}/smartw/alarm/site/list.htm?' + urlencode({
            'type': 'MD',
            'level': 'CELL',
            'team': TEAM_ALARM,
            'sdate': sdate,
            'edate': edate,
            'isActive': 'on',
        })
        logger.info(f'SmartW Scrape MĐ: {url}')
        await self._page.goto(url, wait_until='networkidle', timeout=60000)
        await self._handle_session_expired()

        data = await self._parse_table(self._page, MD_COLUMNS)
        self._save_json(data, 'md.json')
        logger.info(f'SmartW Scrape MĐ: ✅ {len(data)} records')
        return data

    async def scrape_mpd(self) -> list[dict]:
        """Scrape MPĐ (Máy Phát Điện) — active alarms only (sActive=on)."""
        await self._ensure_login()
        sdate, edate = self._date_range()
        url = f'{BASE_URL}/smartw/alarm/site/list.htm?' + urlencode({
            'type': 'MFD',
            'level': 'SITE',
            'team': TEAM_ALARM,
            'sdate': sdate,
            'edate': edate,
            'isActive': 'on',
        })
        logger.info(f'SmartW Scrape MPĐ: {url}')
        await self._page.goto(url, wait_until='networkidle', timeout=60000)
        await self._handle_session_expired()

        data = await self._parse_table(self._page, MPD_COLUMNS)
        self._save_json(data, 'mpd.json')
        logger.info(f'SmartW Scrape MPĐ: ✅ {len(data)} records')
        return data

    async def scrape_mll(self) -> list[dict]:
        """Scrape MLL (Mất Liên Lạc) — active alarms only (tramMll=on)."""
        await self._ensure_login()
        sdate, edate = self._date_range()
        url = f'{BASE_URL}/smartw/rp-site-v2/list.htm?' + urlencode({
            'region': REGION,
            'team': TEAM_MLL,
            'province': PROVINCE,
            'sdate': sdate,
            'edate': edate,
            'tramMll': 'on',
        })
        logger.info(f'SmartW Scrape MLL: {url}')
        await self._page.goto(url, wait_until='networkidle', timeout=60000)
        await self._handle_session_expired()



        data = await self._parse_table(self._page, MLL_COLUMNS)
        self._save_json(data, 'mll.json')
        logger.info(f'SmartW Scrape MLL: ✅ {len(data)} records')
        return data

    async def scrape_vhkt(self, date_str: str = None) -> list[dict]:
        """Scrape VHKT (Đánh Giá Tổng Hợp) — typically run once/morning.

        Uses POSITIONAL column mapping because VHKT jqxGrid has duplicate
        sub-column headers (Số lần, Thời gian appear 3x under MĐ/MPĐ/MLL).
        Sets pagesize=1000 to load ALL rows in one shot.

        Args:
            date_str: Date in DD/MM/YYYY format. Default = yesterday.
        """
        await self._ensure_login()
        if not date_str:
            date_str = (datetime.now() - timedelta(days=1)).strftime('%d/%m/%Y')

        url = f'{BASE_URL}/smartw/rp-vhkt-md-mll/list.htm?' + urlencode({
            'type': 'NGAY',
            'mien': REGION,
            'tinh': PROVINCE,
            'ngay': date_str
        })
        logger.info(f'SmartW Scrape VHKT: {url}')
        # Use 'domcontentloaded' instead of 'networkidle' — SmartW has long-lived
        # connections that keep 'networkidle' waiting forever, causing timeouts.
        # The actual data loads after clicking 'Tìm kiếm', not on page open.
        await self._page.goto(url, wait_until='domcontentloaded', timeout=90000)
        try:
            await self._page.wait_for_load_state('networkidle', timeout=15000)
        except Exception:
            pass  # OK if networkidle times out — page may still be loading background resources
        await self._handle_session_expired()

        # Click "Tìm kiếm" to load data
        try:
            search_btn = self._page.locator('button:has-text("Tìm kiếm"), input[value="Tìm kiếm"]')
            await search_btn.first.click(timeout=5000)
            await self._page.wait_for_timeout(3000)
            await self._page.wait_for_load_state('networkidle', timeout=15000)
        except Exception as e:
            logger.warning(f'SmartW VHKT: Search button click failed: {e}')

        # ── Set jqxGrid pagesize to show ALL rows ────────────────────
        try:
            await self._page.evaluate('''() => {
                if (typeof $ !== 'undefined' && $('#jqxgrid').length) {
                    $('#jqxgrid').jqxGrid({ pagesize: 1000 });
                }
            }''')
            await self._page.wait_for_timeout(3000)
            await self._page.wait_for_load_state('networkidle', timeout=15000)
            logger.info('SmartW VHKT: Set pagesize=1000')
        except Exception as e:
            logger.warning(f'SmartW VHKT: Could not set pagesize: {e}')

        # ── Parse VHKT with positional column mapping ────────────────
        all_rows = []

        try:
            await self._page.wait_for_selector(
                '#contenttablejqxgrid div[role="row"]', timeout=15000
            )

            # Extract headers + ALL rows (pagesize=1000 should give everything)
            table_data = await self._page.evaluate('''() => {
                const headerEls = document.querySelectorAll(
                    '#columntablejqxgrid div[role="columnheader"]'
                );
                const headers = [];
                for (const hdr of headerEls) {
                    const span = hdr.querySelector('span');
                    if (span) {
                        const text = span.textContent.trim();
                        if (text) headers.push(text);
                    }
                }

                const contentTable = document.getElementById('contenttablejqxgrid');
                if (!contentTable) return { headers, rows: [] };

                const rowEls = contentTable.querySelectorAll('div[role="row"]');
                const dataRows = [];
                for (const row of rowEls) {
                    const cells = row.querySelectorAll('div[role="gridcell"]');
                    const cellTexts = [];
                    for (const cell of cells) {
                        const innerDiv = cell.querySelector('div');
                        cellTexts.push(
                            innerDiv ? innerDiv.textContent.trim() : cell.textContent.trim()
                        );
                    }
                    if (cellTexts.length > 0) dataRows.push(cellTexts);
                }
                return { headers, rows: dataRows };
            }''')

            if not table_data or not table_data.get('headers'):
                logger.warning('SmartW VHKT: No headers found')
                return []

            headers = table_data['headers']
            logger.info(f'SmartW VHKT: Headers ({len(headers)}): {headers}')
            logger.info(f'SmartW VHKT: Total raw rows: {len(table_data["rows"])}')

            # Debug: log first raw row to verify column positions
            if table_data['rows']:
                logger.info(f'SmartW VHKT: First raw row ({len(table_data["rows"][0])} cells): {table_data["rows"][0]}')

            # ── Build positional mapping by scanning headers ──
            col_map = {}  # json_key -> column index

            # Pass 1: find exact/unique header positions
            for idx, h in enumerate(headers):
                h_low = h.lower().strip()
                if 'ngày' in h_low and 'ngay' not in col_map:
                    col_map['ngay'] = idx
                elif h_low == 'trạm' or (h_low == 'trạm' and 'tram' not in col_map):
                    col_map['tram'] = idx
                elif 'tổ viễn thông' in h_low or 'tổ vt' in h_low:
                    col_map['to_vt'] = idx
                elif 'sla' in h_low and ('mất điện' in h_low or 'uc' in h_low):
                    col_map['md_sla'] = idx
                elif 'sla' in h_low and 'liên lạc' in h_low:
                    col_map['mll_sla'] = idx

            # Pass 2: find "Số lần" and "Thời gian" columns IN ORDER
            so_lan_indices = []
            tg_indices = []
            for idx, h in enumerate(headers):
                h_low = h.lower().strip()
                if 'số lần' in h_low:
                    so_lan_indices.append(idx)
                elif 'thời gian' in h_low:
                    tg_indices.append(idx)

            # Map in order: MĐ=0, MPĐ=1, MLL=2
            if len(so_lan_indices) >= 3:
                col_map['md_so_lan'] = so_lan_indices[0]
                col_map['mpd_so_lan'] = so_lan_indices[1]
                col_map['mll_so_lan'] = so_lan_indices[2]
            elif len(so_lan_indices) >= 1:
                col_map['md_so_lan'] = so_lan_indices[0]

            if len(tg_indices) >= 3:
                col_map['md_phut'] = tg_indices[0]
                col_map['mpd_phut'] = tg_indices[1]
                col_map['mll_phut'] = tg_indices[2]
            elif len(tg_indices) >= 1:
                col_map['md_phut'] = tg_indices[0]

            logger.info(f'SmartW VHKT: Positional mapping: {col_map}')

            # ── Parse rows ──────────────────────────────────────────
            numeric_keys = {'md_so_lan', 'md_phut', 'mpd_so_lan', 'mpd_phut',
                            'mll_so_lan', 'mll_phut'}

            def parse_vhkt_rows(raw_rows):
                parsed = []
                for cells in raw_rows:
                    if not cells or all(c == '' for c in cells):
                        continue
                    record = {}
                    for json_key, col_idx in col_map.items():
                        if col_idx < len(cells):
                            val = cells[col_idx].strip()
                            if json_key in numeric_keys:
                                try:
                                    val = float(val.replace(',', '')) if val else 0
                                except (ValueError, TypeError):
                                    val = 0
                            record[json_key] = val
                        else:
                            record[json_key] = '' if json_key not in numeric_keys else 0
                    if record.get('tram'):
                        parsed.append(record)
                return parsed

            all_rows = parse_vhkt_rows(table_data['rows'])
            logger.info(f'SmartW VHKT: Parsed {len(all_rows)} valid rows')

        except Exception as e:
            logger.error(f'SmartW VHKT: Error: {e}')
            import traceback
            logger.error(traceback.format_exc())

        # Only save if we actually got data — don't overwrite good data with empty results
        if all_rows:
            self._save_json(all_rows, 'vhkt.json')
            logger.info(f'SmartW Scrape VHKT: ✅ {len(all_rows)} records saved')
        else:
            logger.warning('SmartW Scrape VHKT: ⚠️ 0 records — keeping existing vhkt.json')
        return all_rows

    # ── Helpers ────────────────────────────────────────────────────

    @staticmethod
    def _date_range(months_back: int = 1) -> tuple[str, str]:
        """Generate sdate/edate range: from N months ago 00:00 to now 23:59.
        Format: DD/MM/YYYY HH:mm (as SmartW expects)."""
        now = datetime.now()
        sdate_dt = now - timedelta(days=30 * months_back)
        sdate = sdate_dt.strftime('%d/%m/%Y') + ' 00:00'
        edate = now.strftime('%d/%m/%Y') + ' 23:59'
        return sdate, edate

    # ── Session Management ───────────────────────────────────────

    async def _handle_session_expired(self):
        """Detect and handle session expiry (redirect to SSO login page)."""
        current_url = self._page.url
        if 'auth-sso2fa' in current_url or 'openid-connect/auth' in current_url or 'loginDefault' in current_url:
            logger.warning('SmartW: Session expired, re-logging in...')
            self._logged_in = False
            success = await self.login()
            if not success:
                raise RuntimeError('SmartW: Không thể re-login sau khi session hết hạn.')

    # ── JSON Persistence ─────────────────────────────────────────

    def _save_json(self, data: list[dict], filename: str):
        """Save scraped data to data/smartw/{filename} with metadata.
        Uses atomic write (temp file + rename) with retry for Windows file locking.
        """
        os.makedirs(DATA_DIR, exist_ok=True)
        filepath = os.path.join(DATA_DIR, filename)
        tmp_path = filepath + '.tmp'

        payload = {
            'scraped_at': datetime.now().isoformat(),
            'count': len(data),
            'data': data
        }

        # Clean up stale tmp file from previous crashed scrape
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass

        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        # Atomic replace with retry — Windows may lock file during API reads
        import time
        for attempt in range(3):
            try:
                os.replace(tmp_path, filepath)
                break
            except OSError:
                if attempt < 2:
                    time.sleep(0.5)
                else:
                    # Last resort: direct write (non-atomic but won't fail)
                    logger.warning(f'SmartW: os.replace failed after 3 retries, writing directly to {filepath}')
                    with open(filepath, 'w', encoding='utf-8') as f:
                        json.dump(payload, f, ensure_ascii=False, indent=2)
                    # Clean up tmp file
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass

        logger.info(f'SmartW: Saved {len(data)} records → {filepath}')


# ── Synchronous wrapper (for calling from Flask/APScheduler) ─────

def run_scrape_sync(username: str, password: str, tables: list[str] = None, vhkt_date: str = None):
    """Synchronous wrapper for the async scraper.
    Args:
        username: SmartW SSO username
        password: SmartW SSO password
        tables: List of tables to scrape. Default = ['md', 'mpd', 'mll']
        vhkt_date: Optional date for VHKT scrape (DD/MM/YYYY). Default = yesterday.
    Returns:
        dict with results per table
    """
    if tables is None:
        tables = ['md', 'mpd', 'mll']

    async def _run():
        scraper = SmartWScraper(username, password)
        results = {}
        try:
            await scraper.start()
            logged_in = await scraper.login()
            if not logged_in:
                return {'error': 'Login thất bại'}

            if 'md' in tables:
                results['md'] = await scraper.scrape_md()
            if 'mpd' in tables:
                results['mpd'] = await scraper.scrape_mpd()
            if 'mll' in tables:
                results['mll'] = await scraper.scrape_mll()
            if 'vhkt' in tables:
                results['vhkt'] = await scraper.scrape_vhkt(date_str=vhkt_date)

            results['status'] = 'success'
            results['scraped_at'] = datetime.now().isoformat()
        except Exception as e:
            results['error'] = str(e)
            logger.error(f'SmartW Scrape Error: {e}')
        finally:
            await scraper.stop()
        return results

    # Handle running in existing event loop (Flask with APScheduler)
    try:
        loop = asyncio.get_running_loop()
        # Already in an async context — use nest_asyncio or run in thread
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, _run())
            return future.result(timeout=120)
    except RuntimeError:
        # No running loop — safe to asyncio.run
        return asyncio.run(_run())


def load_cached_data(table_type: str) -> dict | None:
    """Load cached JSON data for a table type.
    Args:
        table_type: 'md', 'mpd', 'mll', or 'vhkt'
    Returns:
        dict with 'scraped_at', 'count', 'data' or None
    """
    filenames = {
        'md': 'md.json',
        'mpd': 'mpd.json',
        'mll': 'mll.json',
        'vhkt': 'vhkt.json'
    }
    filename = filenames.get(table_type)
    if not filename:
        return None

    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        return None

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return None
