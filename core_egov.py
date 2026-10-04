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
import shutil
import argparse
from pathlib import Path
from datetime import datetime
import pandas as pd

# --- Cau hinh ---
GDT_URL = "https://hoadondientu.gdt.gov.vn/"
MAX_CAPTCHA_RETRY = 3    # V1: thu 3 lan tren cung trang (nhanh, chi ~1s/lan refresh)
MAX_CAPTCHA_RETRY_V2 = 5 # V2: kien tri, thu toi da 5 lan
MAX_WORKERS = 1          # So luong browser worker chay song song (mac dinh 1 de on dinh tren GDT)

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(os.path.dirname(sys.executable))
else:
    BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))

# Keyword nhan dien dong header trong Excel
HEADER_KEYWORDS = {
    "số hóa đơn", "mã số thuế", "mst", "kh hóa đơn",
    "tổng tiền", "nguồn hđ", "ngày tháng", "cửa hàng",
    "so hoa don", "nguon hd", "tong tien", "số chứng từ",
    "ký hiệu hđ", "tổng cộng thanh toán", "ngày lập chứng từ"
}

# --- Template Detection ---
TEMPLATE_CANDIDATES = [
    BASE_DIR / "tracuuhoadon.jpg",
    BASE_DIR / "tracuuhoadon.png",
    BASE_DIR / "perfect_template.png",
]
TEMPLATE_PATH = None
for _cand in TEMPLATE_CANDIDATES:
    if _cand.exists():
        TEMPLATE_PATH = _cand
        break

try:
    from PIL import Image
    if TEMPLATE_PATH:
        with Image.open(TEMPLATE_PATH) as _tmp_img:
            SCREEN_WIDTH, SCREEN_HEIGHT = _tmp_img.size
    else:
        SCREEN_WIDTH, SCREEN_HEIGHT = 1919, 1079
except Exception:
    SCREEN_WIDTH, SCREEN_HEIGHT = 1919, 1079

OFFSET_Y = 81 
TASKBAR_HEIGHT = 48 
WEB_WIDTH = SCREEN_WIDTH
WEB_HEIGHT = SCREEN_HEIGHT - OFFSET_Y - TASKBAR_HEIGHT  # 950 px
SCALE_FACTOR = 0.9 
PL_WIDTH = int(WEB_WIDTH / SCALE_FACTOR)
PL_HEIGHT = int(WEB_HEIGHT / SCALE_FACTOR)


# ===================================================================
# UTILITIES
# ===================================================================
def _get_system_font(size: int = 11):
    """Tim font he thong tuong thich tren ca Windows, macOS va Linux."""
    from PIL import ImageFont
    font_candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "arial.ttf"
    ]
    for fc in font_candidates:
        if os.path.exists(fc):
            try:
                return ImageFont.truetype(fc, size)
            except Exception:
                pass
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()


def find_header_row(filepath: str, sheet_name=None, sheet_index: int = 0) -> int:
    """
    Quet toi da 20 dong dau, tim dong co nhieu nhat keyword header.
    Returns: chi so dong (0-indexed) de dung lam header=N khi read_excel.
    """
    try:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
        if sheet_name and sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.worksheets[sheet_index]
        best_row, best_score = 0, 0
        for i, row in enumerate(ws.iter_rows(max_row=20, values_only=True)):
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
    Vi du: '1C26MTP' -> 'C26MTP', 'K21TAA' -> 'K21TAA'
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
        raw = re.sub(r'[^\d]', '', str(tong_tien).strip())
        return raw if raw else ""
    except Exception:
        return str(tong_tien).strip()


def normalize_stt(stt_str: str) -> str:
    """Chuan hoa STT dang L1 -> L01 de sap xep tu nhien."""
    s = str(stt_str).strip()
    m = re.match(r'^([A-Za-z]+)(\d+)$', s)
    if m:
        prefix, num = m.group(1), int(m.group(2))
        return f"{prefix}{num:02d}"
    return s


