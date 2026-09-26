#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
================================================================================
BOT TELEGRAM: TRA CỨU & PHÂN CÔNG SỰ CỐ MLL THEO QLT (TVT3 ĐỒNG NAI)
================================================================================
Username Bot: @LKH_VHKT_BOT (LKH-VHKT)
Token API:    7899414034:AAGjV9Hvm2z36HirN1swnGeqPLQiimR_hrw

Chức năng chính:
  1. Tự động nhận diện tin nhắn tổng hợp sự cố MLL của mạng di động.
  2. Bóc tách các mã trạm MLL theo mốc thời gian (>1H, >2H,...) và nguyên nhân (Nguồn, TD,...).
  3. Lọc riêng các trạm thuộc địa bàn quản lý của Tổ Viễn Thông 3 (TVT3).
  4. Gom nhóm và phân công tự động theo Nhân sự Quản lý trạm (QLT: Khuân, Châu, Vinh, Thái, Vĩnh...).
  5. Xuất định dạng chuẩn xác theo form TVT3.

Cách chạy:
  python bot_mll_tvt3.py
================================================================================
"""

import os
import sys
import re
import time
import json
import socket
import logging
import requests
from collections import defaultdict

# Đường dẫn thư mục và file logs
current_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(current_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(os.path.join(logs_dir, "bot_mll.log"), encoding="utf-8")
    ]
)
logger = logging.getLogger("bot_mll_tvt3")

# Telegram Bot Token
TELEGRAM_TOKEN = os.getenv("TELEGRAM_MLL_TOKEN") or "7899414034:AAGjV9Hvm2z36HirN1swnGeqPLQiimR_hrw"
API_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# Đường dẫn file cache trạm TVT3
CACHE_FILE = os.path.join(current_dir, "data", "tvt3_sites_cache.json")

# Single-instance lock
_bot_mll_lock_socket = None

def ensure_single_instance(port=59124):
    global _bot_mll_lock_socket
    try:
        _bot_mll_lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _bot_mll_lock_socket.bind(('127.0.0.1', port))
        _bot_mll_lock_socket.listen(1)
        logger.info(f"🔒 Single-instance lock acquired on 127.0.0.1:{port}")
        return True
    except (socket.error, OSError):
        logger.error(f"⛔ Đã có một tiến trình bot_mll_tvt3.py khác đang chạy (Port {port} in use). Thoát!")
        sys.exit(42)


def load_sites_cache() -> dict:
    """Nạp cơ sở dữ liệu trạm TVT3 từ file cache hoặc Supabase."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                logger.info(f"Đã nạp {len(data)} mã trạm TVT3 từ cache local.")
                return data
        except Exception as e:
            logger.warning(f"Không thể đọc cache file: {e}")

    # Fallback to Supabase
    try:
        from dotenv import load_dotenv
        from supabase import create_client
        parent_dir = os.path.dirname(current_dir)
        load_dotenv(os.path.join(parent_dir, "tvt3_v2", ".env"))
        url = os.getenv("VITE_SUPABASE_URL")
        key = os.getenv("VITE_SUPABASE_ANON_KEY")
        if url and key:
            sp = create_client(url, key)
            res = sp.table("datasites").select("site_id, site_id_old, name, location_info, management_info").execute()
            sites_data = {}
            for r in (res.data or []):
                sid = (r.get("site_id") or "").strip().upper()
                sold = (r.get("site_id_old") or "").strip().upper()
                mgt = r.get("management_info") or {}
                loc = r.get("location_info") or {}
                info = {
                    "site_id": sid,
                    "site_id_old": sold,
                    "name": r.get("name") or "",
                    "qlt": (mgt.get("qlt") or "").strip(),
                    "to_ql": (mgt.get("to_ql") or "").strip(),
                    "huyen": loc.get("huyen_cu") or loc.get("thanh_pho") or "",
                    "xa": loc.get("xa_moi") or loc.get("xa_cu") or ""
                }
                if sid: sites_data[sid] = info
                if sold: sites_data[sold] = info
            os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(sites_data, f, ensure_ascii=False, indent=2)
            logger.info(f"Đã tải và lưu {len(sites_data)} mã trạm TVT3 từ Supabase.")
            return sites_data
    except Exception as e:
        logger.error(f"Lỗi tải dữ liệu trạm từ Supabase: {e}")

    return {}


