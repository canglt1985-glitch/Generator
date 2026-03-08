"""
DataSite Playwright Scraper — Login + Scrape/Export Asset Data
Handles both "Xuất toàn bộ dữ liệu" (General) and "Xuất dữ liệu tài sản" (Assets).

Usage:
    from datasite_scraper import DataSiteScraper
    scraper = DataSiteScraper(username, password)
    await scraper.start()
    await scraper.login()
    await scraper.sync_all()
    await scraper.stop()
"""
import os
import asyncio
import logging
from datetime import datetime
from datasite_utils import import_all_datasite_samples

logger = logging.getLogger(__name__)

DATASITE_URL = "http://10.0.35.3:8080/datasite"
LOGIN_URL = f"{DATASITE_URL}/#/login"
SDM_URL = f"{DATASITE_URL}/#/sdm"
TOTAL_REPORT_URL = f"{DATASITE_URL}/#/totalreport"

# Download directory
DOWNLOAD_DIR = os.path.join(os.getcwd(), 'tmp_datasite_sync')

class DataSiteScraper:
    """Playwright-based DataSite scraper."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self._browser = None
        self._context = None
        self._page = None
        self._logged_in = False
        self._pw = None

    async def start(self):
        """Launch browser and create context."""
        from playwright.async_api import async_playwright
        self._pw = await async_playwright().start()
        self._browser = await self._pw.chromium.launch(headless=True)
        self._context = await self._browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            accept_downloads=True
        )
        self._page = await self._context.new_page()
        self._page.set_default_timeout(60000)
        os.makedirs(DOWNLOAD_DIR, exist_ok=True)
        logger.info('DataSite Scraper: Browser started')

    async def stop(self):
        """Close browser."""
        try:
            if self._browser:
                await self._browser.close()
            if self._pw:
                await self._pw.stop()
        except Exception as e:
            logger.debug(f"Error stopping scraper: {e}")
        self._browser = None
        self._logged_in = False
        logger.info('DataSite Scraper: Browser closed')

    async def _log(self, message):
        logger.info(f"DataSite Scraper: {message}")
        try:
            from datasite_routes import add_datasite_log
            add_datasite_log(message)
        except: pass

    async def login(self):
        """Phase 1: Login."""
        try:
            await self._log("Đang đăng nhập vào DataSite...")
            await self._page.goto(DATASITE_URL)
            await self._page.fill('input[name="username"]', self.username)
            await self._page.fill('input[name="password"]', self.password)
            await self._page.click('button[type="submit"]')
            await self._page.wait_for_selector('text="TRANG CHỦ"', timeout=30000)
            self._logged_in = True
            await self._log("Đăng nhập thành công.")
        except Exception as e:
            # Fallback check
            if await self._page.query_selector('text="TỔ TRƯỞNG"'):
                self._logged_in = True
                await self._log("Đăng nhập thành công (Dùng cache/session).")
            else:
                await self._log(f"Đăng nhập thất bại: {str(e)}")
                raise Exception("Login failed")

    async def goto_sdm(self):
        """Navigate to SDM and expand tree to 'TỔ Long Khánh'."""
        logger.info("DataSite Scraper: Navigating to SDM...")
        await self._page.goto(f"{DATASITE_URL}/#/sdm")
        # Wait for tree view (using input placeholder instead of text to avoid encoding issues)
        await self._page.wait_for_selector('input[placeholder*="Tìm kiếm"]', timeout=30000)
        
        # Click to expand TỈNH Đồng Nai and select TỔ Long Khánh
        # Use javascript evaluation to find and click nodes by text
        await self._page.evaluate('''() => {
            const listItems = Array.from(document.querySelectorAll('li, div, span, a'));
            
            // 1. Expand TỈNH Đồng Nai
            const dnNode = listItems.find(el => el.textContent && el.textContent.includes('TỈNH Đồng Nai') && !el.textContent.includes('Kho'));
            if (dnNode) {
                // Find nearest expand icon (often an i or span nearby)
                const expandIcon = dnNode.closest('li, div').querySelector('.fa-plus, .tree-icon, i');
                if (expandIcon) expandIcon.click();
                else dnNode.click(); 
            }
        }''')
        
        await asyncio.sleep(2) # wait for tree to expand
        
        # 2. Click TỔ Long Khánh using Playwright text selector
        logger.info("DataSite Scraper: Selecting TỔ Long Khánh...")
        try:
            await self._page.click('text="TỔ Long Khánh"')
        except:
            # Fallback if text is split
            await self._page.evaluate('''() => {
                const nodes = Array.from(document.querySelectorAll('.tree-node, .tree-title, span, a'));
                const target = nodes.find(n => n.textContent && n.textContent.includes('TỔ Long Khánh'));
                if (target) target.click();
            }''')
        
        await asyncio.sleep(2) # wait for right pane to load

    async def download_export_js(self, js_eval: str, filename_prefix: str):
        """Trigger a download using JS evaluation and return the local path."""
        logger.info(f"DataSite Scraper: Triggering download {filename_prefix} via JS...")
        try:
            async with self._page.expect_download(timeout=60000) as download_info:
                await self._page.evaluate(js_eval)
            
            download = await download_info.value
            
            # Ensure downloads directory exists
            downloads_dir = os.path.join(os.getcwd(), 'tmp', 'downloads')
            os.makedirs(downloads_dir, exist_ok=True)
            
            # Create absolute path
            original_filename = download.suggested_filename
            safe_filename = f"{filename_prefix}_{original_filename}"
            final_path = os.path.join(downloads_dir, safe_filename)
            
            await download.save_as(final_path)
            logger.info(f"DataSite Scraper: File downloaded to {final_path}")
            return final_path
        except Exception as e:
            logger.error(f"DataSite Scraper: Download failed for {filename_prefix}: {e}")
            try: await self._page.screenshot(path=f'tmp/debug_download_failed_{filename_prefix}.png')
            except: pass
            return None

    async def download_export(self, button_selector: str, filename_prefix: str):
        """Trigger a download and return the local path."""
        async with self._page.expect_download() as download_info:
            await self._page.click(button_selector)
        
        download = await download_info.value
        path = os.path.join(DOWNLOAD_DIR, f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx")
        await download.save_as(path)
        logger.info(f"DataSite Scraper: Downloaded {path}")
        return path

    async def sync_station_general(self):
        """Phase 2: Sync General Station Info."""
        try:
            await self._log("Bắt đầu Phase 2: Đồng bộ thông tin chung trạm...")
            await self.goto_sdm()
            await self.select_unit()
            
            # Click Export All for the unit
            path = await self.download_export('text="XUẤT TOÀN BỘ DỮ LIỆU KHU VỰC"', "general")
            if path:
                from datasite_utils import import_thong_tin_chung
                await self._log("Đang import dữ liệu thông tin chung...")
                count = import_thong_tin_chung(path)
                await self._log(f"Đã cập nhật {count} trạm vào danh sách.")
                # Cleanup
                if os.path.exists(path):
                    os.remove(path)
                    await self._log(f"Đã dọn dẹp file tạm: {os.path.basename(path)}")
                return count
            return 0
        except Exception as e:
            await self._log(f"Lỗi đồng bộ thông tin trạm: {str(e)}")
            return 0

    async def sync_modal_assets(self, label, prefix):
        """Export asset category via the 'Xuất dữ liệu tài sản' modal."""
        logger.info(f"DataSite Scraper: Exporting category {label} via modal...")
        try:
            # 0. Ensure we are on the 'Tài sản' tab
            await self._page.evaluate('''() => {
                const tabs = Array.from(document.querySelectorAll('a, .tabs-title'));
                const assetTab = tabs.find(t => t.textContent.trim() === 'Tài sản');
                if (assetTab) {
                    if (assetTab.tagName === 'A') assetTab.click();
                    else assetTab.closest('a') ? assetTab.closest('a').click() : assetTab.click();
                }
            }''')
            await asyncio.sleep(2)
            
            # 1. Click export button (Green button) natively
            await self._page.locator('text="Xuất dữ liệu tài sản"').first.click()
            await asyncio.sleep(2)
            await asyncio.sleep(3) # wait for modal to fully render

            
            # Select category in dropdown
            # It's an AngularJS select tag. We must use Playwright's native select_option
            # But to avoid encoding issues with label, we extract the value first via JS.
            target_val, all_opts = await self._page.evaluate(f'''(label_text) => {{
                const selects = Array.from(document.querySelectorAll('select'));
                if (selects.length > 0) {{
                    const options = Array.from(selects[0].options);
                    const query = label_text.toLowerCase().trim();
                    const targetOpt = options.find(o => o.textContent && o.textContent.toLowerCase().includes(query));
                    if (targetOpt) return [targetOpt.value, []];
                    return [null, options.map(o => o.textContent)];
                }}
                return [null, []];
            }}''', label)
            
            if target_val:
                await self._page.locator('select').first.select_option(value=target_val)
                logger.info(f"DataSite Scraper: Selected option value {target_val} for {label}")
            else:
                logger.warning(f"DataSite Scraper: Could not find option value for {label}. Available: {all_opts}")
                
            await asyncio.sleep(1)
            
            # 3. Trigger Download using JS to avoid encoding issues
            js_click = '''() => {
                if (typeof $ !== 'undefined') {
                    const btn = $('.window .l-btn-text:contains("Xuất")').last();
                    if (btn.length) { btn.click(); return; }
                }
                const btns = Array.from(document.querySelectorAll('.l-btn-text, span, a, button'));
                const expBtn = btns.find(b => b.textContent && b.textContent.includes('liệu') && b.textContent.includes('Xuất'));
                if (expBtn) {
                    expBtn.click();
                }
            }'''
            
            # Start click and then take a screenshot shortly after to see if there's a loading spinner
            asyncio.create_task(self._page.evaluate(js_click))
            await asyncio.sleep(2)
            await self._page.screenshot(path=f'tmp/debug_after_js_click_{prefix}.png')
            
            # Now wait for download
            path = await self.download_export_js('() => {}', prefix)

            
            if path and os.path.exists(path):
                logger.info(f"DataSite Scraper: Downloaded to {path}...")
            
            # Close modal if it stays open
            try: 
                await self._page.evaluate('''() => {
                    const closeBtns = Array.from(document.querySelectorAll('.panel-tool-close, .l-btn-text'));
                    const closeBtn = closeBtns.find(b => b.classList.contains('panel-tool-close') || (b.textContent && b.textContent.includes('Đóng')));
                    if (closeBtn) {
                        const clickable = closeBtn.closest('a') || closeBtn.closest('button') || closeBtn;
                        clickable.click();
                    }
                }''')
                await asyncio.sleep(1)
            except: pass
            
            return path
        except Exception as e:
            logger.error(f"DataSite Scraper: Failed to sync {label} via modal: {e}")
            # Try to close modal if stuck
            try: await self._page.click('text="Đóng cửa sổ"', timeout=2000)
            except: pass
            return None

    async def sync_sidebar_assets(self, menu_path, prefix):
        """Export asset category via the top navbar ('NGHIỆP VỤ' -> ...)."""
        logger.info(f"DataSite Scraper: Exporting {prefix} via top navbar: {' -> '.join(menu_path)}")
        try:
            # First, ensure we are on the main dashboard to access navbar easily
            await self._page.goto(DATASITE_URL)
            await self._page.wait_for_selector('text="TRANG CHỦ"', timeout=15000)
            
            # Click through the menu path (e.g. NGHIỆP VỤ -> Tài sản -> Nhóm tủ 3G -> Tủ BTS 3G (1))
            for item in menu_path:
                await self._log(f"Đang nhấp vào '{item}'")
                await self._page.click(f'text="{item}"')
                await asyncio.sleep(1.5) # wait for dropdown/submenu or page load
            
            # We are now on the datagrid view for BTS
            await self._page.wait_for_selector('table', timeout=15000)
            
            # Trigger generic export (often 'Xuất Excel', 'Xuất File', or just 'Xuất dữ liệu' on these pages)
            path = await self.download_export('text="Xuất Excel", text="Xuất dữ liệu"', prefix)
            return path
        except Exception as e:
            await self._log(f"Thất bại khi đồng bộ '{prefix}' qua thanh điều hướng: {e}")
            await self._page.screenshot(path=f'tmp/debug_nav_{prefix}.png')
            return None

    async def process_downloaded_asset(self, filepath):
        if not filepath or not os.path.exists(filepath):
            return 0
            
        from datasite_utils import (
            import_cot_anten, import_phong_may, import_phong_mpd, import_may_lanh,
            import_may_phat, import_tu_nguon, import_accu, import_bts_3g,
            import_bts_4g, import_bts_5g, import_thiet_bi_vt
        )
        import zipfile
        import shutil
        import tempfile
        
        extracted_dir = None
        files_to_process = []
        
        if filepath.endswith('.zip'):
            await self._log(f"Đang giải nén tệp: {os.path.basename(filepath)}")
            extracted_dir = tempfile.mkdtemp(prefix="datasite_")
            with zipfile.ZipFile(filepath, 'r') as zip_ref:
                zip_ref.extractall(extracted_dir)
            files_to_process = [os.path.join(extracted_dir, f) for f in os.listdir(extracted_dir) if f.endswith('.xlsx')]
        else:
            files_to_process = [filepath]

        total_imported = 0
        for f in files_to_process:
            fname = os.path.basename(f).lower()
            try:
                await self._log(f"Đang xử lý dữ liệu từ file: {fname}")
                # Match based on original filenames expected by the system
                if 'cot' in fname or 'cột' in fname:
                    total_imported += import_cot_anten(f)
                elif 'phong may' in fname or 'phòng máy' in fname:
                    total_imported += import_phong_may(f)
                elif 'phong mpd' in fname or ('phòng' in fname and 'mpd' in fname):
                    total_imported += import_phong_mpd(f)
                elif 'may lanh' in fname or 'máy lạnh' in fname:
                    total_imported += import_may_lanh(f)
                elif 'may phat dien' in fname or 'máy phát điện' in fname:
                    total_imported += import_may_phat(f)
                elif 'tu nguon' in fname or 'tủ nguồn' in fname:
                    total_imported += import_tu_nguon(f)
                elif 'accu' in fname or 'ắc quy' in fname:
                    total_imported += import_accu(f)
                elif '3g' in fname:
                    total_imported += import_bts_3g(f)
                elif '4g' in fname:
                    total_imported += import_bts_4g(f)
                elif '5g' in fname:
                    total_imported += import_bts_5g(f)
                elif 'vien thong' in fname or 'viễn thông' in fname:
                    total_imported += import_thiet_bi_vt(f)
            except Exception as e:
                await self._log(f"Lỗi import file {fname}: {str(e)}")
                
        if extracted_dir and os.path.exists(extracted_dir):
            shutil.rmtree(extracted_dir)
        
        # Cleanup original download
        if os.path.exists(filepath): os.remove(filepath)
        return total_imported

    async def sync_assets(self, targets=None):
        """Phase 3: Sync Specific Assets (Infra, Equipment, Telecom)."""
        await self._log(f"Bắt đầu đồng bộ chi tiết tài sản...")
        await self.goto_sdm()
        
        results = {}
        
        # 1. HẠ TẦNG & PHỤ TRỢ (Via Modal)
        if not targets or 'infrastructure' in targets:
            infra_path = await self.sync_modal_assets("HẠ TẦNG", "infra")
            if infra_path:
                count = await self.process_downloaded_asset(infra_path)
                results['infrastructure'] = count
                await self._log(f"Đã hoàn tất đồng bộ Hạ tầng ({count} bản ghi).")

        if not targets or 'equipment' in targets:
            equip_path = await self.sync_modal_assets("PHỤ TRỢ", "equipment")
            if equip_path:
                count = await self.process_downloaded_asset(equip_path)
                results['equipment'] = count
                await self._log(f"Đã hoàn tất đồng bộ Phụ trợ ({count} bản ghi).")
        
        # 2. TỦ BTS 3G (Via Sidebar)
        if not targets or 'telecom_bts' in targets:
            bts3g_path = await self.sync_sidebar_assets(["NGHIỆP VỤ", "Tài sản", "Nhóm tủ 3G", "Tủ BTS 3G (1)"], "bts3g")
            if bts3g_path:
                count = await self.process_downloaded_asset(bts3g_path)
                results['telecom_bts'] = count
                await self._log(f"Đã hoàn tất đồng bộ Tủ BTS 3G ({count} bản ghi).")
            
            # You can add BTS 4G, 5G here similarly when ready
            # bts4g_path = await self.sync_sidebar_assets(["NGHIỆP VỤ", "Tài sản", "Nhóm tủ 4G", "Tủ BTS 4G"], "bts4g")
            # if bts4g_path:
            #     count4g = await self.process_downloaded_asset(bts4g_path)
            #     results['telecom_bts'] = results.get('telecom_bts', 0) + count4g
        
        return results

    async def sync_all(self):
        """Execute full sync sequence as per phases."""
        if not self._logged_in:
            await self.login()
        
        await self.sync_station_general()
        await self.sync_assets()
        await self._log("--- HOÀN TẤT ĐỒNG BỘ TOÀN BỘ DATASITE ---")

async def perform_datasite_sync_real(targets=None):
    """Wrapper function for routes to call."""
    from models import SystemConfig
    # Use a safe import for add_datasite_log
    try:
        from datasite_routes import add_datasite_log
    except ImportError:
        def add_datasite_log(message):
            logger.warning(f"add_datasite_log not available: {message}")
    
    # Get config from SystemConfig DB if available, fallback to env vars
    conf_user = SystemConfig.query.filter_by(key='datasite_username').first()
    conf_pass = SystemConfig.query.filter_by(key='datasite_password').first()
    
    user = conf_user.value if conf_user and conf_user.value else os.getenv('DATASITE_USER', 'cang.letan')
    pwd = conf_pass.value if conf_pass and conf_pass.value else os.getenv('DATASITE_PWD', 'Lamtuyen@4321')
    
    if not user or not pwd:
        add_datasite_log("Lỗi: Tài khoản DataSite chưa được cấu hình.")
        return False

    scraper = DataSiteScraper(user, pwd)
    try:
        await scraper.start()
        await scraper.login()

        if not targets:
            await scraper.sync_all()
        else:
            if 'general' in targets:
                await scraper.sync_station_general()
            
            asset_targets = [t for t in targets if t in ['infrastructure', 'equipment', 'telecom_bts']]
            if asset_targets:
                await scraper.sync_assets(asset_targets)

        add_datasite_log("Đồng bộ dữ liệu thành công.")
        return True
    except Exception as e:
        add_datasite_log(f"Tiến trình thất bại: {str(e)}")
        return False
    finally:
        await scraper.stop()

if __name__ == "__main__":
    # Test run
    logging.basicConfig(level=logging.INFO)
    from app import app
    with app.app_context():
        asyncio.run(perform_datasite_sync_real())
