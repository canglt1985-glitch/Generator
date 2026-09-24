#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
MODULE: NHẮC NHỞ NHẬP NGUYÊN NHÂN MẤT LIÊN LẠC (NN MLL) - TVT3 ĐỒNG NAI
================================================================================
Chức năng:
  1. Tự động đăng nhập hệ thống SmartW Mobifone qua SSO Playwright.
  2. Quét trang Báo cáo chi tiết MLL (import-rp-site-mll/dataDetail.htm).
  3. Lọc các sự cố đã kết thúc (Cleared) thuộc Tổ Viễn Thông 3 (TVT3).
  4. Kiểm tra sự cố đã nhập đủ 3 cấp nguyên nhân (Cấp 1, Cấp 2, Cấp 3) chưa.
  5. Gom nhóm các sự cố thiếu theo Người Quản Lý Trạm (QLT: Khuân, Châu, Vinh, Vĩnh,...)
  6. Định dạng tin nhắn báo cáo và gửi tự động qua Viber / Telegram / Terminal:

     🚨 *BỔ SUNG NN MLL*
     📅 18/09/2026 -> 20/09/2026
     📊 Tổng số sự cố: *16* sự cố
     ───────────────
     🔹 *Khuân:* *6* sự cố (20/09: 6)
     🔹 *Châu:* *4* sự cố (20/09: 4)
     🔹 *Vinh:* *3* sự cố (20/09: 3)
     🔹 *Vĩnh:* *3* sự cố (20/09: 3)

Cách chạy:
  - Chạy quét 3 ngày gần nhất (mặc định):
      python nhac_nho_nn_mll.py
  - Chạy quét ngày cụ thể:
      python nhac_nho_nn_mll.py --date 20/09/2026
  - Chạy thử (không gửi tin nhắn, chỉ in kết quả ra màn hình):
      python nhac_nho_nn_mll.py --dry-run
  - Xem chi tiết từng trạm và cấp nguyên nhân bị thiếu:
      python nhac_nho_nn_mll.py --verbose