def add_url_bar_to_screenshot(screenshot_path: str, url: str, title: str = "", invoice_date: str = ""):
    """
    Su dung ky thuat Sandwich Compositing de ghep ruot web vao template tracuuhoadon.jpg (Windows 11).
    """
    try:
        from PIL import Image, ImageDraw
        template_file = TEMPLATE_PATH
        if not template_file or not os.path.exists(template_file):
            for cand in TEMPLATE_CANDIDATES:
                if cand.exists():
                    template_file = cand
                    break

        if not template_file or not os.path.exists(template_file):
            print(f"  [GDT] Khong tim thay template tracuuhoadon.jpg/perfect_template.png, su dung anh goc.")
            return screenshot_path

        img_template = Image.open(template_file)
        cur_w, cur_h = img_template.size
        
        # MAGIC: Ky thuat Sandwich (Lay Header va Taskbar goc lam lop phu)
        clean_header = img_template.crop((0, 0, cur_w, OFFSET_Y))
        clean_taskbar = img_template.crop((0, cur_h - TASKBAR_HEIGHT, cur_w, cur_h)).copy()
        
        # CAP NHAT DONG HO TREN MANH TASKBAR GOC
        patch_w, patch_h = 82, 40
        empty_patch = clean_taskbar.crop((cur_w - 350, 4, cur_w - 350 + patch_w, 4 + patch_h))
        clean_taskbar.paste(empty_patch, (cur_w - 118, 4))
        
        # Xu ly gio va ngay thang
        now = datetime.now()
        time_str = now.strftime("%I:%M %p").lstrip("0")
        
        date_str = ""
        if invoice_date:
            try:
                clean_d = str(invoice_date).split()[0].strip()
                if "-" in clean_d:
                    parts = clean_d.split("-")
                    if len(parts[0]) == 4:
                        date_str = f"{int(parts[2]):02d}/{int(parts[1]):02d}/{parts[0]}"
                    else:
                        date_str = clean_d
                elif "/" in clean_d:
                    parts = clean_d.split("/")
                    if len(parts[2]) == 4:
                        date_str = f"{int(parts[0]):02d}/{int(parts[1]):02d}/{parts[2]}"
                    else:
                        date_str = clean_d
            except Exception:
                date_str = ""
        if not date_str:
            date_str = now.strftime("%d/%m/%Y")
            
        font = _get_system_font(11)
        
        # Can giua text trong khung dong ho (center_x = cur_w - 77)
        bbox_time = font.getbbox(time_str)
        tw_time = bbox_time[2] - bbox_time[0]
        bbox_date = font.getbbox(date_str)
        tw_date = bbox_date[2] - bbox_date[0]

        center_x = cur_w - 77
        x_time = int(center_x - tw_time / 2)
        x_date = int(center_x - tw_date / 2)

        draw = ImageDraw.Draw(clean_taskbar)
        draw.text((x_time, 7), time_str, fill=(0, 0, 0), font=font)
        draw.text((x_date, 23), date_str, fill=(0, 0, 0), font=font)

        final_img = Image.new("RGB", (cur_w, cur_h))
        
        # Lop Bottom: Ruot Web (Dinh sat len khung vien)
        with Image.open(screenshot_path) as web_img:
            web_img = web_img.convert("RGB")
            web_img = web_img.resize((WEB_WIDTH, WEB_HEIGHT), Image.Resampling.LANCZOS)
            final_img.paste(web_img, (0, OFFSET_Y))
        
        # Lop Top 1: Dap Header zin
        final_img.paste(clean_header, (0, 0))
        
        # Lop Top 2: Dap Taskbar hoan thien
        final_img.paste(clean_taskbar, (0, cur_h - TASKBAR_HEIGHT))
        
        # Luu JPG - chat luong 95
        jpg_path = re.sub(r'\.png$', '.jpg', screenshot_path, flags=re.IGNORECASE)
        if not jpg_path.lower().endswith(".jpg") and not jpg_path.lower().endswith(".jpeg"):
            jpg_path += ".jpg"
        final_img.save(jpg_path, "JPEG", quality=95, optimize=True)
        
        if jpg_path != screenshot_path and os.path.exists(screenshot_path):
            try:
                os.remove(screenshot_path)
            except Exception:
                pass
        return jpg_path
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
def _process_single(page, mst, ky_hieu, so_hd, tong_tien, output_dir, row_label="", max_retries=MAX_CAPTCHA_RETRY, invoice_date="", stt=""):
    tag = f"[{row_label}]" if row_label else ""
    egov_dir = Path(output_dir) / "Hoadon.JPG"
    egov_dir.mkdir(parents=True, exist_ok=True)

    safe_so = re.sub(r'[^\w\-]', '_', str(so_hd))
    stt_norm = normalize_stt(stt) if stt else "HD"
    screenshot_path = str(egov_dir / f"EGOV_{stt_norm}_{mst}_{safe_so}.png")
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

        # Dong modal nhanh neu co
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

            # Cho GDT tra API response
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
                continue

            if sig == "FOUND":
                data = _extract_result_data(page, api_json_str)
                try:
                    page.locator(".ant-table, .ant-card, [class*='result']").first.scroll_into_view_if_needed(timeout=1000)
                    time.sleep(0.2)
                    page.locator("input#cvalue").fill(cap_text, force=True)
                    page.evaluate("document.querySelectorAll('.ant-form-item-explain, .ant-form-explain').forEach(e => e.style.display = 'none'); document.querySelectorAll('.has-error').forEach(e => e.classList.remove('has-error'));")
                except: pass
                page.screenshot(path=screenshot_path, full_page=False)
                actual_screenshot = add_url_bar_to_screenshot(
                    screenshot_path, GDT_URL,
                    title=f"MST {mst} / SoHD {so_hd}",
                    invoice_date=invoice_date
                )
                print(f"  {tag} Screenshot: {Path(actual_screenshot).name}")
                print(f"  {tag}[GDT] => Tim thay hoa don")
                return {"status": "FOUND", "screenshot": actual_screenshot, "message": "Tim thay hoa don", "data": data}

            if sig == "NOT_FOUND":
                print(f"  {tag}[GDT] => Khong tim thay hoa don (GDT xac nhan)")
                return {"status": "NOT_FOUND", "screenshot": None, "message": "Khong tim thay hoa don", "data": {}}

            print(f"  {tag} Ket qua khong ro rang, thu lai...")
            continue

        return {"status": "CAPTCHA_FAIL", "screenshot": None, "message": f"GDT khong phan hoi sau {max_retries} lan thu", "data": {}}
    except Exception as e:
        print(f"  {tag} Exception: {e}")
        return {"status": "ERROR", "screenshot": None, "message": str(e), "data": {}}


