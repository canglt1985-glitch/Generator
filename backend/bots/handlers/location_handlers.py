"""
GPS Live Location Handler for Proximity Site Lookup
"""
import logging
from typing import Any, Dict
from ..core.config import bot_config_manager
from ..core.telegram_client import TelegramClient
from ..resolvers.site_cache import site_cache
from ..resolvers.site_formatter import format_proximity_card
from .keyboards import build_summary_keyboard

logger = logging.getLogger("tvt3_bot.location")


async def handle_location_query(client: TelegramClient, chat_id: int, location: Dict[str, Any]):
    """Find and display closest site when engineer shares their GPS location."""
    features = bot_config_manager.get_features()

    if not features.get("allow_gps_lookup", True):
        await client.send_message(
            chat_id,
            "⚠️ <b>TÍNH NĂNG TẠM ĐÓNG</b>\n\n"
            "Tính năng tra cứu trạm theo vị trí GPS hiện đang tạm khóa bởi Quản trị viên."
        )
        return

    lat = location.get("latitude")
    lon = location.get("longitude")

    if lat is None or lon is None:
        await client.send_message(chat_id, "⚠️ Không thể đọc được tọa độ GPS từ tin nhắn của bạn.")
        return

    # Use configured GPS radius, defaulting to 1.0 km or fallback
    cfg_radius = float(features.get("gps_max_distance_km", 1.0))
    if cfg_radius <= 0:
        cfg_radius = 1.0

    nearest_list = site_cache.find_nearest(float(lat), float(lon), max_distance_km=cfg_radius)

    if not nearest_list:
        # Fallback to broader search up to 25km if none found in immediate proximity
        fallback_radius = max(cfg_radius, 25.0)
        nearest_list = site_cache.find_nearest(float(lat), float(lon), max_distance_km=fallback_radius)

    if not nearest_list:
        await client.send_message(
            chat_id,
            "📍 <b>Đã nhận tọa độ GPS của bạn!</b>\n"
            f"Tuy nhiên không tìm thấy trạm TVT3 nào trong bán kính {int(fallback_radius)} km xung quanh vị trí này."
        )
        return

    # Best match (closest site)
    site, distance_m = nearest_list[0]
    sid = site.get("site_id") or ""

    loc = site.get("location_info") or {}
    try:
        s_lat = float(loc.get("vi_do"))
        s_lon = float(loc.get("kinh_do"))
    except (ValueError, TypeError):
        s_lat, s_lon = None, None

    msg = format_proximity_card(site, distance_m)
    kb = build_summary_keyboard(sid, s_lat, s_lon)
    await client.send_message(chat_id, msg, reply_markup=kb)