# Nạp trước cơ sở dữ liệu
SITE_CACHE = load_sites_cache()


def parse_and_assign_mll(text: str) -> str:
    """
    Phân tích văn bản tin nhắn sự cố MLL và phân công theo từng QLT thuộc TVT3.
    Tách biệt:
      - Trạm MLL của mạng di động (gán theo QLT)
      - Downlink truyền dẫn (gộp 2 đầu cảnh báo A-B và B-A làm 1 link)
    """
    lines = text.strip().splitlines()
    ordered_sites = []

    # Regex trích xuất mã trạm MobiFone: DNI... hoặc DNT... / DNX...
    site_regex = re.compile(r'\b(DNI[A-Z0-9]{3,8}|DN[A-Z]{2}[0-9]{2,3}[A-Z0-9]*)\b', re.IGNORECASE)

    # Regex trích xuất link truyền dẫn Downlink: (CSG|AGG)-XXX TO_(CSG|AGG)-YYY
    downlink_pat = re.compile(r'(?:[A-Za-z0-9]+-)?([A-Za-z0-9]{5,10})\s+TO[_\s]+(?:[A-Za-z0-9]+-)?([A-Za-z0-9]{5,10})', re.IGNORECASE)

    in_downlink = False
    downlinks = {}

    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue

        # Phát hiện bắt đầu mục Downlink
        if re.search(r'Downlink\s*Name', line_clean, re.IGNORECASE) or re.search(r'#\s*Downlink\b', line_clean, re.IGNORECASE):
            in_downlink = True

        # Kết thúc mục Downlink khi gặp ngăn cách hoặc header sự cố mới
        if line_clean.startswith('---') or line_clean.startswith('===') or line_clean.startswith('***') or line_clean.startswith('———'):
            in_downlink = False
            continue

        if line_clean.startswith('- Trạm MLL') or line_clean.startswith('- NN '):
            in_downlink = False

        # Xử lý dòng Downlink truyền dẫn
        dl_match = downlink_pat.search(line_clean)
        if dl_match or in_downlink:
            if dl_match:
                sa = dl_match.group(1).upper()
                sb = dl_match.group(2).upper()
                info_a = SITE_CACHE.get(sa)
                info_b = SITE_CACHE.get(sb)

                # Chỉ xử lý nếu có ít nhất 1 đầu trạm thuộc địa bàn TVT3
                if info_a or info_b:
                    id_a = info_a['site_id'] if info_a else sa
                    id_b = info_b['site_id'] if info_b else sb
                    canon_key = tuple(sorted([id_a, id_b]))

                    # Gộp 2 đầu cảnh báo ngược chiều nhau: A TO B và B TO A là cùng 1 link
                    if canon_key not in downlinks:
                        old_a = info_a.get('site_id_old') if info_a else sa
                        old_b = info_b.get('site_id_old') if info_b else sb
                        new_a = info_a.get('site_id') if info_a else sa
                        new_b = info_b.get('site_id') if info_b else sb

                        legacy_str = f'{old_a or sa}-{old_b or sb}'
                        new_str = f'{new_a}-{new_b}'
                        if legacy_str != new_str:
                            disp = f'{legacy_str} ({new_str})'
                        else:
                            disp = new_str
                        downlinks[canon_key] = disp
            # Tuyệt đối không parse các mã trong dòng Downlink thành trạm MLL
            continue

        # Dòng thông thường chứa mã trạm MLL (Trạm MLL, NN Nguồn, NN Thiết bị...)
        found = site_regex.findall(line_clean)
        for s in found:
            s_u = s.upper()
            if s_u not in ordered_sites:
                ordered_sites.append(s_u)

    # Gom nhóm theo QLT của TVT3
    tvt3_by_qlt = defaultdict(list)

    for s_u in ordered_sites:
        # Chuẩn hóa mã trạm cơ sở
        base = s_u.replace("_4G", "").replace("_3G", "").replace("_2G", "")
        for suff in ["UL", "L", "N"]:
            if base.endswith(suff) and len(base) > len(suff) + 3:
                base = base[:-len(suff)]

        info = SITE_CACHE.get(s_u) or SITE_CACHE.get(base)
        if not info:
            continue

        qlt_full = info.get("qlt") or "Chưa phân công"
        # Rút gọn tên QLT: Khuân, Châu, Thái, Vinh, Vĩnh, Nam, Thế, Tân...
        short_qlt = qlt_full.split()[-1] if qlt_full else "Khác"

        s_old = info.get("site_id_old") or ""
        site_new = info.get("site_id") or s_u

        display = f"{site_new} ({s_old})" if s_old and s_old != site_new else site_new
        if display not in tvt3_by_qlt[short_qlt]:
            tvt3_by_qlt[short_qlt].append(display)

    if not tvt3_by_qlt and not downlinks:
        return (
            "ℹ️ **Kết quả tra cứu:**\n"
            "Không có trạm hoặc đường truyền nào trong danh sách trên thuộc địa bàn quản lý của **Tổ Viễn Thông 3 (TVT3)**.\n"
            "*(Các trạm/link trên thuộc địa bàn TVT1 - Biên Hòa, TVT2 - Trảng Bom/Vĩnh Cửu hoặc TVT4 - Long Thành/Nhơn Trạch)*."
        )

    out_lines = []
    # Sắp xếp QLT có số trạm nhiều nhất lên đầu
    sorted_qlts = sorted(tvt3_by_qlt.keys(), key=lambda q: len(tvt3_by_qlt[q]), reverse=True)

    for qlt in sorted_qlts:
        sites_list = tvt3_by_qlt[qlt]
        count = len(sites_list)
        out_lines.append(f"🔹 {qlt} ({count}): {', '.join(sites_list)}")

    # Thêm mục Downlink nếu có đứt link truyền dẫn trong TVT3
    if downlinks:
        dl_count = len(downlinks)
        out_lines.append(f"🔹 Downlink ({dl_count}): {', '.join(downlinks.values())}")

    return "\n".join(out_lines)


