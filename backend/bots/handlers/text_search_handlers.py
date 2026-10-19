"""
Text Search Handler for Free-form User Queries
"""
import logging
from typing import Any, Dict
from ..core.telegram_client import TelegramClient
from ..resolvers.site_cache import site_cache
from ..resolvers.site_formatter import format_summary_card, escape_html
from .keyboards import build_summary_keyboard, build_multi_match_keyboard, build_not_found_keyboard

logger = logging.getLogger("tvt3_bot.text_search")


async def handle_text_query(client: TelegramClient, chat_id: int, text: str):
    """Analyze and respond to free-form text entered by engineer."""
    query = text.strip()
    if not query:
        return

    # 0. Check if query is a Network command (ERA Moshell or Metro CSG)
    from ..network.intent_parser import parse_network_command
    from ..network.era_service import era_service
    from ..network.csg_service import csg_service

    net_cmd = parse_network_command(query)
    if net_cmd.is_network_cmd:
        service_label = "ERA Vô tuyến" if net_cmd.service_type == "era" else "Metro CSG"
        target_info = f" ({net_cmd.target})" if net_cmd.target else ""
        status_msg = await client.send_message(
            chat_id,
            f"⏳ <b>[{service_label}] Đang truy vấn trạm <code>{net_cmd.site_name}</code>{target_info}...</b>\n<i>Vui lòng chờ trong giây lát...</i>"
        )
        try:
            if net_cmd.service_type == "era":
                result = await era_service.execute_async(
                    action=net_cmd.action,
                    nodeb_name=net_cmd.site_name,
                    target=net_cmd.target,
                    tech_hint=net_cmd.tech_hint
                )
            elif net_cmd.service_type == "csg":
                if net_cmd.action == "ping":
                    result = await csg_service.ping_async(net_cmd.site_name)
                else:
                    result = await csg_service.check_ports_async(net_cmd.site_name, net_cmd.target)
            else:
                result = "❌ Lệnh không hỗ trợ."

            if status_msg and "message_id" in status_msg:
                try:
                    await client.edit_message_text(chat_id, status_msg["message_id"], result, parse_mode="Markdown")
                except Exception:
                    await client.edit_message_text(chat_id, status_msg["message_id"], result)
            else:
                try:
                    await client.send_message(chat_id, result, parse_mode="Markdown")
                except Exception:
                    await client.send_message(chat_id, result)
        except Exception as e:
            err_text = f"❌ Lỗi thực thi lệnh mạng: {e}"
            if status_msg and "message_id" in status_msg:
                await client.edit_message_text(chat_id, status_msg["message_id"], err_text)
            else:
                await client.send_message(chat_id, err_text)
        return

    # 1. Search in cached sites
    matches = site_cache.search_keyword(query, limit=6)

    # 2. Case: Exactly 1 site matched -> Show Summary Card directly
    if len(matches) == 1:
        site = matches[0]
        sid = site.get("site_id") or ""
        loc = site.get("location_info") or {}
        try:
            lat = float(loc.get("vi_do"))
            lon = float(loc.get("kinh_do"))
        except (ValueError, TypeError):
            lat, lon = None, None

        msg = format_summary_card(site)
        kb = build_summary_keyboard(sid, lat, lon)
        await client.send_message(chat_id, msg, reply_markup=kb)
        return

    # 3. Case: 2 to 5 sites matched -> Show interactive site picker
    if 2 <= len(matches) <= 5:
        q_escaped = escape_html(query)
        msg = (
            f"🔍 <b>Tìm thấy {len(matches)} trạm khớp với:</b> \"{q_escaped}\"\n"
            f"<i>Vui lòng bấm chọn trạm bạn muốn xem:</i>"
        )
        kb = build_multi_match_keyboard(matches)
        await client.send_message(chat_id, msg, reply_markup=kb)
        return

    # 4. Case: More than 5 sites matched -> Show top 5 and prompt to narrow down
    if len(matches) > 5:
        q_escaped = escape_html(query)
        top5 = matches[:5]
        msg = (
            f"🔍 <b>Tìm thấy nhiều hơn 5 trạm khớp với:</b> \"{q_escaped}\"\n"
            f"<i>Gợi ý 5 trạm đầu tiên (hoặc nhập thêm ký tự để thu hẹp):</i>"
        )
        kb = build_multi_match_keyboard(top5)
        await client.send_message(chat_id, msg, reply_markup=kb)
        return

    # 5. Case: No sites matched
    q_escaped = escape_html(query)
    msg = (
        f"❌ <b>Không tìm thấy trạm nào khớp với:</b> \"{q_escaped}\"\n\n"
        f"💡 <b>GỢI Ý TÌM KIẾM CHO BẠN:</b>\n"
        f"• Thử gõ mã trạm mới (VD: <code>26DNa_LK00</code>) hoặc mã cũ (VD: <code>DNLK00</code>).\n"
        f"• Thử gõ tên trạm không dấu (VD: <code>Long Khanh</code>, <code>Gia Ray</code>).\n"
        f"• Thử gõ tên chủ đất hoặc số hợp đồng.\n"
        f"• Hoặc gửi <b>Vị trí GPS Hiện tại</b> để bot tự tìm trạm quanh bạn."
    )
    kb = build_not_found_keyboard()
    await client.send_message(chat_id, msg, reply_markup=kb)
