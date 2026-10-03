"""
core_egov.py — Module tra cuu hoa don dien tu tren Cong GDT
URL: https://hoadondientu.gdt.gov.vn/
Chay doc lap: python core_egov.py
"""

import os
import sys
import re
import time
import base64
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen

import pandas as pd

# --- Cau hinh ---
GDT_URL = "https://hoadondientu.gdt.gov.vn/"
MAX_CAPTCHA_RETRY = 3    # V1: thu 3 lan tren cung trang (nhanh, chi ~1s/lan refresh)
MAX_CAPTCHA_RETRY_V2 = 5 # V2: kien tri, thu toi da 5 lan
MAX_WORKERS = 3          # So luong browser chay song song

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(os.path.dirname(sys.executable))
else:
    BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))

# Keyword nhan dien dong header trong Excel
HEADER_KEYWORDS = {
    "số hóa đơn", "mã số thuế", "mst", "kh hóa đơn",
    "tổng tiền", "nguồn hđ", "ngày tháng", "cửa hàng",
    "so hoa don", "nguon hd", "tong tien"
}

try:
    from PIL import Image
    _img_template_path = BASE_DIR / "perfect_template.png"
    with Image.open(_img_template_path) as _tmp_img:
        SCREEN_WIDTH, SCREEN_HEIGHT = _tmp_img.size
except Exception:
    SCREEN_WIDTH, SCREEN_HEIGHT = 1920, 1080

OFFSET_Y = 81 
TASKBAR_HEIGHT = 48 
WEB_WIDTH = SCREEN_WIDTH
WEB_HEIGHT = SCREEN_HEIGHT - OFFSET_Y - TASKBAR_HEIGHT + 20
SCALE_FACTOR = 0.9 
PL_WIDTH = int(WEB_WIDTH / SCALE_FACTOR)
PL_HEIGHT = int(WEB_HEIGHT / SCALE_FACTOR)


# ===================================================================
# UTILITIES
# ===================================================================
def find_header_row(filepath: str, sheet_index: int = 0) -> int:
    """
    Quet toi da 15 dong dau, tim dong co nhieu nhat keyword header.
    Returns: chi so dong (0-indexed) de dung lam header=N khi read_excel.
    """
    try:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
        ws = wb.worksheets[sheet_index]
        best_row, best_score = 0, 0
        for i, row in enumerate(ws.iter_rows(max_row=15, values_only=True)):
            vals = [str(v).lower().strip() if v is not None else "" for v in row]
            score = sum(
                1 for v in vals
                if any(kw in v for kw in HEADER_KEYWORDS)
            )
            if score > best_score:
                best_score, best_row = score, i
        wb.close()
        return best_row
    except Exception:
        return 0


def clean_ky_hieu(kh: str) -> str:
    """
    Chuan hoa ky hieu hoa don:
    GDT chi nhan phan KY HIEU (khong co MAU SO dau).
    Vi du: '1C26MPL' -> 'C26MPL', 'K21TAA' -> 'K21TAA'
    """
    kh = str(kh).strip()
    if not kh or kh.lower() in ["nan", "none", ""]:
        return ""
    # Neu bat dau bang 1 chu so + chu cai -> bo so dau (la mau so)
    m = re.match(r'^\d([A-Za-z].*)$', kh)
    if m:
        return m.group(1)
    return kh


def to_int_str(tong_tien: str) -> str:
    """
    Chuan hoa so tien: chi giu so nguyen, he thong GDT tu phan cach.
    Vi du: '1947000.0' -> '1947000', '1.947.000' -> '1947000'
    """
    try:
        raw = re.sub(r'[^\d]', '', str(tong_tien).strip())  # Chi giu chu so
        return raw if raw else ""
    except Exception:
        return str(tong_tien).strip()


