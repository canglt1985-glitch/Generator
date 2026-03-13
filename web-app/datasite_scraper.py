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
            await self._page.goto(DATASITE_URL, wait_until="networkidle")
            
            is_sso = "auth-sso" in self._page.url
            if not is_sso and "@mobifone.vn" in self.username:
                sso_link = await self._page.query_selector('a:has-text("Đăng nhập bằng SSO")')
                if sso_link:
                    await self._log("Tài khoản @mobifone.vn: Đang chuyển hướng sang SSO...")
                    await sso_link.click()
                    await self._page.wait_for_load_state("networkidle")
                    is_sso = True
                    
            if is_sso:
                await self._log("Điền thông tin SSO...")
                await self._page.fill('input[name="username"]', self.username)
                await self._page.fill('input[name="password"]', self.password)
                await self._page.click('input[type="submit"]')
            else:
                await self._log("Điền thông tin đăng nhập DataSite nội bộ...")
                await self._page.fill('input[ng-model="modelName"]', self.username)
                await self._page.fill('input[ng-model="modelPwd"]', self.password)
                await self._page.evaluate('document.querySelector(\'input[ng-model="modelName"]\').dispatchEvent(new Event("input"))')
                await self._page.evaluate('document.querySelector(\'input[ng-model="modelPwd"]\').dispatchEvent(new Event("input"))')
                await self._page.click('button[type="submit"]', force=True)

            # Wait for navigation or API auth
            await self._page.wait_for_timeout(3000)
            await self._page.wait_for_load_state("networkidle")
            
            # Check auth success: The Angular Header removes 'ng-hide' when logged in
            try:
                await self._page.wait_for_selector('.page-header.navbar:not(.ng-hide)', timeout=15000)
                self._logged_in = True
                await self._log("Đăng nhập thành công.")
            except Exception:
                raise Exception("Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản/mật khẩu.")
        except Exception as e:
            # Fallback check
            if await self._page.query_selector('.page-header.navbar:not(.ng-hide)'):
                self._logged_in = True
                await self._log("Đăng nhập thành công (Dùng cache/session).")
            else:
                await self._log(f"Đăng nhập thất bại: {str(e)}")
                raise Exception(f"Login failed: {str(e)}")

    async def goto_sdm(self):
        """Navigate to SDM and expand tree to 'TỔ Long Khánh'."""
        logger.info("DataSite Scraper: Navigating to SDM...")
        await self._page.goto(f"{DATASITE_URL}/#/sdm")
        # Wait for tree view
        await self._page.wait_for_selector('input[placeholder*="Tìm kiếm"]', timeout=30000)
        await asyncio.sleep(3) # wait for tree to fully load
        
        # Click to expand TỈNH Đồng Nai and select TỔ Long Khánh
        await self._page.evaluate('''() => {
            const listItems = Array.from(document.querySelectorAll('li, div, span, a'));
            
            // 1. Expand TỈNH Đồng Nai
            const dnNode = listItems.find(el => el.textContent && el.textContent.includes('TỈNH Đồng Nai') && !el.textContent.includes('Kho'));
            if (dnNode) {
                const parent = dnNode.closest('li');
                // Check if already expanded (look for minus icon or expanded class)
                const isExpanded = parent && (parent.querySelector('.fa-minus') || parent.classList.contains('tree-expanded'));
                
                if (!isExpanded) {
                    const expandIcon = parent ? parent.querySelector('.fa-plus, .tree-icon') : null;
                    if (expandIcon) expandIcon.click();
                    else dnNode.click(); 
                }
            }
        }''')
        
        await asyncio.sleep(2) # wait for tree to expand
        
        # 2. Click TỔ Long Khánh
        logger.info("DataSite Scraper: Selecting TỔ Long Khánh...")
        try:
            await self._page.click('text="TỔ Long Khánh"', timeout=5000)
        except:
            await self._page.evaluate('''() => {
                const nodes = Array.from(document.querySelectorAll('.tree-node, .tree-title, span, a'));
                const target = nodes.find(n => n.textContent && n.textContent.includes('TỔ Long Khánh'));
                if (target) target.click();
            }''')
        
        await asyncio.sleep(3) # wait for right pane to load
        await self._page.screenshot(path='tmp/debug_sdm_after_selection.png')
        logger.info("DataSite Scraper: SDM area selected. Captured tmp/debug_sdm_after_selection.png")

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

    async def scrape_export_data(self, object_names: list, area: str = None) -> dict:
        """
        [Phase 03 - Deep Sync]
        Sử dụng tính năng 'Xuất dữ liệu tài sản' trên DataSite để bulk-export
        từng Đối tượng và parse file Excel về dict.

        Args:
            object_names: List tên đối tượng CHÍNH XÁC theo EXPORT_OBJECT_MAP
                          VD: ['PHÒNG MÁY', 'MÁY PHÁT ĐIỆN']
            area:         Khu vực (không dùng nếu export theo unit đã select)

        Returns:
            dict: { object_name: [list of row dicts] }
        """
        from datasite_sync_config import EXPORT_OBJECT_MAP
        results = {}

        # Đảm bảo đang ở đúng trang SDM và đã select unit
        await self.goto_sdm()

        for obj_name in object_names:
            cfg = EXPORT_OBJECT_MAP.get(obj_name)
            if not cfg:
                await self._log(f"⚠️  Bỏ qua '{obj_name}': Không có trong EXPORT_OBJECT_MAP.")
                continue

            await self._log(f"📤 Đang xuất đối tượng: {obj_name} ...")
            try:
                filepath = await self._export_object_from_modal(obj_name)
                if not filepath:
                    await self._log(f"❌ Không tải được file cho '{obj_name}'.")
                    results[obj_name] = []
                    continue

                rows = parse_exported_excel(filepath, cfg)
                results[obj_name] = rows
                await self._log(f"✅ '{obj_name}': {len(rows)} bản ghi.")

                # Cleanup file tạm
                try:
                    os.remove(filepath)
                except Exception:
                    pass

            except Exception as e:
                await self._log(f"❌ Lỗi khi xuất '{obj_name}': {e}")
                results[obj_name] = []

        return results

    async def _export_object_from_modal(self, object_name: str) -> str | None:
        """
        Mở modal 'Xuất dữ liệu tài sản', chọn đúng đối tượng trong dropdown,
        bấm Xuất dữ liệu và chờ file tải về.

        Selectors đã xác minh qua live browser debug (2026-03-11):
        - Tab Tài sản: .nav-tabs a:has-text("Tài sản")
        - Nút mở modal: button.btn-primary / button:has-text("Xuất dữ liệu tài sản")
        - Modal container: .modal.in hoặc .modal[style*="display: block"]
        - Dropdown: select.form-control đầu tiên (có placeholder "Chọn đối tượng")
        - Nút xuất trong modal: button.btn.green-meadow / button:has-text("Xuất dữ liệu")
        """
        safe_prefix = object_name.replace(' ', '_').replace('/', '-')
        try:
            # 1. Click tab Tài sản
            await self._log(f"   → Chuyển sang tab Tài sản...")
            try:
                tab = self._page.locator('.nav-tabs a, .nav li a').filter(has_text='Tài sản').first
                if await tab.count() > 0:
                    await tab.click()
                else:
                    await self._page.evaluate('''() => {
                        const tabs = Array.from(document.querySelectorAll('a'));
                        const t = tabs.find(el => el.textContent && el.textContent.trim() === 'Tài sản');
                        if (t) t.click();
                    }''')
            except Exception:
                pass
            await asyncio.sleep(2)

            # 2. Click nút "Xuất dữ liệu tài sản" (xanh lá) để mở modal
            await self._log(f"   → Click nút 'Xuất dữ liệu tài sản'...")
            
            # Đợi một chút để AJAX load các nút của tab Tài sản
            await asyncio.sleep(2)
            
            clicked = False
            # Dùng selector chính xác duy nhất để tránh click nhầm "Xuất báo cáo tổng hợp" (nút xanh dương)
            for sel in [
                'button.btn.green-meadow:has-text("Xuất dữ liệu tài sản")',
                'button:has-text("Xuất dữ liệu tài sản")',
                'a:has-text("Xuất dữ liệu tài sản")',
            ]:
                try:
                    loc = self._page.locator(sel).first
                    if await loc.count() > 0:
                        await loc.click(timeout=3000)
                        clicked = True
                        break
                except Exception:
                    continue

            if not clicked:
                # JS fallback
                await self._page.evaluate('''() => {
                    const all = Array.from(document.querySelectorAll('a, button'));
                    const btn = all.find(b => b.textContent && b.textContent.includes('Xuất dữ liệu tài sản'));
                    if (btn) btn.click();
                }''')

            # 3. Đợi modal mở (dùng selector Bootstrap modal)
            await self._log(f"   → Đợi modal hiện lên...")
            modal_visible = False
            for sel in [
                '.modal.in',
                '.modal[style*="display: block"]',
                '.modal[style*="display:block"]',
                '.modal:visible',
            ]:
                try:
                    await self._page.wait_for_selector(sel, timeout=8000)
                    modal_visible = True
                    await self._log(f"   → Modal đã mở ({sel}).")
                    break
                except Exception:
                    continue

            if not modal_visible:
                # Nếu không detect được modal qua selector, chờ cố định 4 giây
                await self._log("   ⚠️ Không detect được modal selector, chờ 4s...")
                await asyncio.sleep(4)

            # Thêm thời gian cho AJAX load options
            await asyncio.sleep(3)

            # 4. Tìm ID của đối tượng trực tiếp từ Angular $scope của các thẻ <select>
            found_val = None
            available_opts = []
            await self._log(f"   → Đang tìm '{object_name}' trong Angular $scope...")
            for attempt in range(15):  # Thử tối đa 15s
                found_val, available_opts = await self._page.evaluate('''
                    (target_name) => {
                        const sel = document.querySelector('.modal.in select[ng-model="objSelected"]') || 
                                    document.querySelector('.modal.in select:not([ng-disabled])') ||
                                    Array.from(document.querySelectorAll('.modal.in select')).find(s => s.options.length > 1);
                        
                        if (!sel || sel.options.length <= 1) return [null, ["AJAX loading or no options"]];
                        
                        let allNames = [];
                        const t = target_name.toLowerCase().trim();

                        for (const opt of sel.options) {
                            const name = opt.label || opt.text || "";
                            if (name) {
                                allNames.push(name.trim());
                                if (name.trim().toLowerCase() === t) {
                                    return [opt.value, [opt.value + ": " + name]];
                                }
                            }
                        }
                        
                        return [null, allNames];
                    }
                ''', object_name)

                if found_val:
                    await self._log(f"   ✅ Tìm thấy '{object_name}' ID: {found_val}")
                    if available_opts and len(available_opts) > 0:
                        logger.info(f"DataSite Scraper: ANGULAR SCOPE DUMP: {available_opts[0]}")
                    break
                await asyncio.sleep(1)

            if not found_val:
                await self._page.screenshot(path=f'tmp/debug_dropdown_{safe_prefix}.png')
                logger.warning(
                    f"DataSite Scraper: Không tìm thấy '{object_name}' trong dropdown. "
                    f"Các option hiện có: {available_opts[:10]}"
                )
                await self._log(f"   ❌ Không tìm thấy '{object_name}'. Opts: {available_opts[:5]}")
                await self._close_modal()
                return None

            # 5. Dùng Playwright Native Select 
            # (Dump HTML chỉ ra là native select, ko phải select2 hide)
            await self._log(f"   → Đang chọn '{object_name}' (value={found_val}) qua Playwright select_option...")
            try:
                # Cố gắng kích hoạt Angular change events bằng cách select option native
                select_loc = self._page.locator('.modal.in select[ng-model="objSelected"]')
                await select_loc.select_option(value=found_val)
                await self._log(f"   → Native select thực hiện thành công.")
            except Exception as e:
                logger.warning(f"DataSite Scraper: Native select failed: {e}")

            await asyncio.sleep(3)  # Đợi Angular update validation và bỏ disable nút xuất dữ liệu

            # 6. Bấm nút "Xuất dữ liệu" trong modal và chờ download
            await self._log(f"   → Kiểm tra trạng thái nút Export...")
            try:
                # Nút xanh trong modal: class green-jungle ng-click exportAssetData
                btn_loc = self._page.locator('.modal.in button[ng-click*="export"]:not([disabled])')
                count = await btn_loc.count()
                if count == 0:
                     btn_loc = self._page.locator('.modal.in button.green-jungle:not([disabled])')
                     count = await btn_loc.count()

                if count == 0:
                    await self._log("   → ❌ Nút Xuất dữ liệu vẫn bị disable (Angular chưa nhận object).")
                    await self._page.screenshot(path=f"tmp/debug_export_fail_{object_name.replace(' ', '_')}.png")
                    return None

                await self._log(f"   → Nút Xuất dữ liệu đã sẵn sàng. Bấm Export...")
                async with self._page.expect_download(timeout=600000) as dl_info:
                    await btn_loc.first.click(timeout=3000)
                    
                    self._is_downloading = True
                    await self._log(f"   → Đã bấm Export. Đợi 30s để xem có thông báo gì không...")
                    await asyncio.sleep(30)
                    await self._page.screenshot(path=f"tmp/debug_after_click_{object_name.replace(' ', '_')}.png")
                    await self._log(f"   → Chờ tải file về (timeout 10p)...")
                    
                download = await dl_info.value
                downloads_dir = os.path.join(os.getcwd(), 'tmp', 'ds_exports')
                os.makedirs(downloads_dir, exist_ok=True)
                
                safe_prefix = object_name.replace(' ', '_').replace('/', '_')
                ts = datetime.now().strftime('%Y%m%d_%H%M%S')
                save_path = os.path.join(downloads_dir, f"{safe_prefix}_{ts}{os.path.splitext(download.suggested_filename)[1]}")
                
                await download.save_as(save_path)
                logger.info(f"DataSite Scraper: Saved '{object_name}' → {save_path}")
                await self._log(f"   ✅ Đã tải: {os.path.basename(save_path)}")
                
                self._is_downloading = False
                await asyncio.sleep(1)
                await self._close_modal()
                return save_path

            except Exception as e:
                logger.error(f"DataSite Scraper: Download timeout/error for '{object_name}': {e}")
                self._is_downloading = False
                safe_prefix = object_name.replace(' ', '_').replace('/', '_')
                await self._page.screenshot(path=f'tmp/debug_export_fail_{safe_prefix}.png')
                await self._log(f"   ❌ Download fail: {e}")
                await self._close_modal()
                return None

        except Exception as e:
            logger.error(f"DataSite Scraper: _export_object_from_modal failed for '{object_name}': {e}")
            self._is_downloading = False
            try:
                await self._close_modal()
            except Exception:
                pass
            return None
            return None

    async def _close_modal(self):
        """Đóng bất kỳ modal/popup đang mở."""
        try:
            await self._page.evaluate('''() => {
                const closers = Array.from(document.querySelectorAll(
                    '.panel-tool-close, [class*="close"]'
                ));
                if (closers.length) { closers[closers.length - 1].click(); return; }
                const btns = Array.from(document.querySelectorAll('.l-btn-text, span, button, a'));
                const closeBtn = btns.find(b => b.textContent && (
                    b.textContent.trim() === 'Đóng' ||
                    b.textContent.trim() === 'Hủy'
                ));
                if (closeBtn) closeBtn.click();
            }''')
            await asyncio.sleep(0.8)
        except Exception:
            pass

    async def sync_all(self):
        """Execute full sync sequence as per phases."""
        if not self._logged_in:
            await self.login()
        
        await self.sync_station_general()
        await self.sync_assets()
        await self._log("--- HOÀN TẤT ĐỒNG BỘ TOÀN BỘ DATASITE ---")