def lookup_single_site(site_query: str) -> str:
    """Tra cứu nhanh 1 trạm đơn lẻ."""
    s_u = site_query.strip().upper()
    info = SITE_CACHE.get(s_u)
    if not info:
        # Thử tìm gần đúng
        for k, v in SITE_CACHE.items():
            if k == s_u or k.startswith(s_u) or s_u.startswith(k):
                info = v
                break

    if not info:
        return f"❌ Không tìm thấy thông tin trạm `{s_u}` trong cơ sở dữ liệu TVT3."

    return (
        f"🏢 **THÔNG TIN TRẠM: {info['site_id']}**" + (f" (Mã cũ: `{info['site_id_old']}`)" if info.get('site_id_old') else "") + "\n"
        f"📝 Tên trạm: {info.get('name') or '--'}\n"
        f"👤 QLT phụ trách: **{info.get('qlt') or 'Chưa phân công'}**\n"
        f"📍 Khu vực: {info.get('xa') or '--'}, {info.get('huyen') or '--'}\n"
        f"📡 Đơn vị: {info.get('to_ql') or 'TVT3'}"
    )


def handle_telegram_message(message: dict):
    """Xử lý tin nhắn đến từ người dùng hoặc nhóm chat."""
    chat_id = message["chat"]["id"]
    text = (message.get("text") or "").strip()
    if not text:
        return

    # Lệnh /start hoặc /help
    if text.startswith("/start") or text.startswith("/help"):
        reply = (
            "👋 **Chào mừng bạn đến với Bot Tra Cứu & Phân Công MLL TVT3!**\n\n"
            "💡 **Cách sử dụng:**\n"
            "1. **Phân công MLL tự động:** Bạn chỉ cần **copy & paste** nguyên văn tin nhắn thông báo sự cố MLL vào đây (ví dụ: danh sách `- Trạm MLL (>1H)...`, `- NN Nguồn...`).\n"
            "   👉 Bot sẽ tự động lọc các trạm thuộc TVT3 và phân công theo từng QLT (Khuân, Châu, Vinh, Thái...).\n\n"
            "2. **Tra cứu nhanh 1 trạm:**\n"
            "   • Gõ `/tram <mã_trạm>` hoặc gõ thẳng mã trạm (VD: `DNIXHO18` hoặc `DNXL74`).\n\n"
            "3. **Hỗ trợ trong nhóm chat:**\n"
            "   • Gõ `/mll <danh_sách_trạm>` hoặc tag bot `@LKH_VHKT_BOT` kèm nội dung."
        )
        send_reply(chat_id, reply)
        return

    # Lệnh tra cứu trạm /tram
    if text.startswith("/tram "):
        parts = text.split(maxsplit=1)
        if len(parts) > 1:
            reply = lookup_single_site(parts[1])
            send_reply(chat_id, reply)
            return

    # Lệnh /mll hoặc /phancong
    if text.startswith("/mll") or text.startswith("/phancong"):
        content = text.replace("/mll", "").replace("/phancong", "").strip()
        if content:
            reply = parse_and_assign_mll(content)
            send_reply(chat_id, reply)
            return

    # Kiểm tra xem có phải là 1 mã trạm đơn lẻ không (VD: gõ "DNIXHO18")
    single_match = re.match(r'^(DNI[A-Z0-9]{3,8}|DN[A-Z]{2}[0-9]{2,3}[A-Z0-9]*)$', text, re.IGNORECASE)
    if single_match:
        reply = lookup_single_site(text)
        send_reply(chat_id, reply)
        return

    # Nếu tin nhắn có chứa dấu hiệu của báo cáo MLL hoặc chứa nhiều mã trạm
    if "mll" in text.lower() or "nguồn" in text.lower() or "nn" in text.lower() or "trạm" in text.lower() or len(re.findall(r'\bDN[A-Z0-9]{4,}\b', text, re.IGNORECASE)) >= 2:
        reply = parse_and_assign_mll(text)
        send_reply(chat_id, reply)
        return


