"""
Callback Query Handler for Interactive Inline Keyboards (In-place message edits)
"""
import logging
from typing import Any, Dict
from ..core.config import bot_config_manager
from ..core.telegram_client import TelegramClient
from ..resolvers.site_cache import site_cache
from ..resolvers.site_formatter import (
    format_summary_card,
    format_infra_card,
    format_contract_card,
    format_access_card,
)
from .keyboards import build_summary_keyboard, build_subtab_keyboard

logger = logging.getLogger("tvt3_bot.callbacks")


async def handle_callback_query(client: TelegramClient, callback_query: Dict[str, Any]):
    """Process incoming button clicks from inline keyboards."""
    query_id = callback_query.get("id")
    data = callback_query.get("data") or ""
    message = callback_query.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    message_id = message.get("message_id")

    if not chat_id or not message_id or not data:
        if query_id:
            await client.answer_callback_query(query_id)
        return

    features = bot_config_manager.get_features()

    # 1. Tab Navigation: T:<SITE_ID>:<TAB>
    if data.startswith("T:"):
        parts = data.split(":")
        if len(parts) != 3:
            if query_id:
                await client.answer_callback_query(query_id)
            return
        _, sid, tab = parts

        # Feature toggle checks with user-friendly alert popups
        if tab == "INF" and not features.get("allow_infra_lookup", True):
            if query_id:
                await client.answer_callback_query(query_id, "⚠️ Tính năng tra cứu Hạ tầng đang tạm khóa bởi Quản trị viên.", show_alert=True)
            return

        if tab == "CTR" and not features.get("allow_contract_lookup", True):
            if query_id:
                await client.answer_callback_query(query_id, "⚠️ Tính năng tra cứu Hợp đồng đang tạm khóa bởi Quản trị viên.", show_alert=True)
            return

        if tab == "ACS" and not features.get("allow_access_lookup", True):
            if query_id:
                await client.answer_callback_query(query_id, "⚠️ Tính năng tra cứu Mật khẩu khóa đang tạm khóa bởi Quản trị viên.", show_alert=True)
            return

        # Dismiss loading spinner
        if query_id:
            await client.answer_callback_query(query_id)

        site = site_cache.find_by_code(sid)
        if not site:
            await client.edit_message_text(
                chat_id,
                message_id,
                f"❌ Không tìm thấy thông tin trạm: <code>{sid}</code>"
            )
            return

        loc = site.get("location_info") or {}
        try:
            lat = float(loc.get("vi_do"))
            lon = float(loc.get("kinh_do"))
        except (ValueError, TypeError):
            lat, lon = None, None

        if tab == "INF":
            text = format_infra_card(site)
            kb = build_subtab_keyboard(sid, "INF", lat, lon)
        elif tab == "CTR":
            text = format_contract_card(site)
            kb = build_subtab_keyboard(sid, "CTR", lat, lon)
        elif tab == "ACS":
            text = format_access_card(site)
            kb = build_subtab_keyboard(sid, "ACS", lat, lon)
        else:  # SUM
            text = format_summary_card(site)
            kb = build_summary_keyboard(sid, lat, lon)

        await client.edit_message_text(chat_id, message_id, text, reply_markup=kb)
        return

    # 2. Select Site from Multi-Match Picker: S:<SITE_ID>
    if data.startswith("S:"):
        parts = data.split(":")
        if len(parts) != 2:
            return
        _, sid = parts
        site = site_cache.find_by_code(sid)
        if not site:
            await client.edit_message_text(
                chat_id,
                message_id,
                f"❌ Không tìm thấy thông tin trạm: <code>{sid}</code>"
            )
            return

        loc = site.get("location_info") or {}
        try:
            lat = float(loc.get("vi_do"))
            lon = float(loc.get("kinh_do"))
        except (ValueError, TypeError):
            lat, lon = None, None

        text = format_summary_card(site)
        kb = build_summary_keyboard(sid, lat, lon)
        await client.edit_message_text(chat_id, message_id, text, reply_markup=kb)
        return

    # 3. Cancel Action: C:CANCEL
    if data == "C:CANCEL":
        await client.edit_message_text(chat_id, message_id, "<i>Đã hủy tra cứu.</i>")
        return

    # 4. Help Action: H:HELP
    if data == "H:HELP":
        help_msg = (
            "💡 <b>MẸO TÌM KIẾM NHANH:</b>\n\n"
            "• Gõ mã trạm mới: <code>26DNa_LK00</code>\n"
            "• Gõ mã trạm cũ: <code>DNLK00</code>\n"
            "• Lệnh mạng ERA: <code>lst cell DNXL00</code>, <code>alt DNXL00</code>\n"
            "• Lệnh mạng CSG: <code>port DNTP00</code>, <code>ping DNTP00</code>\n"
            "• Gửi Vị trí GPS (Live Location) để xem trạm gần nhất."
        )
        await client.edit_message_text(chat_id, message_id, help_msg)
        return

    # 5. Network Equipment Actions: N:<TYPE>:<SITE_ID>
    if data.startswith("N:"):
        parts = data.split(":")
        if len(parts) >= 3:
            net_type = parts[1]
            sid = parts[2]

            if query_id:
                await client.answer_callback_query(query_id, f"⏳ Đang kết nối thiết bị trạm {sid}...")

            status_msg = await client.send_message(
                chat_id,
                f"⏳ <b>Đang truy vấn {net_type} trạm <code>{sid}</code>...</b>\n<i>Vui lòng chờ trong giây lát...</i>"
            )

            from ..network.era_service import era_service
            from ..network.csg_service import csg_service

            try:
                if net_type == "ERA":
                    res = await era_service.execute_async("lst_cell", sid)
                elif net_type == "CSG":
                    res = await csg_service.check_ports_async(sid)
                elif net_type == "ALT":
                    res = await era_service.execute_async("alt", sid)
                else:
                    res = "❌ Lệnh mạng không xác định."

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
                err_text = f"❌ Lỗi truy vấn {net_type} trạm {sid}: {e}"
                if status_msg and "message_id" in status_msg:
                    await client.edit_message_text(chat_id, status_msg["message_id"], err_text)
                else:
                    await client.send_message(chat_id, err_text)
            return