def add_url_bar_to_screenshot(screenshot_path: str, url: str, title: str = ""):
    """
    Sử dụng kỹ thuật Sandwich Compositing để ghép ruột web vào template màn hình Windows hoàn hảo.
    Vẫn giữ nguyên tên hàm để không break logic hiện tại của hệ thống.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
        template_path = os.path.join(BASE_DIR, "perfect_template.png")
        if not os.path.exists(template_path):
            print(f"  [GDT] Khong tim thay perfect_template.png, su dung anh goc.")
            return screenshot_path

        img_template = Image.open(template_path)
        
        # MAGIC: Kỹ thuật Sandwich (Lấy Header và Taskbar gốc làm lớp phủ)
        clean_header = img_template.crop((0, 0, SCREEN_WIDTH, OFFSET_Y))
        clean_taskbar = img_template.crop((0, SCREEN_HEIGHT - TASKBAR_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT))
        
        final_img = Image.new("RGB", (SCREEN_WIDTH, SCREEN_HEIGHT))
        
        # Lớp Bottom: Ruột Web (Dính sát lên khung viền)
        with Image.open(screenshot_path) as web_img:
            web_img = web_img.convert("RGB")
            web_img = web_img.resize((WEB_WIDTH, WEB_HEIGHT), Image.Resampling.LANCZOS)
            final_img.paste(web_img, (0, OFFSET_Y - 2))
        
        # Lớp Top 1: Đắp Header zin
        final_img.paste(clean_header, (0, 0))
        
        # CẬP NHẬT ĐỒNG HỒ TRÊN MẢNH TASKBAR GỐC
        empty_patch = clean_taskbar.crop((SCREEN_WIDTH - 400, 4, SCREEN_WIDTH - 280, 45))
        clean_taskbar.paste(empty_patch, (SCREEN_WIDTH - 112, 4))
        
        now = datetime.now()
        time_str = now.strftime("%I:%M %p").lstrip("0")
        date_str = now.strftime("%d/%m/%Y")
        
        draw = ImageDraw.Draw(clean_taskbar)
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 12)
        except Exception:
            try:
                font = ImageFont.truetype("arial.ttf", 12)
            except Exception:
                font = ImageFont.load_default()

        draw.text((SCREEN_WIDTH - 75, 8), time_str, fill=(0,0,0), font=font)
        draw.text((SCREEN_WIDTH - 85, 26), date_str, fill=(0,0,0), font=font)
        
        # Lớp Top 2: Đắp Taskbar hoàn thiện
        final_img.paste(clean_taskbar, (0, SCREEN_HEIGHT - TASKBAR_HEIGHT))
        
        # Luu JPG - nho hon PNG ~3-5x
        jpg_path = re.sub(r'\.png$', '.jpg', screenshot_path, flags=re.IGNORECASE)
        final_img.save(jpg_path, "JPEG", quality=92, optimize=True)
        
        if jpg_path != screenshot_path:
            try:
                import os as _os; _os.remove(screenshot_path)
            except Exception:
                pass
            return jpg_path
        return screenshot_path
    except Exception as e:
        print(f"  [GDT] Loi render Sandwich Compositing: {e}")
        return screenshot_path


# ===================================================================
# CAPTCHA SOLVER
# ===================================================================
_ocr_instance = None

def solve_captcha(img_bytes: bytes) -> str:
    global _ocr_instance
    if _ocr_instance is None:
        import ddddocr
        _ocr_instance = ddddocr.DdddOcr(show_ad=False)
    try:
        raw = _ocr_instance.classification(img_bytes)
        return re.sub(r'[^A-Za-z0-9]', '', raw).strip()
    except Exception as e:
        print(f"  [GDT_OCR] Loi: {e}")
        return ""


# ===================================================================
# XU LY 1 DONG HOA DON (voi page da co san — khong launch browser)
# ===================================================================
def _process_single(page, mst, ky_hieu, so_hd, tong_tien, output_dir, row_label="", max_retries=MAX_CAPTCHA_RETRY):
    tag = f"[{row_label}]" if row_label else ""
    egov_dir = Path(output_dir) / "Hoadon.JPG"
    egov_dir.mkdir(parents=True, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_so = re.sub(r'[^\w\-]', '_', str(so_hd))
    screenshot_path = str(egov_dir / f"EGOV_{mst}_{safe_so}_{ts}.png")
    ky_hieu_clean = clean_ky_hieu(ky_hieu)
    tong_tien_str = to_int_str(tong_tien) if tong_tien else ""

    try:
        print(f"  {tag} Truy cap... MST={mst} | KH={ky_hieu_clean} | SoHD={so_hd} | Tien={tong_tien_str}")
        page.goto(GDT_URL, timeout=30_000, wait_until="domcontentloaded")
        page.add_style_tag(content="::-webkit-scrollbar { display: none !important; }")
        captured_api = {"raw": ""}
        def handle_res(response):
            try:
                if response.request.method == "POST" and "application/json" in response.headers.get("content-type", ""):
                    captured_api["raw"] += str(response.json()).lower() + " | "
            except: pass
        page.on("response", handle_res)

        # Dong modal nhanh
        try:
            page.keyboard.press("Escape")
            time.sleep(0.3)
            for sel in [".ant-modal-close-x", "button.ant-modal-close"]:
                try: page.locator(sel).first.click(timeout=500)
                except: pass
        except: pass

        # Cho form
        try: page.wait_for_selector("input#nbmst", timeout=12_000)
        except:
            return {"status": "ERROR", "screenshot": None, "message": "Form khong hien ra", "data": {}}

        # Dien form
        page.fill("input#nbmst", mst)
        try:
            rendered = page.inner_text(".ant-select-selection__rendered")
            if "giá trị gia tăng" not in rendered:
                page.click("div.ant-select-selection--single", timeout=2_000)
                time.sleep(0.3)
                page.locator(".ant-select-dropdown-menu-item:has-text('Hóa đơn điện tử giá trị gia tăng')").click(timeout=2_000)
        except: pass
        if ky_hieu_clean: page.fill("input#khhdon", ky_hieu_clean)
        page.fill("input#shdon", str(so_hd).strip())
        if tong_tien_str: page.fill("input#tgtttbso", tong_tien_str)

        # VONG LAP CAPTCHA
        for attempt in range(1, max_retries + 1):
            print(f"  {tag} CAPTCHA lan {attempt}/{max_retries}...")
            captcha_bytes = _get_captcha_bytes(page)
            if not captcha_bytes:
                time.sleep(0.3); continue
            cap_text = solve_captcha(captcha_bytes)
            print(f"  {tag} OCR => '{cap_text}'")
            if not cap_text or len(cap_text) < 3:
                time.sleep(0.3); continue

            page.fill("input#cvalue", cap_text)
            captured_api["raw"] = ""
            try: page.locator("button.ant-btn-primary").first.click(force=True, timeout=500)
            except: page.evaluate("document.querySelector('button.ant-btn-primary').click()")

            # Cho GDT tra API response — thoat NGAY khi co data, khong sleep co dinh
            for _ in range(25):  # 25 x 0.2s = 5s max
                if captured_api["raw"]:
                    break
                time.sleep(0.2)

            api_json_str = captured_api["raw"]
            has_table = page.locator(".ant-table-tbody tr").count() > 0
            try: body_lower = page.inner_text("body", timeout=2000).lower()
            except: body_lower = ""

            sig = None
            if has_table or "tồn tại hóa đơn" in body_lower or "tồn tại hóa đơn" in api_json_str:
                sig = "FOUND"
            elif "hợp lệ" in body_lower and "không hợp lệ" not in body_lower:
                sig = "FOUND"
            elif "không tồn tại hóa đơn có thông tin" in body_lower or "không tồn tại hóa đơn" in api_json_str:
                sig = "NOT_FOUND"
            elif any(k in body_lower or k in api_json_str for k in [
                "mã xác nhận không đúng", "captcha không đúng", "sai mã xác nhận",
                "invalid captcha", "sai captcha", "chưa nhập mã captcha", "sai mã"]):
                sig = "CAPTCHA_BAD"

            if sig == "CAPTCHA_BAD":
                print(f"  {tag} CAPTCHA SAI, thu lai...")
                continue  # GDT tu refresh captcha moi, chi can doc lai

            if sig == "FOUND":
                data = _extract_result_data(page, api_json_str)
                try:
                    page.locator(".ant-table, .ant-card, [class*='result']").first.scroll_into_view_if_needed(timeout=1000)
                    time.sleep(0.2)
                    page.locator("input#cvalue").fill(cap_text, force=True)
                    page.evaluate("document.querySelectorAll('.ant-form-item-explain, .ant-form-explain').forEach(e => e.style.display = 'none'); document.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));")
                except: pass
                page.screenshot(path=screenshot_path, full_page=False)
                actual_screenshot = add_url_bar_to_screenshot(screenshot_path, GDT_URL, title=f"MST {mst} / SoHD {so_hd}")
                print(f"  {tag} Screenshot: {Path(actual_screenshot).name}")
                print(f"  {tag}[GDT] => Tim thay hoa don")
                return {"status": "FOUND", "screenshot": actual_screenshot, "message": "Tim thay hoa don", "data": data}

            if sig == "NOT_FOUND":
                print(f"  {tag}[GDT] => Khong tim thay hoa don (GDT xac nhan)")
                return {"status": "NOT_FOUND", "screenshot": None, "message": "Khong tim thay hoa don", "data": {}}

            print(f"  {tag} Ket qua khong ro rang, thu lai...")
            continue  # Khong lam gi them, chi doc lai captcha

        return {"status": "CAPTCHA_FAIL", "screenshot": None, "message": f"GDT khong phan hoi sau {max_retries} lan thu", "data": {}}
    except Exception as e:
        print(f"  {tag} Exception: {e}")
        return {"status": "ERROR", "screenshot": None, "message": str(e), "data": {}}


# ===================================================================
# WORKER: giu 1 browser, moi HD mo context moi (AN DANH) de tranh luu cookie/cache
# ===================================================================
def _worker_process_batch(task_list, output_dir, worker_id, max_retries=MAX_CAPTCHA_RETRY, progress=None):
    """1 browser, moi HD = 1 context moi (incognito). Khong bi dinh cookie/cache."""
    # Hien thi tien do ngay khi bat dau worker de tranh freeze UI
    if progress:
        with progress["lock"]:
            print(f"[TIẾN ĐỘ] {progress['done']}/{progress['total']}", flush=True)
    from playwright.sync_api import sync_playwright
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"]
        )
        for task in task_list:
            idx, mst, ky_hieu, so_hd, tien, physical_row = task
            # Moi HD = 1 context AN DANH moi hoan toan (khong cookie, khong cache)
            ctx = browser.new_context(
                viewport={"width": PL_WIDTH, "height": PL_HEIGHT}, locale="vi-VN",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
            page = ctx.new_page()
            try:
                res = _process_single(page, mst, ky_hieu, so_hd, tien, output_dir, f"W{worker_id}-{idx}", max_retries)
            except Exception as e:
                res = {"status": "ERROR", "message": str(e), "screenshot": None}
            # Dong context ngay lap tuc de xoa sach moi du lieu phien
            try: ctx.close()
            except: pass
            res.update({"idx": idx, "mst": mst, "so_hd": so_hd, "physical_row": physical_row})
            results.append(res)
            icon = {"FOUND": "[OK]", "NOT_FOUND": "[--]", "CAPTCHA_FAIL": "[CA]"}.get(res["status"], "[ER]")
            shot = f"| {Path(res['screenshot']).name}" if res.get("screenshot") else ""
            # In tie^'n do^. cho GUI (thread-safe counter)
            if progress:
                with progress["lock"]:
                    progress["done"] += 1
                    done, total = progress["done"], progress["total"]
                print(f"[TIẾN ĐỘ] {done}/{total}", flush=True)
            print(f"  {icon} MST={mst} SoHD={so_hd} => {res['message']} {shot}")
        browser.close()
    return results


# ===================================================================
# HELPERS NOI BO
# ===================================================================
def _get_captcha_bytes(page) -> bytes | None:
    """Lay bytes anh captcha tu trang."""
    # Cach 1: screenshot element
    try:
        img_el = page.locator(
            "img[src*='captcha'], img[src*='/captcha'],.ant-form-item img"
        ).first
        img_el.wait_for(timeout=4_000)
        return img_el.screenshot()
    except Exception:
        pass

    # Cach 2: JavaScript lay src
    try:
        src = page.evaluate("""() => {
            for (const img of document.querySelectorAll('img')) {
                if (img.src && (img.src.includes('captcha') ||
                    (img.offsetWidth > 0 && img.offsetWidth < 300 && img.offsetHeight < 120)))
                    return img.src;
            }
            return null;
        }""")
        if src:
            if src.startswith("data:image"):
                return base64.b64decode(src.split(",", 1)[1])
            elif src.startswith("http"):
                return urlopen(src, timeout=8).read()
    except Exception:
        pass
    return None


def _refresh_captcha(page):
    for sel in ["button.ant-btn-icon-only", ".anticon-reload"]:
        try:
            page.locator(sel).first.click()
            time.sleep(0.3)
            return
        except Exception:
            pass


def _has_result(page, api_json_str="") -> bool:
    try:
        body = page.inner_text("body").lower()
        combined_text = body + " | " + api_json_str
        
        if "không tồn tại hóa đơn" in combined_text or "không tìm thấy" in combined_text:
            return False
        
        positive_kw = [
            "tồn tại hóa đơn", "trạng thái xử lý hoá đơn", "hợp lệ", "thông tin hóa đơn"
        ]
        if any(kw in combined_text for kw in positive_kw):
            return True
        try:
            page.wait_for_selector(".ant-table-tbody tr", timeout=800)
        except:
            pass
        return page.locator(".ant-table-tbody tr").count() > 0
    except Exception:
        return False

def _extract_result_data(page, api_json_str="") -> dict:
    data = {}
    try:
        rows = page.locator(".ant-table-tbody tr")
        if rows.count() > 0:
            cells = rows.first.locator("td")
            data["raw"] = " | ".join(
                cells.nth(i).inner_text() for i in range(cells.count())
            )
        for item in page.locator(".ant-descriptions-item").all():
            try:
                label = item.locator(".ant-descriptions-item-label").inner_text().strip()
                value = item.locator(".ant-descriptions-item-content").inner_text().strip()
                if label:
                    data[label] = value
            except Exception:
                pass
        
        body = page.inner_text("body").lower()
        combined_text = body + " | " + api_json_str
        
        if "không tồn tại hóa đơn" in combined_text or "không tìm thấy" in combined_text:
            data["Trang thai GDT"] = "Khong ton tai"
        elif "tồn tại hóa đơn" in combined_text:
            data["Trang thai GDT"] = "Hop le (Ton tai)"
        elif "không hợp lệ" in combined_text:
            data["Trang thai GDT"] = "Khong hop le"
        elif "hợp lệ" in combined_text:
            data["Trang thai GDT"] = "Hop le"
            
        data["Raw API Dump"] = api_json_str[:150] # Luu vet log API de truy vet
    except Exception as e:
        data["_err"] = str(e)
    return data


# ===================================================================
# GOP ANH SCREENSHOT THANH 1 FILE PDF DUY NHAT
# ===================================================================
def merge_screenshots_to_pdf(image_paths, output_pdf_path):
    """Gop tat ca anh JPG thanh 1 file PDF duy nhat (giong cach gop PDF hoa don)."""
    try:
        from PIL import Image
        images = []
        for p in image_paths:
            if p and os.path.exists(p):
                try:
                    img = Image.open(p).convert("RGB")
                    images.append(img)
                except Exception:
                    pass
        if not images:
            return 0
        # Luu tat ca anh vao 1 PDF, moi anh la 1 trang
        images[0].save(
            output_pdf_path, "PDF",
            save_all=True,
            append_images=images[1:],
            resolution=150
        )
        print(f"  - Gop {len(images)} anh => {Path(output_pdf_path).name}")
        return len(images)
    except Exception as e:
        print(f"  - Loi gop anh thanh PDF: {e}")
        return 0


# ===================================================================
# HAM CHINH: Doc file -> Tim header thong minh -> Chay song song
# ===================================================================
def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    output_dir = Path(os.environ.get("MOBIFONE_OUT_DIR", str(BASE_DIR)))

    # --- Tim file du lieu ---
    # Khi chay tu GUI (MOBIFONE_OUT_DIR da set): chi doc file trong thu muc output
    # Khi chay doc lap (CMD, khong co env var): fallback ve BASE_DIR
    candidates = [output_dir / "Bangkenhienlieu.xlsx"]
    if "MOBIFONE_OUT_DIR" not in os.environ:
        candidates.append(BASE_DIR / "bangkenhienlieu.xlsx")
    df = None
    src_path = None
    for p in candidates:
        if not p.exists():
            continue
        try:
            header_row = find_header_row(str(p))
            print(f"[GDT] File: {p.name} | Header tim thay o dong thu {header_row + 1} (1-indexed)")
            df = pd.read_excel(str(p), dtype=str, sheet_name=0, header=header_row)
            df.columns = [str(c).strip() for c in df.columns]
            # Bo cac cot Unnamed
            df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
            # Bo hang toan NaN
            df = df.dropna(how="all")
            src_path = p
            print(f"[GDT] Doc xong: {len(df)} dong | Cot: {list(df.columns)}")
            break
        except Exception as e:
            print(f"[GDT] Khong doc duoc {p}: {e}")

    if df is None:
        print("[GDT] [LOI] Khong tim thay file Bang ke. Chay AutoBillX truoc.")
        sys.exit(1)

    # --- Tim ten cot ---
    def find_col(*patterns):
        for c in df.columns:
            cl = c.lower()
            if any(p in cl for p in patterns):
                return c
        return None

    so_hd_col  = find_col("số hóa đơn", "so hoa don", "shdon")
    mst_col    = find_col("mã số thuế", "ma so thue", "mst nguồn")
    kh_col     = find_col("kh hóa đơn", "ky hieu", "khhdon")
    tien_col   = find_col("tổng tiền", "tong tien")
    nguon_col  = find_col("nguồn hđ", "nguon hd", "nguon")

    print(f"[GDT] Cot map: MST={mst_col} | KH={kh_col} | SoHD={so_hd_col} | Tien={tien_col}")

    if not so_hd_col or not mst_col:
        print(f"[GDT] [LOI] Khong tim thay cot can thiet. Cot hien co: {list(df.columns)}")
        sys.exit(1)

    # --- Loc hang hop le ---
    if nguon_col:
        df = df[df[nguon_col] != "FAILED"]

    df = df[
        df[so_hd_col].notna() &
        (~df[so_hd_col].astype(str).str.strip().isin(["", "nan", "None"]))
    ]
    # Bo các hang summary (Nhap NL, Xuat NL, Ton...)
    if nguon_col:
        df = df[df[nguon_col].notna() & (~df[nguon_col].astype(str).str.strip().isin(["", "nan"]))]

    total = len(df)
    if total == 0:
        print("[GDT] Khong co hang hop le nao.")
        sys.exit(0)

    print("=" * 70)
    print(f"  [GDT] KHOI DONG TRA CUU")
    print(f"  - File     : {src_path.name}")
    print(f"  - Tong HDD : {total}")
    print(f"  - Luu tai  : {output_dir / 'Hoadon.JPG'}")
    print("=" * 70)

    # Chuan bi thu muc Hoadon.JPG o Main Thread de tranh xung dot nhieu luong
    _egov_dir = output_dir / "Hoadon.JPG"
    _egov_dir.mkdir(parents=True, exist_ok=True)
    _ini = _egov_dir / "desktop.ini"
    if not _ini.exists():
        try:
            content = "[.ShellClassInfo]\nFolderType=Generic\n[ViewState]\nMode=4\nVid={137E7700-3573-11CF-AE69-08002B2E1262}\n"
            _ini.write_text(content, encoding='utf-8')
            import ctypes
            ctypes.windll.kernel32.SetFileAttributesW(str(_ini), 0x02 | 0x04)
            ctypes.windll.kernel32.SetFileAttributesW(str(_egov_dir), 0x01)
        except: pass

    # Prep tasks
    tasks = []
    for idx, (pd_idx, row) in enumerate(df.iterrows(), start=1):
        mst     = str(row.get(mst_col, "")).strip()
        ky_hieu = str(row.get(kh_col, "")).strip() if kh_col else ""
        so_hd   = str(row.get(so_hd_col, "")).strip()
        tien    = str(row.get(tien_col, "")).strip() if tien_col else ""

        # Tinh dong vat ly trong file Excel: header_row (0-indexed pandas) + 2 (do openpyxl 1-indexed)
        physical_row = pd_idx + header_row + 2

        # Lam sach: KHONG strip MST, giu nguyen ca phan chi nhanh -027
        if so_hd.endswith(".0"):
            so_hd = so_hd[:-2]
        if tien.endswith(".0"):
            tien = tien[:-2]
        tasks.append((idx, mst, ky_hieu, so_hd, tien, physical_row))

    t_start = time.time()

    # Shared progress counter (thread-safe)
    import threading
    progress = {"done": 0, "total": total, "lock": threading.Lock()}
    
    # Chia tasks thanh MAX_WORKERS batch
    batches = [[] for _ in range(MAX_WORKERS)]
    for i, t in enumerate(tasks):
        batches[i % MAX_WORKERS].append(t)
    
    all_results = [[] for _ in range(MAX_WORKERS)]
    threads = []
    for w_id in range(MAX_WORKERS):
        if not batches[w_id]:
            continue
        t = threading.Thread(target=lambda wid=w_id: all_results[wid].extend(
            _worker_process_batch(batches[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY, progress)
        ))
        threads.append(t)
        t.start()
    for t in threads:
        t.join()
    
    results = []
    for r_list in all_results:
        results.extend(r_list)
    processed = len(results)

    # --- VONG 2: thu lai cac HD loi voi MAX_WORKERS ---
    failed_results = [r for r in results if r["status"] != "FOUND"]
    if failed_results:
        print(f"\n  [GDT] Phat hien {len(failed_results)} hoa don chua on. Bat dau RE-TRY vong 2...")
        retry_idx = [r["idx"] for r in failed_results]
        retry_tasks = [t for t in tasks if t[0] in retry_idx]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v2 = {"done": 0, "total": len(retry_tasks), "lock": threading.Lock()}
        batches_v2 = [[] for _ in range(MAX_WORKERS)]
        for i, t in enumerate(retry_tasks):
            batches_v2[i % MAX_WORKERS].append(t)
        all_results_v2 = [[] for _ in range(MAX_WORKERS)]
        threads_v2 = []
        for w_id in range(MAX_WORKERS):
            if not batches_v2[w_id]: continue
            t = threading.Thread(target=lambda wid=w_id: all_results_v2[wid].extend(
                _worker_process_batch(batches_v2[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY_V2, progress_v2)
            ))
            threads_v2.append(t)
            t.start()
        for t in threads_v2:
            t.join()
        for r_list in all_results_v2:
            results.extend(r_list)

    # --- VONG 3: thu lai lan 3 voi MAX_WORKERS ---
    failed_results_v3 = [r for r in results if r["status"] != "FOUND"]
    if failed_results_v3:
        print(f"\n  [GDT] Phat hien {len(failed_results_v3)} hoa don chua on. Bat dau RE-TRY vong 3...")
        retry_idx_v3 = [r["idx"] for r in failed_results_v3]
        retry_tasks_v3 = [t for t in tasks if t[0] in retry_idx_v3]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v3 = {"done": 0, "total": len(retry_tasks_v3), "lock": threading.Lock()}
        batches_v3 = [[] for _ in range(MAX_WORKERS)]
        for i, t in enumerate(retry_tasks_v3):
            batches_v3[i % MAX_WORKERS].append(t)
        all_results_v3 = [[] for _ in range(MAX_WORKERS)]
        threads_v3 = []
        for w_id in range(MAX_WORKERS):
            if not batches_v3[w_id]: continue
            t = threading.Thread(target=lambda wid=w_id: all_results_v3[wid].extend(
                _worker_process_batch(batches_v3[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY_V2, progress_v3)
            ))
            threads_v3.append(t)
            t.start()
        for t in threads_v3:
            t.join()
        for r_list in all_results_v3:
            results.extend(r_list)

    # --- VONG 4: thu lai lan 4 voi MAX_WORKERS ---
    failed_results_v4 = [r for r in results if r["status"] != "FOUND"]
    if failed_results_v4:
        print(f"\n  [GDT] Phat hien {len(failed_results_v4)} hoa don chua on. Bat dau RE-TRY vong 4...")
        retry_idx_v4 = [r["idx"] for r in failed_results_v4]
        retry_tasks_v4 = [t for t in tasks if t[0] in retry_idx_v4]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v4 = {"done": 0, "total": len(retry_tasks_v4), "lock": threading.Lock()}
        batches_v4 = [[] for _ in range(MAX_WORKERS)]
        for i, t in enumerate(retry_tasks_v4):
            batches_v4[i % MAX_WORKERS].append(t)
        all_results_v4 = [[] for _ in range(MAX_WORKERS)]
        threads_v4 = []
        for w_id in range(MAX_WORKERS):
            if not batches_v4[w_id]: continue
            t = threading.Thread(target=lambda wid=w_id: all_results_v4[wid].extend(
                _worker_process_batch(batches_v4[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY_V2, progress_v4)
            ))
            threads_v4.append(t)
            t.start()
        for t in threads_v4:
            t.join()
        for r_list in all_results_v4:
            results.extend(r_list)

    # --- VONG 5: thu lai lan 5 voi MAX_WORKERS ---
    failed_results_v5 = [r for r in results if r["status"] != "FOUND"]
    if failed_results_v5:
        print(f"\n  [GDT] Phat hien {len(failed_results_v5)} hoa don chua on. Bat dau RE-TRY vong 5...")
        retry_idx_v5 = [r["idx"] for r in failed_results_v5]
        retry_tasks_v5 = [t for t in tasks if t[0] in retry_idx_v5]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v5 = {"done": 0, "total": len(retry_tasks_v5), "lock": threading.Lock()}
        batches_v5 = [[] for _ in range(MAX_WORKERS)]
        for i, t in enumerate(retry_tasks_v5):
            batches_v5[i % MAX_WORKERS].append(t)
        all_results_v5 = [[] for _ in range(MAX_WORKERS)]
        threads_v5 = []
        for w_id in range(MAX_WORKERS):
            if not batches_v5[w_id]: continue
            t = threading.Thread(target=lambda wid=w_id: all_results_v5[wid].extend(
                _worker_process_batch(batches_v5[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY_V2, progress_v5)
            ))
            threads_v5.append(t)
            t.start()
        for t in threads_v5:
            t.join()
        for r_list in all_results_v5:
            results.extend(r_list)

    # --- VONG 6: thu lai lan 6 voi MAX_WORKERS ---
    failed_results_v6 = [r for r in results if r["status"] != "FOUND"]
    if failed_results_v6:
        print(f"\n  [GDT] Phat hien {len(failed_results_v6)} hoa don chua on. Bat dau RE-TRY vong 6 (CUOI CUNG)...")
        retry_idx_v6 = [r["idx"] for r in failed_results_v6]
        retry_tasks_v6 = [t for t in tasks if t[0] in retry_idx_v6]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v6 = {"done": 0, "total": len(retry_tasks_v6), "lock": threading.Lock()}
        batches_v6 = [[] for _ in range(MAX_WORKERS)]
        for i, t in enumerate(retry_tasks_v6):
            batches_v6[i % MAX_WORKERS].append(t)
        all_results_v6 = [[] for _ in range(MAX_WORKERS)]
        threads_v6 = []
        for w_id in range(MAX_WORKERS):
            if not batches_v6[w_id]: continue
            t = threading.Thread(target=lambda wid=w_id: all_results_v6[wid].extend(
                _worker_process_batch(batches_v6[wid], str(output_dir), wid + 1, MAX_CAPTCHA_RETRY_V2, progress_v6)
            ))
            threads_v6.append(t)
            t.start()
        for t in threads_v6:
            t.join()
        for r_list in all_results_v6:
            results.extend(r_list)

    elapsed = time.time() - t_start
    mm, ss = divmod(int(elapsed), 60)

    # --- Thong ke chi tiet ---
    found_list   = [r for r in results if r["status"] == "FOUND"]
    nfound_list  = [r for r in results if r["status"] == "NOT_FOUND"]
    cap_list     = [r for r in results if r["status"] == "CAPTCHA_FAIL"]
    err_list     = [r for r in results if r["status"] == "ERROR"]

    print("\n" + "=" * 70)
    print(f"  [GDT] KET QUA TONG HOP")
    print(f"  - Tổng hóa đơn xử lý  : {total}")
    print(f"  - Da xu ly (da chay)       : {processed}")
    print(f"  - Thành công           : {len(found_list)}")
    print(f"  - Thất bại             : {len(nfound_list) + len(cap_list) + len(err_list)}")
    print(f"  - Khong tim thay     [--]  : {len(nfound_list)}")
    print(f"  - CAPTCHA that bai   [CA]  : {len(cap_list)}")
    print(f"  - Loi khac           [ER]  : {len(err_list)}")
    print(f"  - Thoi gian chay          : {mm}m {ss}s")
    if found_list:
        print(f"  - Screenshots (JPG) tai   : {output_dir / 'Hoadon.JPG'}")
        for r in sorted(found_list, key=lambda x: x['idx']):
            shot_name = Path(r['screenshot']).name if r.get('screenshot') else '(khong co)'
            print(f"      [{r['idx']}] MST={r['mst']} SoHD={r['so_hd']} -> {shot_name}")

        # Gop tat ca screenshot thanh 1 PDF duy nhat
        all_shots = [r['screenshot'] for r in sorted(found_list, key=lambda x: x['idx']) if r.get('screenshot')]
        if all_shots:
            merged_pdf_path = str(output_dir / "Hoadon.JPG" / "1_TONG HOP HINH ANH EGOV.pdf")
            merge_screenshots_to_pdf(all_shots, merged_pdf_path)
    
    # --- Luu ket qua tro lai Excel ---
    try:
        import openpyxl
        from copy import copy
        from openpyxl.styles import PatternFill, Border, Side, Alignment
        wb = openpyxl.load_workbook(src_path)
        ws = wb.worksheets[0]
        
        # Tim/Tao cot EGOV_CHECK
        header_r = header_row + 1
        max_c = ws.max_column
        e_col = None
        for c in range(1, max_c + 1):
            if str(ws.cell(row=header_r, column=c).value).strip() == "EGOV_CHECK":
                e_col = c
                break
        
        # Neu tao moi thi lay style cua cot truoc do
        if not e_col:
            e_col = max_c + 1
            ref_cell = ws.cell(row=header_r, column=max_c)
            new_cell = ws.cell(row=header_r, column=e_col, value="EGOV_CHECK")
            if ref_cell.has_style:
                new_cell.font = copy(ref_cell.font)
                new_cell.border = copy(ref_cell.border)
                new_cell.fill = copy(ref_cell.fill)
                new_cell.alignment = copy(ref_cell.alignment)
            
        red_fill = PatternFill(start_color="FFFFC7CE", end_color="FFFFC7CE", fill_type="solid")
        green_fill = PatternFill(start_color="FFC6EFCE", end_color="FFC6EFCE", fill_type="solid")
        thin_border = Border(left=Side(style='thin'), right=Side(style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))
        center_align = Alignment(horizontal='center', vertical='center')
        
        for r in results:
            phys_r = r["physical_row"]
            status_text = "OK" if r["status"] == "FOUND" else "NOK"
            cell = ws.cell(row=phys_r, column=e_col)
            cell.value = status_text
            cell.border = thin_border
            cell.alignment = center_align
            if status_text == "NOK":
                cell.fill = red_fill
            else:
                cell.fill = green_fill
                
        out_xlsx = output_dir / "Hoadon.JPG" / "2_EGOV_Bangkenhienlieu.xlsx"
        out_xlsx.parent.mkdir(parents=True, exist_ok=True)
        wb.save(out_xlsx)
        print(f"  - File Excel Ket Qua tai  : {out_xlsx}")
    except Exception as e:
        print(f"  - Loi luu Excel Ket Qua   : {e}")

    print("=" * 70)


if __name__ == "__main__":
    main()