def send_reply(chat_id, text):
    """Gửi tin nhắn phản hồi tới Telegram."""
    url = f"{API_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    try:
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code != 200:
            logger.warning(f"Telegram parse_mode=Markdown lỗi ({res.text}). Đang gửi lại dạng plain text...")
            payload.pop("parse_mode", None)
            res2 = requests.post(url, json=payload, timeout=10)
            if res2.status_code != 200:
                logger.error(f"Lỗi gửi tin nhắn Telegram: {res2.text}")
            else:
                logger.info(f"✅ Đã gửi phản hồi plain text tới chat_id {chat_id}")
        else:
            logger.info(f"✅ Đã gửi phản hồi Markdown tới chat_id {chat_id}")
    except Exception as e:
        logger.error(f"Lỗi gửi tin nhắn Telegram: {e}")


def delete_webhook():
    """Tự động kiểm tra và xóa webhook nếu có để cho phép getUpdates hoạt động."""
    try:
        r = requests.post(f"{API_URL}/deleteWebhook?drop_pending_updates=False", timeout=10)
        info = r.json()
        if info.get("ok"):
            logger.info("✅ Đã kiểm tra & xóa webhook Telegram thành công.")
        else:
            logger.warning(f"Không thể xóa webhook: {info}")
    except Exception as e:
        logger.warning(f"Lỗi gọi deleteWebhook: {e}")


def run_bot_polling():
    """Vòng lặp Long Polling nhận tin nhắn liên tục từ Telegram."""
    ensure_single_instance()

    logger.info("==================================================")
    logger.info("🤖 Bot Phân Công MLL TVT3 đang khởi động...")
    logger.info(f"API Token: {TELEGRAM_TOKEN[:10]}...{TELEGRAM_TOKEN[-5:]}")
    logger.info("==================================================")

    # Luôn xóa webhook trước khi bắt đầu polling
    delete_webhook()

    offset = None
    while True:
        try:
            req_url = f"{API_URL}/getUpdates?timeout=30"
            if offset:
                req_url += f"&offset={offset}"

            res = requests.get(req_url, timeout=40)
            data = res.json()

            if not data.get("ok"):
                err_code = data.get("error_code")
                desc = data.get("description", "")
                logger.error(f"Telegram API Lỗi {err_code}: {desc}")
                # Nếu bị 409 Conflict do webhook bị set lại, tự động xóa webhook ngay
                if err_code == 409:
                    logger.warning("Phát hiện Conflict 409 (có webhook kích hoạt). Đang tự động xóa webhook...")
                    delete_webhook()
                time.sleep(3)
                continue

            if "result" in data:
                for item in data["result"]:
                    offset = item["update_id"] + 1
                    msg = item.get("message") or item.get("channel_post") or item.get("edited_message")
                    if msg:
                        handle_telegram_message(msg)

        except requests.exceptions.Timeout:
            continue
        except requests.exceptions.ConnectionError:
            time.sleep(3)
        except Exception as e:
            logger.error(f"Lỗi Polling Telegram: {e}")
            time.sleep(3)


if __name__ == "__main__":
    run_bot_polling()
