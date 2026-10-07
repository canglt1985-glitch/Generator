"""
Command Handlers (/start, /help, /sync, /tram, /csht, /hd, /chu)
"""
import logging
from typing import Any, Dict, Optional
from ..core.telegram_client import TelegramClient
from ..core.auth import auth_manager
from ..resolvers.site_cache import site_cache
from ..resolvers.site_formatter import (
    format_summary_card,
    format_infra_card,
    format_contract_card,
    format_access_card,
    escape_html
)
from .keyboards import build_summary_keyboard, build_subtab_keyboard

logger = logging.getLogger("tvt3_bot.commands")


async def handle_start(client: TelegramClient, chat_id: int, user: Dict[str, Any]):
    """Handle /start command."""
    first_name = escape_html(user.get("first_name") or "Kỹ sư")
    msg = (
        f"👋 <b>Chào {first_name}!</b>\n"
        f"Chào mừng bạn đến với <b>TVT3 DataSite & Hợp Đồng Assistant</b>.\n\n"
        f"⚡ <b>BẠN CÓ THỂ TRA CỨU NHANH BẰNG CÁCH:</b>\n"
        f"1️⃣ <b>Gõ mã trạm:</b> <code>DNLK00</code>, <code>26DNa_LK00</code>, hoặc <code>LK00</code>\n"
        f"2️⃣ <b>Gõ tên trạm:</b> <code>Long Khánh</code>, <code>Bảo Vinh</code>, <code>Gia Ray</code>\n"
        f"3️⃣ <b>Gõ tên chủ đất:</b> <code>Nguyễn Văn A</code>\n"
        f"4️⃣ <b>Gõ số hợp đồng:</b> <code>25/HĐKT...</code>\n"
        f"5️⃣ <b>Gửi vị trí GPS:</b> Bấm biểu tượng 📎 gửi <b>Vị trí Hiện tại</b> để bot tự tìm trạm quanh bạn!\n\n"
        f"────────────────────────────\n"
        f"💡 <i>Mẹo: Chạm vào các đoạn chữ màu xám để copy nhanh (mã PE, mật khẩu, STK).</i>"
    )
    await client.send_message(chat_id, msg)


async def handle_help(client: TelegramClient, chat_id: int, user: Dict[str, Any]):
    """Handle /help command."""
    msg = (
        f"❓ <b>HƯỚNG DẪN TRA CỨU TVT3 BOT</b>\n\n"
        f"📌 <b>CÁC LỆNH TẮT TRỰC TIẾP:</b>\n"
        f"• <code>/tram [mã trạm]</code> ➔ Xem Thẻ Tóm Tắt trạm\n"
        f"• <code>/csht [mã trạm]</code> hoặc <code>/tb</code> ➔ Xem Hạ tầng & Nguồn điện (PE EVN, MPD, Ắc quy)\n"
        f"• <code>/hd [mã trạm]</code> hoặc <code>/hopdong</code> ➔ Xem Hợp đồng thuê & Tài khoản chủ nhà\n"
        f"• <code>/chu [mã trạm]</code> hoặc <code>/khoa</code> ➔ Xem SĐT chủ đất & Mật khẩu khóa số\n\n"
        f"🌐 <b>TÌM KIẾM TỰ DO:</b>\n"
        f"Bạn có thể nhắn tin trực tiếp mã trạm, tên xã, tên trạm hoặc gửi vị trí GPS. Bot sẽ tự động nhận diện và gửi kết quả tức thì!"
    )
    await client.send_message(chat_id, msg)


async def handle_sync(client: TelegramClient, chat_id: int, user_id: int):
    """Handle /sync command (Admin only) to refresh In-Memory Cache."""
    if not auth_manager.is_admin(user_id):
        await client.send_message(chat_id, "⚠️ Lệnh này chỉ dành cho Quản trị viên TVT3.")
        return

    await client.send_message(chat_id, "⏳ Đang đồng bộ lại 412 trạm từ Supabase vào RAM...")
    ok = site_cache.sync_from_supabase()
    if ok:
        await client.send_message(
            chat_id,
            f"✅ <b>Đồng bộ thành công!</b>\n"
            f"Tổng số trạm trong bộ nhớ: <b>{len(site_cache.all_sites)}</b> trạm."
        )
    else:
        await client.send_message(chat_id, "❌ Lỗi khi đồng bộ từ Supabase. Vui lòng kiểm tra logs.")


async def handle_direct_site_command(client: TelegramClient, chat_id: int, cmd: str, args: str):
    """Handle direct site sub-commands (/tram, /csht, /hd, /chu)."""
    code = args.strip()
    if not code:
        await client.send_message(
            chat_id,
            f"⚠️ Vui lòng cung cấp mã trạm. Ví dụ: <code>{cmd} DNLK00</code>"
        )
        return

    site = site_cache.find_by_code(code)
    if not site:
        # Try keyword search
        matches = site_cache.search_keyword(code, limit=1)
        site = matches[0] if matches else None

    if not site:
        await client.send_message(
            chat_id,
            f"❌ Không tìm thấy thông tin cho mã trạm: <code>{escape_html(code)}</code>\n"
            f"Vui lòng kiểm tra lại mã trạm hoặc gõ tên trạm."
        )
        return

    sid = site.get("site_id") or ""
    loc = site.get("location_info") or {}
    try:
        lat = float(loc.get("vi_do"))
        lon = float(loc.get("kinh_do"))
    except (ValueError, TypeError):
        lat, lon = None, None

    cmd_lower = cmd.lower().replace("/", "")
    if cmd_lower in ("csht", "tb", "thietbi"):
        msg = format_infra_card(site)
        kb = build_subtab_keyboard(sid, "INF", lat, lon)
    elif cmd_lower in ("hd", "hopdong"):
        msg = format_contract_card(site)
        kb = build_subtab_keyboard(sid, "CTR", lat, lon)
    elif cmd_lower in ("chu", "khoa", "vaotram"):
        msg = format_access_card(site)
        kb = build_subtab_keyboard(sid, "ACS", lat, lon)
    else:
        msg = format_summary_card(site)
        kb = build_summary_keyboard(sid, lat, lon)

    await client.send_message(chat_id, msg, reply_markup=kb)