# ===================================================================
# WORKER: giu 1 browser, moi HD mo context moi (AN DANH)
# ===================================================================
def _worker_process_batch(task_list, output_dir, worker_id, max_retries=MAX_CAPTCHA_RETRY, progress=None):
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
            idx, mst, ky_hieu, so_hd, tien, physical_row, stt, ngay_hd = task
            ctx = browser.new_context(
                viewport={"width": PL_WIDTH, "height": PL_HEIGHT}, locale="vi-VN",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            )
            page = ctx.new_page()
            try:
                res = _process_single(
                    page, mst, ky_hieu, so_hd, tien, output_dir,
                    f"W{worker_id}-{stt or idx}", max_retries,
                    invoice_date=ngay_hd, stt=stt
                )
            except Exception as e:
                res = {"status": "ERROR", "message": str(e), "screenshot": None}
            try: ctx.close()
            except: pass
            res.update({"idx": idx, "mst": mst, "so_hd": so_hd, "physical_row": physical_row, "stt": stt, "ngay_hd": ngay_hd})
            results.append(res)
            icon = {"FOUND": "[OK]", "NOT_FOUND": "[--]", "CAPTCHA_FAIL": "[CA]"}.get(res["status"], "[ER]")
            shot = f"| {Path(res['screenshot']).name}" if res.get("screenshot") else ""
            if progress:
                with progress["lock"]:
                    progress["done"] += 1
                    done, total = progress["done"], progress["total"]
                print(f"[TIẾN ĐỘ] {done}/{total}", flush=True)
            print(f"  {icon} STT={stt} MST={mst} SoHD={so_hd} => {res['message']} {shot}")
        browser.close()
    return results


# ===================================================================
# HELPERS NOI BO
# ===================================================================
def _get_captcha_bytes(page):
    """Lay bytes anh captcha tu trang."""
    try:
        img_el = page.locator(
            "img[src*='captcha'], img[src*='/captcha'],.ant-form-item img"
        ).first
        img_el.wait_for(timeout=4_000)
        return img_el.screenshot()
    except Exception:
        pass

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
                from urllib.request import urlopen
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
            
        data["Raw API Dump"] = api_json_str[:150]
    except Exception as e:
        data["_err"] = str(e)
    return data


