"""
Command Handlers (/start, /help, /sync, /tram, /csht, /hd, /chu, /era, /csg, /cell, /port, /ping)
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
from ..network.era_service import era_service
from ..network.csg_service import csg_service

logger = logging.getLogger("tvt3_bot.commands")


async def handle_start(client: TelegramClient, chat_id: int, user: Dict[str, Any]):
    """Handle /start command."""
    first_name = escape_html(user.get("first_name") or "Kỹ sư")
    msg = (
        f"👋 <b>Chào {first_name}!</b>\n"
        f"Chào mừng bạn đến với <b>TVT3 All-in-One Operations Bot</b>.\n\n"
        f"⚡ <b>HỆ THỐNG TÍCH HỢP 3 TRONG 1:</b>\n"
        f"1️⃣ <b>Hạ tầng & Hợp đồng trạm:</b>\n"
        f"• Gõ mã trạm: <code>DNLK00</code>, <code>26DNa_LK00</code>, <code>LK00</code>\n"
        f"• Gõ tên trạm, tên chủ đất, hoặc số hợp đồng\n"
        f"• Gửi vị trí GPS để tự tìm trạm xung quanh\n\n"
        f"2️⃣ <b>ERA Vô Tuyến (Ericsson Moshell):</b>\n"
        f"• <code>lst cell [mã trạm]</code> (Xem danh sách Cell 3G/4G/5G)\n"
        f"• <code>st cell [tên cell] [mã trạm]</code> (Chi tiết Cell)\n"
        f"• <code>cabx [mã trạm]</code> (Xem tủ phần cứng & Card)\n"
        f"• <code>st rru [mã trạm]</code> (Xem kết nối quang & RRU)\n"
        f"• <code>alt [mã trạm]</code> (Xem cảnh báo active trạm)\n\n"
        f"3️⃣ <b>Metro CSG (Cisco / Huawei):</b>\n"
        f"• <code>port [mã trạm]</code> (Xem tổng quan cổng UP/DOWN)\n"
        f"• <code>port [mã trạm] [tên cổng]</code> (Xem công suất quang Rx/Tx, lỗi CRC)\n"
        f"• <code>ping [mã trạm hoặc IP]</code> (Đo độ trễ & mất gói)\n\n"
        f"────────────────────────────\n"
        f"💡 <i>Gõ /help để xem chi tiết đầy đủ câu lệnh!</i>"
    )
    await client.send_message(chat_id, msg)


async def handle_help(client: TelegramClient, chat_id: int, user: Dict[str, Any]):
    """Handle /help command."""
    msg = (
        f"❓ <b>HƯỚNG DẪN TRA CỨU TVT3 ALL-IN-ONE BOT</b>\n\n"
        f"🏢 <b>1. THÔNG TIN TRẠM & HỢP ĐỒNG:</b>\n"
        f"• <code>/tram [mã trạm]</code> ➔ Xem Thẻ Tóm Tắt trạm\n"
        f"• <code>/csht [mã trạm]</code> ➔ Xem Nguồn điện, MPD, Ắc quy\n"
        f"• <code>/hd [mã trạm]</code> ➔ Xem Hợp đồng thuê & Tài khoản chủ đất\n"
        f"• <code>/chu [mã trạm]</code> ➔ Xem SĐT chủ đất & Mật khẩu khóa trạm\n\n"
        f"📶 <b>2. ERA VÔ TUYẾN (ERICSSON MOSHELL ENM):</b>\n"
        f"• <code>/cell [mã trạm]</code> hoặc <code>lst cell [mã]</code> ➔ Trạng thái Cell 3G/4G/5G\n"
        f"• <code>cabx [mã trạm]</code> ➔ Chi tiết Tủ Cabinet & PlugInUnit\n"
        f"• <code>st rru [mã trạm]</code> ➔ Kiểm tra RRU, cáp quang CPRI/eCPRI & nguồn\n"
        f"• <code>alt [mã trạm]</code> ➔ Danh sách cảnh báo active\n"
        f"• Gõ <code>5G [mã]</code>, <code>4G [mã]</code> hoặc <code>3G [mã]</code> để lọc công nghệ\n\n"
        f"🔌 <b>3. TRUYỀN DẪN METRO CSG:</b>\n"
        f"• <code>/port [mã trạm]</code> ➔ Trạng thái tổng quan các cổng\n"
        f"• <code>/port [mã trạm] [cổng]</code> ➔ Đo công suất quang thu/phát & tốc độ\n"
        f"• <code>/ping [mã trạm hoặc IP]</code> ➔ Đo ping thông suốt & độ trễ\n\n"
        f"📸 <b>4. KHO ẢNH & TỒN TẠI HIỆN TRƯỜNG:</b>\n"
        f"• Gửi ảnh kèm <code>[mã] khao sat</code> ➔ Bot tự lưu Telegram CDN & dán nhãn AI\n"
        f"• Gửi ảnh kèm <code>[mã] ton_tai [lỗi]</code> ➔ Báo lỗi khiếm khuyết trạm 🔴\n"
        f"• Gửi ảnh kèm <code>[mã] da_khac_phuc</code> ➔ Báo khắc phục & lưu ảnh nghiệm thu 🟢\n"
        f"• <code>/anh [mã trạm]</code> ➔ Xem ảnh gần nhất của trạm\n"
        f"• <code>/tontai [mã trạm]</code> ➔ Xem danh sách khiếm khuyết đang tồn đọng\n\n"
        f"🌐 <i>Bạn có thể gõ trực tiếp câu lệnh tự nhiên hoặc bấm vào nút tương tác dưới mỗi trạm!</i>"
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


async def handle_era_direct_command(client: TelegramClient, chat_id: int, cmd: str, args: str):
    """Handle direct ERA commands (/cell, /cabx, /alt, /rru, /era)."""
    parts = args.strip().split()
    if not parts:
        await client.send_message(
            chat_id,
            f"⚠️ Vui lòng cung cấp mã trạm. Ví dụ: <code>{cmd} DNXL00</code>"
        )
        return

    site = parts[0].upper()
    cmd_clean = cmd.lower().replace("/", "")

    action = "lst_cell"
    target = None
    if cmd_clean in ["cabx", "cab"]:
        action = "cabx"
    elif cmd_clean in ["alt", "alarm"]:
        action = "alt"
    elif cmd_clean in ["rru", "strru"]:
        action = "st_rru"
    elif cmd_clean == "era":
        if len(parts) >= 2:
            sub = parts[0].lower()
            site = parts[1].upper()
            if sub in ["cell", "lst_cell", "st_cell"]:
                action = "lst_cell"
            elif sub == "cabx":
                action = "cabx"
            elif sub == "alt":
                action = "alt"
            elif sub == "rru":
                action = "st_rru"

    status_msg = await client.send_message(
        chat_id,
        f"⏳ <b>[ERA Vô Tuyến] Đang truy vấn {action} trạm <code>{site}</code>...</b>\n<i>Vui lòng chờ trong giây lát...</i>"
    )

    try:
        res = await era_service.execute_async(action, site, target=target)
        if status_msg and "message_id" in status_msg:
            try:
                await client.edit_message_text(chat_id, status_msg["message_id"], res, parse_mode="Markdown")
            except Exception:
                await client.edit_message_text(chat_id, status_msg["message_id"], res)
        else:
            try:
                await client.send_message(chat_id, res, parse_mode="Markdown")
            except Exception:
                await client.send_message(chat_id, res)
    except Exception as e:
        err = f"❌ Lỗi truy vấn ERA trạm {site}: {e}"
        if status_msg and "message_id" in status_msg:
            await client.edit_message_text(chat_id, status_msg["message_id"], err)
        else:
            await client.send_message(chat_id, err)


async def handle_csg_direct_command(client: TelegramClient, chat_id: int, cmd: str, args: str):
    """Handle direct CSG commands (/port, /ping, /csg)."""
    parts = args.strip().split()
    if not parts:
        await client.send_message(
            chat_id,
            f"⚠️ Vui lòng cung cấp mã trạm hoặc IP. Ví dụ: <code>{cmd} DNTP00</code>"
        )
        return

    cmd_clean = cmd.lower().replace("/", "")
    site_or_ip = parts[0].upper()
    port = parts[1] if len(parts) > 1 else None

    if cmd_clean == "ping":
        status_msg = await client.send_message(chat_id, f"⏳ <b>[CSG] Đang ping <code>{site_or_ip}</code>...</b>")
        res = await csg_service.ping_async(site_or_ip)
    else:
        status_msg = await client.send_message(chat_id, f"⏳ <b>[CSG] Đang kiểm tra cổng trạm <code>{site_or_ip}</code>...</b>")
        res = await csg_service.check_ports_async(site_or_ip, port)

    if status_msg and "message_id" in status_msg:
        try:
            await client.edit_message_text(chat_id, status_msg["message_id"], res, parse_mode="Markdown")
        except Exception:
            await client.edit_message_text(chat_id, status_msg["message_id"], res)
    else:
        try:
            await client.send_message(chat_id, res, parse_mode="Markdown")
        except Exception:
            await client.send_message(chat_id, res)