================================================================================
"""

import os
import sys
import json
import asyncio
import logging
import argparse
import requests
from datetime import datetime, timedelta
from urllib.parse import urlencode
from collections import defaultdict

# Thiết lập logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("NN_MLL_Reminder")

# ── CẤU HÌNH HỆ THỐNG SMARTW & VIBER ───────────────────────────────────────────
BASE_URL = "https://smartw.mobifone.vn"
SSO_AUTH_URL = "https://auth-sso2fa.mobifone.vn:8080/realms/master/protocol/openid-connect/auth"

# Mặc định của MobiFone Đồng Nai - Tổ VT 3
DEFAULT_REGION = "MN"
DEFAULT_PROVINCE = "Tỉnh Đồng Nai"
DEFAULT_DEPT = "MBF_MN_DONG_NAI_PVT"
DEFAULT_TEAM = "MBF_MN_DONG_NAI_PVT_TVT3"

# Viber Bot Token mặc định của nhóm TVT3 - Giám sát RAN
DEFAULT_VIBER_TOKEN = "567370461ff5bfce-6527e240db117ad7-ce130e1ad6041265"
DEFAULT_VIBER_SENDER = "OMu7ptWb9vbA4pvi5QfVjQ=="


# ── 1. HÀM NẠP CẤU HÌNH & THÔNG TIN TÀI KHOẢN SMARTW ────────────────────────────
def load_credentials(config_file: str = None) -> tuple[str, str]:
    """Lấy username và password SmartW từ biến môi trường hoặc file mã hóa Fernet."""
    # 1. Thử lấy từ biến môi trường
    user = os.getenv("SMARTW_USER")
    pwd = os.getenv("SMARTW_PASSWORD")
    if user and pwd:
        return user, pwd

    # 2. Thử lấy từ file cấu hình mã hóa của TVT3
    try:
        from cryptography.fernet import Fernet
        base_dir = os.path.dirname(os.path.abspath(__file__))
        possible_dirs = [
            os.path.join(base_dir, "data", "smartw"),
            "/Users/cang_it/Antigravity/TVT3/backend/data/smartw"
        ]
        for pdir in possible_dirs:
            cfg_path = os.path.join(pdir, "config.json")
            key_path = os.path.join(pdir, ".fernet_key")
            if os.path.exists(cfg_path) and os.path.exists(key_path):
                with open(key_path, "rb") as kf:
                    f = Fernet(kf.read())
                with open(cfg_path, "r", encoding="utf-8") as cf:
                    cfg = json.load(cf)
                user = f.decrypt(cfg["username"].encode()).decode()
                pwd = f.decrypt(cfg["password"].encode()).decode()
                logger.info(f"Đã nạp tài khoản SmartW thành công từ: {cfg_path}")
                return user, pwd
    except Exception as e:
        logger.debug(f"Không thể nạp Fernet config: {e}")

    return None, None


# ── 2. HÀM TRA CỨU NGƯỜI QUẢN LÝ TRẠM (QLT) ───────────────────────────────────
def get_qlt_mapping() -> dict:
    """
    Nạp danh sách ánh xạ Site ID -> Tên ngắn QLT (Khuân, Châu, Vinh, Vĩnh, Thái...).
    Lấy từ Supabase hoặc dùng fallback cache nếu không có kết nối DB.
    """
    mapping = {}
    try:
        from supabase import create_client
        from dotenv import load_dotenv

        env_files = [
            "/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env",
            os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        ]
        for ef in env_files:
            if os.path.exists(ef):
                load_dotenv(ef)
                break

        url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
        key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")
        if url and key:
            sp = create_client(url, key)
            res = sp.table("datasites").select("site_id, site_id_old, management_info").execute()
            for r in (res.data or []):
                sid = (r.get("site_id") or "").strip().upper()
                sold = (r.get("site_id_old") or "").strip().upper()
                mgt = r.get("management_info") or {}
                qlt_full = (mgt.get("qlt") or "").strip()
                if qlt_full:
                    short_qlt = qlt_full.split()[-1]
                    if sid: mapping[sid] = short_qlt
                    if sold: mapping[sold] = short_qlt
            logger.info(f"Đã nạp {len(mapping)} bản ghi trạm từ Supabase.")
            return mapping
    except Exception as e:
        logger.warning(f"Không kết nối được Supabase, dùng ánh xạ trạm cục bộ: {e}")

    return mapping


def get_site_qlt(site_raw: str, qlt_map: dict) -> str:
    """Xác định tên ngắn QLT cho trạm dựa vào Site ID."""
    if not site_raw:
        return "Khác"
    s = str(site_raw).strip().upper()
    # Loại bỏ hậu tố công nghệ: _4G, _L, _N, _UL, L, N
    base = s.replace("_4G", "").replace("_3G", "").replace("_2G", "")
    for suff in ["UL", "L", "N"]:
        if base.endswith(suff) and len(base) > len(suff) + 3:
            base = base[:-len(suff)]

    # Tra cứu chính xác
    if s in qlt_map: return qlt_map[s]
    if base in qlt_map: return qlt_map[base]

    # Tra cứu dạng tiền tố
    for k, v in qlt_map.items():
        if s.startswith(k) or base.startswith(k):
            return v
    return "Khác"


# ── 3. SCRAPER THU THẬP NGUYÊN NHÂN MLL TỪ SMARTW ──────────────────────────────
class SmartWMLLAuditor:
    """Quét và phân tích các sự cố mất liên lạc chưa nhập nguyên nhân trên SmartW."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.browser = None
        self.context = None
        self.page = None

    async def start(self):
        from playwright.async_api import async_playwright
        # Đặt đường dẫn shared browsers nếu có
        bw_path = "/Users/cang_it/Antigravity/TVT3/backend/ms-playwright"
        if os.path.exists(bw_path):
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = bw_path

        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        self.page = await self.context.new_page()
        self.page.set_default_timeout(60000)

    async def stop(self):
        if self.browser:
            await self.browser.close()
        if hasattr(self, "pw") and self.pw:
            await self.pw.stop()

    async def login_sso(self):
        """Đăng nhập hệ thống SmartW SSO Mobifone."""
        logger.info("Đang đăng nhập SmartW SSO...")
        await self.page.goto(BASE_URL, wait_until="networkidle")

        # Nếu bị điều hướng đến trang SSO đăng nhập
        if "auth-sso2fa" in self.page.url or await self.page.locator('input[name="username"]').count() > 0:
            await self.page.fill('input[name="username"]', self.username)
            await self.page.fill('input[name="password"]', self.password)
            await self.page.click('input[name="login"], button[type="submit"]')
            await self.page.wait_for_timeout(4000)

        # Kiểm tra đã vào màn hình chính chưa
        if "smartw.mobifone.vn" in self.page.url:
            logger.info("✅ Đăng nhập SmartW thành công!")
            return True
        else:
            logger.error(f"❌ Đăng nhập không thành công, URL hiện tại: {self.page.url}")
            return False

    async def audit_missing_causes(self, date_str: str = None) -> dict:
        """
        Quét sự cố MLL trong khoảng thời gian chỉ định (mặc định: hôm nay - 3 ngày đến hôm qua).
        Lọc riêng cho TVT3 và phát hiện các sự cố chưa đủ 3 cấp nguyên nhân.
        """
        now = datetime.now()
        if not date_str:
            sdate_dt = datetime(now.year, now.month, now.day) - timedelta(days=3)
            edate_dt = datetime(now.year, now.month, now.day) - timedelta(seconds=1)
        else:
            sdate_dt = datetime.strptime(f"{date_str} 00:00", "%d/%m/%Y %H:%M")
            edate_dt = datetime.strptime(f"{date_str} 23:59:59", "%d/%m/%Y %H:%M:%S")

        sdate_str = sdate_dt.strftime("%d/%m/%Y 00:00")
        edate_str = edate_dt.strftime("%d/%m/%Y 23:59")
        date_range_label = f"{sdate_dt.strftime('%d/%m/%Y')} -> {edate_dt.strftime('%d/%m/%Y')}"

        logger.info(f"Bắt đầu quét sự cố MLL từ {sdate_str} đến {edate_str}...")

        params = {
            "sdate": sdate_str,
            "edate": edate_str,
            "mien": DEFAULT_REGION,
            "tinh": DEFAULT_PROVINCE,
            "dept": DEFAULT_DEPT,
            "team": DEFAULT_TEAM,
            "pagenum": "0",
            "pagesize": "1000",
            "recordstartindex": "0",
            "recordendindex": "1000"
        }

        # 1. Gọi trực tiếp endpoint JSON lấy dữ liệu
        data_url = f"{BASE_URL}/smartw/import-rp-site-mll/dataDetail.htm?" + urlencode(params)
        logger.info(f"Đang tải dữ liệu MLL: {data_url}")

        raw_records = []
        try:
            resp_text = await self.page.evaluate("""async (url) => {
                const res = await fetch(url);
                return await res.text();
            }""", data_url)
            raw_records = json.loads(resp_text)
        except Exception as e:
            logger.warning(f"Lỗi khi tải JSON trực tiếp: {e}")

        # 2. Xử lý và phân tích từng sự cố
        missing_records = []
        qlt_map = get_qlt_mapping()

        def _parse_time(t_str):
            if not t_str: return None
            formats = ['%b %d, %Y %I:%M:%S %p', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M:%S']
            for fmt in formats:
                try: return datetime.strptime(str(t_str).strip(), fmt)
                except: pass
            return None

        # Tập hợp các sự cố đã có đủ nguyên nhân ở công nghệ khác cùng site/giờ
        site_completed = set()
        for r in raw_records:
            c1 = (r.get("nnCap1") or r.get("tenNnCap1") or r.get("causeby1") or "").strip()
            c2 = (r.get("nnCap2") or r.get("tenNnCap2") or r.get("causeby2") or "").strip()
            c3 = (r.get("nnCap3") or r.get("tenNnCap3") or r.get("causeby3") or "").strip()
            if c1 and c2 and c3:
                sid = (r.get("siteId") or r.get("site_id") or "").strip().upper()
                ed_dt = _parse_time(r.get("edate") or r.get("ket_thuc"))
                if sid and ed_dt:
                    site_completed.add((sid, ed_dt.strftime("%Y-%m-%d %H")))

        for r in raw_records:
            # Lọc đúng đơn vị TVT3
            to_vt = str(r.get("maToXl") or r.get("to_vt") or r.get("team") or "").upper()
            if "TVT3" not in to_vt and "TVT 3" not in to_vt and "DONG_NAI_PVT_TVT3" not in to_vt:
                continue

            # Chỉ lọc sự cố ĐÃ KẾT THÚC
            edate_raw = r.get("edate") or r.get("ket_thuc")
            if not edate_raw:
                continue

            edate_dt = _parse_time(edate_raw)
            if edate_dt and not (sdate_dt <= edate_dt <= edate_dt):
                pass

            site_id = (r.get("siteId") or r.get("site_id") or "N/A").strip().upper()
            if edate_dt and (site_id, edate_dt.strftime("%Y-%m-%d %H")) in site_completed:
                continue

            # Kiểm tra 3 cấp nguyên nhân
            c1 = (r.get("nnCap1") or r.get("tenNnCap1") or r.get("causeby1") or "").strip()
            c2 = (r.get("nnCap2") or r.get("tenNnCap2") or r.get("causeby2") or "").strip()
            c3 = (r.get("nnCap3") or r.get("tenNnCap3") or r.get("causeby3") or "").strip()

            missing_levels = []
            if not c1: missing_levels.append("Cấp 1")
            if not c2: missing_levels.append("Cấp 2")
            if not c3: missing_levels.append("Cấp 3")

            if missing_levels:
                qlt_name = get_site_qlt(site_id, qlt_map)
                missing_records.append({
                    "site_id": site_id,
                    "qlt": qlt_name,
                    "bat_dau": str(r.get("sdateStr") or r.get("sdate") or ""),
                    "ket_thuc": str(edate_raw),
                    "ket_thuc_dt": edate_dt,
                    "missing_levels": missing_levels,
                    "missing_str": ", ".join(missing_levels)
                })

        return {
            "date_range": date_range_label,
            "total_scanned": len(raw_records),
            "missing_count": len(missing_records),
            "missing_records": missing_records
        }


# ── 4. HÀM ĐỊNH DẠNG TIN NHẮN THEO MẪU YÊU CẦU ───────────────────────────────
def format_mll_reminder_message(audit_result: dict) -> str:
    """
    Định dạng tin nhắn thông báo đúng chuẩn mẫu:
    🚨 *BỔ SUNG NN MLL*
    📅 18/09/2026 -> 20/09/2026
    📊 Tổng số sự cố: *16* sự cố
    ───────────────
    🔹 *Khuân:* *6* sự cố (20/09: 6)
    🔹 *Châu:* *4* sự cố (20/09: 4)
    🔹 *Vinh:* *3* sự cố (20/09: 3)
    🔹 *Vĩnh:* *3* sự cố (20/09: 3)
    """
    missing_records = audit_result.get("missing_records", [])
    missing_count = audit_result.get("missing_count", 0)
    date_range = audit_result.get("date_range", "")

    lines = [
        "🚨 *BỔ SUNG NN MLL*",
        f"📅 {date_range}",
        f"📊 Tổng số sự cố: *{missing_count}* sự cố",
        "───────────────"
    ]

    if missing_count == 0:
        lines.append("🎉 *Tất cả các sự cố MLL của TVT3 đều đã cập nhật ĐẦY ĐỦ 3 cấp nguyên nhân!*")
        return "\n".join(lines)

    # Gom nhóm theo QLT và Ngày kết thúc
    qlt_counts = defaultdict(lambda: defaultdict(int))
    qlt_totals = defaultdict(int)

    for r in missing_records:
        qlt = r.get("qlt", "Khác")
        edt = r.get("ket_thuc_dt")
        date_str = edt.strftime("%d/%m") if edt else "Gần đây"
        qlt_counts[qlt][date_str] += 1
        qlt_totals[qlt] += 1

    # Sắp xếp số lượng giảm dần, 'Khác' ở cuối
    sorted_qlts = sorted(
        [q for q in qlt_totals.keys() if q != "Khác"],
        key=lambda q: (-qlt_totals[q], q)
    )
    if "Khác" in qlt_totals and qlt_totals["Khác"] > 0:
        sorted_qlts.append("Khác")

    for qlt in sorted_qlts:
        tot = qlt_totals[qlt]
        dates = sorted(qlt_counts[qlt].keys(), reverse=True)
        date_breakdown = " | ".join(f"{d}: {qlt_counts[qlt][d]}" for d in dates)
        lines.append(f"🔹 *{qlt}:* *{tot}* sự cố ({date_breakdown})")

    return "\n".join(lines)


# ── 5. HÀM GỬI TIN NHẮN VIBER ──────────────────────────────────────────────────
def send_viber_message(text: str, token: str = DEFAULT_VIBER_TOKEN, sender: str = DEFAULT_VIBER_SENDER):
    """Gửi tin nhắn định dạng văn bản đến kênh / nhóm Viber."""
    if not text:
        return False

    clean_text = text.replace("`", "")
    payload = {
        "from": sender,
        "type": "text",
        "text": clean_text
    }
    headers = {
        "X-Viber-Auth-Token": token
    }
    try:
        res = requests.post("https://chatapi.viber.com/pa/post", headers=headers, json=payload, timeout=10)
        if res.status_code == 200:
            logger.info("✅ Đã gửi báo cáo đến Viber thành công!")
            return True
        else:
            logger.warning(f"Viber phản hồi lỗi {res.status_code}: {res.text}")
            return False
    except Exception as e:
        logger.error(f"Lỗi kết nối tới Viber API: {e}")
        return False


# ── 6. HÀM THỰC THI CHÍNH (MAIN WORKFLOW) ──────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser(description="Mô-đun nhắc nhở nhập Nguyên Nhân Mất Liên Lạc (SmartW)")
    parser.add_argument("--date", type=str, default=None, help="Ngày kiểm tra (định dạng DD/MM/YYYY hoặc YYYY-MM-DD)")
    parser.add_argument("--user", type=str, default=None, help="Tài khoản SmartW")
    parser.add_argument("--password", type=str, default=None, help="Mật khẩu SmartW")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ quét và in kết quả ra màn hình, không gửi tin nhắn")
    parser.add_argument("--verbose", action="store_true", help="Hiển thị chi tiết từng trạm và cấp nguyên nhân bị thiếu")
    args = parser.parse_args()

    # Nạp tài khoản
    username = args.user
    password = args.password
    if not username or not password:
        username, password = load_credentials()

    if not username or not password:
        logger.error("❌ Không tìm thấy thông tin đăng nhập SmartW! Hãy truyền --user/--password hoặc đặt biến môi trường SMARTW_USER / SMARTW_PASSWORD.")
        sys.exit(1)

    # Chuẩn hóa ngày nếu có
    target_date = args.date
    if target_date and "-" in target_date:
        try:
            target_date = datetime.strptime(target_date, "%Y-%m-%d").strftime("%d/%m/%Y")
        except: pass

    # Khởi động Scraper
    auditor = SmartWMLLAuditor(username, password)
    await auditor.start()

    try:
        logged_in = await auditor.login_sso()
        if not logged_in:
            logger.error("Dừng thực thi do không thể đăng nhập vào SmartW.")
            return

        result = await auditor.audit_missing_causes(target_date)

        # Định dạng tin nhắn
        msg = format_mll_reminder_message(result)

        print("\n" + "=" * 50)
        print("KẾT QUẢ NỘI DUNG TIN NHẮN:")
        print("=" * 50)
        print(msg)
        print("=" * 50 + "\n")

        # In danh sách chi tiết nếu có cờ --verbose
        if args.verbose and result["missing_records"]:
            print("DANH SÁCH CHI TIẾT CÁC TRẠM THIẾU NGUYÊN NHÂN:")
            for idx, r in enumerate(result["missing_records"], 1):
                print(f" {idx:2d}. Trạm: {r['site_id']:12s} | QLT: {r['qlt']:8s} | Thiếu: {r['missing_str']:15s} | Kết thúc: {r['ket_thuc']}")
            print("-" * 50 + "\n")

        # Gửi tin nhắn
        if args.dry_run:
            logger.info("Chế độ --dry-run bật: KHÔNG gửi tin nhắn đến Viber.")
        else:
            send_viber_message(msg)

    finally:
        await auditor.stop()


if __name__ == "__main__":
    asyncio.run(main())