# ===================================================================
# GOP ANH SCREENSHOT THANH 1 FILE PDF DUY NHAT
# ===================================================================
def merge_screenshots_to_pdf(image_paths, output_pdf_path):
    """Gop tat ca anh JPG thanh 1 file PDF duy nhat."""
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
# HAM CHINH: Doc file -> Tim header thong minh -> Chay workers
# ===================================================================
def main():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Core eGov GDT Invoice Crawler & Sandwich Compositor")
    parser.add_argument("--excel", type=str, default="", help="Đường dẫn file Excel bảng kê")
    parser.add_argument("--sheet", type=str, default="", help="Tên sheet trong Excel (mặc định HD_DongNai_67Tram hoặc sheet 0)")
    parser.add_argument("--stt", type=str, default="", help="Lọc theo STT, ví dụ: L1..L15 hoặc L1,L2,L15")
    parser.add_argument("--so-hd", type=str, default="", help="Lọc theo số hóa đơn, ví dụ: 665105,666711")
    parser.add_argument("--limit", type=int, default=0, help="Giới hạn số lượng hóa đơn cần chạy")
    parser.add_argument("--skip-existing", action="store_true", help="Bỏ qua các hóa đơn đã có file ảnh trong Hoadon.JPG/")
    parser.add_argument("--workers", type=int, default=1, help="Số browser worker chạy đồng thời (mặc định 1)")
    parser.add_argument("--output-pdf", type=str, default="1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf", help="Tên file PDF tổng hợp")
    parser.add_argument("--no-copy-web", action="store_true", help="Không tự động copy file PDF vào tvt3_v2/public/reports")
    
    args = parser.parse_args()

    output_dir = Path(os.environ.get("MOBIFONE_OUT_DIR", str(BASE_DIR)))

    # --- Tim file du lieu ---
    candidates = []
    if args.excel:
        candidates.append(Path(args.excel))
    else:
        candidates.extend([
            BASE_DIR / "Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx",
            output_dir / "Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx",
            output_dir / "Bangkenhienlieu.xlsx",
            BASE_DIR / "bangkenhienlieu.xlsx",
            BASE_DIR / "Bangkenhienlieu.xlsx"
        ])

    df = None
    src_path = None
    target_sheet = None

    for p in candidates:
        if not p.exists():
            continue
        try:
            import openpyxl
            wb = openpyxl.load_workbook(str(p), read_only=True, data_only=True)
            sheet_names = wb.sheetnames
            wb.close()

            if args.sheet:
                target_sheet = args.sheet
            elif "HD_DongNai_67Tram" in sheet_names:
                target_sheet = "HD_DongNai_67Tram"
            else:
                target_sheet = sheet_names[0]

            header_row = find_header_row(str(p), sheet_name=target_sheet)
            print(f"[GDT] File: {p.name} | Sheet: {target_sheet} | Header dong: {header_row + 1}")
            df = pd.read_excel(str(p), dtype=str, sheet_name=target_sheet, header=header_row)
            df.columns = [str(c).strip() for c in df.columns]
            df = df.loc[:, ~df.columns.str.startswith("Unnamed")].dropna(how="all")
            src_path = p
            print(f"[GDT] Doc xong: {len(df)} dong | Cot: {list(df.columns)}")
            break
        except Exception as e:
            print(f"[GDT] Khong doc duoc {p}: {e}")

    if df is None:
        print("[GDT] [LOI] Khong tim thay file bang ke hop le.")
        sys.exit(1)

    # --- Tim ten cot ---
    def find_col(*patterns):
        for p in patterns:
            for c in df.columns:
                if p in str(c).lower():
                    return c
        return None

    so_hd_col  = find_col("số chứng từ", "số hóa đơn", "so hoa don", "shdon")
    mst_col    = find_col("mã số thuế", "ma so thue", "mst")
    kh_col     = find_col("ký hiệu", "kh hóa đơn", "khhdon")
    tien_col   = find_col("tổng cộng thanh toán", "tổng tiền", "tong tien", "thành tiền")
    nguon_col  = find_col("nguồn hđ", "nguon hd", "nguon")
    ngay_col   = find_col("ngày lập chứng từ", "ngày lập", "ngày tháng")
    stt_col    = find_col("stt")

    print(f"[GDT] Cot map: STT={stt_col} | MST={mst_col} | KH={kh_col} | SoHD={so_hd_col} | Tien={tien_col} | Ngay={ngay_col}")

    if not so_hd_col or not mst_col:
        print(f"[GDT] [LOI] Khong tim thay cot can thiet. Cot hien co: {list(df.columns)}")
        sys.exit(1)

    # --- Loc hang hop le ---
    if nguon_col:
        df = df[df[nguon_col] != "FAILED"]

    # Bo hang khong co so hoa don
    df = df[
        df[so_hd_col].notna() &
        (~df[so_hd_col].astype(str).str.strip().isin(["", "nan", "None"]))
    ]

    # Neu co cot STT va dang dung HD_DongNai_67Tram, chi chon cac dong co STT bat dau bang L (L1..L15)
    if stt_col and target_sheet == "HD_DongNai_67Tram":
        df = df[df[stt_col].astype(str).str.startswith("L")]

    # --- Loc theo CLI Arguments ---
    if args.stt:
        stt_list = [s.strip().upper() for s in args.stt.split(",") if s.strip()]
        if len(stt_list) == 1 and ".." in stt_list[0]:
            # Range syntax L1..L15
            p_start, p_end = stt_list[0].split("..")
            m_s = re.match(r'^([A-Za-z]*)(\d+)$', p_start.strip())
            m_e = re.match(r'^([A-Za-z]*)(\d+)$', p_end.strip())
            if m_s and m_e:
                pref = m_s.group(1)
                s_num, e_num = int(m_s.group(2)), int(m_e.group(2))
                stt_list = [f"{pref}{n}" for n in range(s_num, e_num + 1)]
        df = df[df[stt_col].astype(str).str.upper().isin(stt_list)]
        print(f"[GDT] Loc theo STT: {stt_list} => con {len(df)} dong")

    if args.so_hd:
        target_so = [s.strip() for s in args.so_hd.split(",") if s.strip()]
        df = df[df[so_hd_col].astype(str).isin(target_so)]
        print(f"[GDT] Loc theo SoHD: {target_so} => con {len(df)} dong")

    total = len(df)
    if total == 0:
        print("[GDT] Khong co hang hop le nao sau khi loc.")
        sys.exit(0)

    # Chuan bi thu muc Hoadon.JPG
    _egov_dir = output_dir / "Hoadon.JPG"
    _egov_dir.mkdir(parents=True, exist_ok=True)

    # Prep tasks
    tasks = []
    skipped_count = 0
    for idx, (pd_idx, row) in enumerate(df.iterrows(), start=1):
        mst     = str(row.get(mst_col, "")).strip()
        ky_hieu = str(row.get(kh_col, "")).strip() if kh_col else ""
        so_hd   = str(row.get(so_hd_col, "")).strip()
        tien    = str(row.get(tien_col, "")).strip() if tien_col else ""
        ngay_hd = str(row.get(ngay_col, "")).strip() if ngay_col else ""
        stt     = str(row.get(stt_col, "")).strip() if stt_col else f"HD{idx}"

        if so_hd.endswith(".0"):
            so_hd = so_hd[:-2]
        if tien.endswith(".0"):
            tien = tien[:-2]

        stt_norm = normalize_stt(stt)
        safe_so = re.sub(r'[^\w\-]', '_', str(so_hd))
        expected_jpg = _egov_dir / f"EGOV_{stt_norm}_{mst}_{safe_so}.jpg"

        # Kiem tra skip existing neu duoc yeu cau
        if args.skip_existing and expected_jpg.exists():
            skipped_count += 1
            continue

        physical_row = pd_idx + header_row + 2
        tasks.append((idx, mst, ky_hieu, so_hd, tien, physical_row, stt, ngay_hd))

    if args.limit and args.limit > 0:
        tasks = tasks[:args.limit]
        print(f"[GDT] Gioi han chay: {args.limit} hoa don")

    if skipped_count > 0:
        print(f"[GDT] Da bo qua {skipped_count} hoa don da co san anh.")

    if not tasks:
        print("[GDT] Tat ca hoa don da co san anh hoac khong co task nao can chay.")
        # Van chay gop PDF neu co anh
        all_existing_shots = sorted(list(_egov_dir.glob("EGOV_*.jpg")))
        if all_existing_shots:
            out_pdf = _egov_dir / args.output_pdf
            merge_screenshots_to_pdf([str(p) for p in all_existing_shots], str(out_pdf))
            if not args.no_copy_web:
                web_report_dir = BASE_DIR / "tvt3_v2" / "public" / "reports"
                web_report_dir.mkdir(parents=True, exist_ok=True)
                target_web_pdf = web_report_dir / args.output_pdf
                shutil.copy2(out_pdf, target_web_pdf)
                print(f"[GDT] Da copy sang Web: {target_web_pdf}")
        sys.exit(0)

    workers_count = max(1, min(args.workers, MAX_WORKERS, len(tasks)))

    print("=" * 70)
    print(f"  [GDT] KHOI DONG TRA CUU HOA DON")
    print(f"  - File     : {src_path.name}")
    print(f"  - Sheet    : {target_sheet}")
    print(f"  - Tong HD  : {len(tasks)}")
    print(f"  - Workers  : {workers_count}")
    print(f"  - Luu tai  : {_egov_dir}")
    print("=" * 70)

    t_start = time.time()
    import threading
    progress = {"done": 0, "total": len(tasks), "lock": threading.Lock()}

    batches = [[] for _ in range(workers_count)]
    for i, t in enumerate(tasks):
        batches[i % workers_count].append(t)

    all_results = [[] for _ in range(workers_count)]
    threads = []
    for w_id in range(workers_count):
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

    # --- VONG 2: Thu lai hoa don loi ---
    failed_results = [r for r in results if r["status"] != "FOUND"]
    if failed_results:
        print(f"\n  [GDT] Phat hien {len(failed_results)} hoa don chua on. Bat dau RE-TRY vong 2...")
        retry_idx = [r["idx"] for r in failed_results]
        retry_tasks = [t for t in tasks if t[0] in retry_idx]
        results = [r for r in results if r["status"] == "FOUND"]
        
        progress_v2 = {"done": 0, "total": len(retry_tasks), "lock": threading.Lock()}
        batches_v2 = [[] for _ in range(workers_count)]
        for i, t in enumerate(retry_tasks):
            batches_v2[i % workers_count].append(t)
        all_results_v2 = [[] for _ in range(workers_count)]
        threads_v2 = []
        for w_id in range(workers_count):
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

    elapsed = time.time() - t_start
    mm, ss = divmod(int(elapsed), 60)

    found_list   = [r for r in results if r["status"] == "FOUND"]
    nfound_list  = [r for r in results if r["status"] == "NOT_FOUND"]
    cap_list     = [r for r in results if r["status"] == "CAPTCHA_FAIL"]
    err_list     = [r for r in results if r["status"] == "ERROR"]

    print("\n" + "=" * 70)
    print(f"  [GDT] KET QUA TONG HOP")
    print(f"  - Tong HD xu ly       : {len(tasks)}")
    print(f"  - Thanh cong          : {len(found_list)}")
    print(f"  - That bai            : {len(nfound_list) + len(cap_list) + len(err_list)}")
    print(f"  - Khong tim thay [--] : {len(nfound_list)}")
    print(f"  - CAPTCHA that bai [CA]: {len(cap_list)}")
    print(f"  - Loi khac        [ER]: {len(err_list)}")
    print(f"  - Thoi gian chay      : {mm}m {ss}s")

    # Quet tat ca cac anh hien co trong Hoadon.JPG de gop PDF day du nhat
    all_jpgs = sorted(list(_egov_dir.glob("EGOV_*.jpg")), key=lambda p: p.name)
    if all_jpgs:
        print(f"  - Tim thay {len(all_jpgs)} anh JPG trong {_egov_dir}")
        merged_pdf_path = str(_egov_dir / args.output_pdf)
        merge_screenshots_to_pdf([str(p) for p in all_jpgs], merged_pdf_path)
        print(f"  - Da gop PDF tong hop tai : {merged_pdf_path}")

        # Sao chep sang web
        if not args.no_copy_web:
            web_report_dir = BASE_DIR / "tvt3_v2" / "public" / "reports"
            web_report_dir.mkdir(parents=True, exist_ok=True)
            target_web_pdf = web_report_dir / args.output_pdf
            try:
                shutil.copy2(merged_pdf_path, target_web_pdf)
                print(f"  - Da cap nhat web public : {target_web_pdf}")
            except Exception as e:
                print(f"  - Khong the copy sang web: {e}")

    # Ghi ket qua vao Excel
    try:
        import openpyxl
        from copy import copy
        from openpyxl.styles import PatternFill, Border, Side, Alignment
        wb = openpyxl.load_workbook(src_path)
        ws = wb[target_sheet] if target_sheet in wb.sheetnames else wb.worksheets[0]
        
        header_r = header_row + 1
        max_c = ws.max_column
        e_col = None
        for c in range(1, max_c + 1):
            if str(ws.cell(row=header_r, column=c).value).strip() == "EGOV_CHECK":
                e_col = c
                break
        
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
                
        out_xlsx = _egov_dir / f"2_EGOV_{src_path.name}"
        wb.save(out_xlsx)
        print(f"  - File Excel Ket Qua tai : {out_xlsx}")
    except Exception as e:
        print(f"  - Loi luu Excel Ket Qua  : {e}")

    print("=" * 70)


if __name__ == "__main__":
    main()