def parse_exported_excel(filepath: str, obj_config: dict) -> list:
    """
    [Phase 03 - Deep Sync]
    Đọc file Excel được tải về từ DataSite Export và chuyển về
    list of dicts, áp dụng col_map từ EXPORT_OBJECT_MAP.

    Trả về:
        list: mỗi item là dict với keys chuẩn (site_id, serial, trang_thai...) + extra_data
    """
    try:
        import pandas as pd
    except ImportError:
        logger.error("parse_exported_excel: pandas chưa được cài. Chạy: pip install pandas openpyxl")
        return []

    col_map: dict = obj_config.get('col_map', {})
    loai: str = obj_config.get('loai', '')
    subcategory_name: str = None  # sẽ được set từ tên object ngoài

    try:
        df = pd.read_excel(filepath, dtype=str)
        df = df.where(pd.notnull(df), None)  # NaN → None
        df.columns = [str(c).strip() for c in df.columns]  # strip whitespace khỏi headers
    except Exception as e:
        logger.error(f"parse_exported_excel: Không đọc được file {filepath}: {e}")
        return []

    rows = []
    for _, row_series in df.iterrows():
        row = row_series.to_dict()
        mapped = {}
        extra_data = {}

        for excel_col, val in row.items():
            if val is None or (isinstance(val, str) and val.strip() == ''):
                continue
            val = str(val).strip() if val is not None else None

            # Kiểm tra xem có trong col_map không
            db_field = col_map.get(excel_col)
            if db_field:
                mapped[db_field] = val
            else:
                # Các cột không có trong col_map → đưa vào extra_data
                extra_data[excel_col] = val

        # Bỏ qua record nếu không có site_id
        site_id = mapped.get('site_id', '')
        if not site_id or not site_id.strip():
            continue

        # Chuẩn hóa site_id (uppercase)
        mapped['site_id'] = site_id.upper().strip()
        mapped['loai'] = loai
        if extra_data:
            mapped['extra_data'] = extra_data

        rows.append(mapped)

    logger.info(f"parse_exported_excel: Parsed {len(rows)} valid rows from {os.path.basename(filepath)}")
    return rows

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
