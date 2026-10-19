"""
Inline Keyboards Generator for Telegram Bot
"""
from typing import Any, Dict, List, Optional


def build_summary_keyboard(site_id: str, lat: Optional[float] = None, lon: Optional[float] = None) -> Dict[str, Any]:
    """Build primary navigation keyboard for Site Summary Card."""
    sid = site_id.strip()
    buttons = [
        [
            {"text": "⚡ Hạ tầng & Nguồn", "callback_data": f"T:{sid}:INF"},
            {"text": "📜 Hợp đồng & Tiền", "callback_data": f"T:{sid}:CTR"},
        ],
        [
            {"text": "🔑 Vào trạm & Chủ đất", "callback_data": f"T:{sid}:ACS"},
        ],
    ]

    # Add Google Maps button if coordinates are valid
    if lat is not None and lon is not None and (lat != 0 or lon != 0):
        maps_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lon}"
        buttons[1].append({"text": "🗺️ Google Maps", "url": maps_url})

    # Network Equipment Inspection Buttons (ERA & CSG)
    buttons.append([
        {"text": "📶 Cell ERA (3G/4G/5G)", "callback_data": f"N:ERA:{sid}"},
        {"text": "🔌 Cổng Metro CSG", "callback_data": f"N:CSG:{sid}"},
    ])
    buttons.append([
        {"text": "🔔 Cảnh báo ALT (Moshell)", "callback_data": f"N:ALT:{sid}"}
    ])

    return {"inline_keyboard": buttons}


def build_subtab_keyboard(site_id: str, current_tab: str, lat: Optional[float] = None, lon: Optional[float] = None) -> Dict[str, Any]:
    """
    Build navigation keyboard when viewing a specific subtab.
    Allows jumping directly to other subtabs or returning to summary.
    """
    sid = site_id.strip()
    all_tabs = [
        ("INF", "⚡ Hạ tầng"),
        ("CTR", "📜 Hợp đồng"),
        ("ACS", "🔑 Vào trạm"),
    ]

    # Remaining other subtabs
    other_buttons = [
        {"text": label, "callback_data": f"T:{sid}:{code}"}
        for code, label in all_tabs if code != current_tab
    ]

    row1 = other_buttons
    row2 = [{"text": "🔙 Quay lại tóm tắt", "callback_data": f"T:{sid}:SUM"}]

    if lat is not None and lon is not None and (lat != 0 or lon != 0):
        maps_url = f"https://www.google.com/maps/dir/?api=1&destination={lat},{lon}"
        row2.append({"text": "🗺️ Google Maps", "url": maps_url})

    return {"inline_keyboard": [row1, row2]}


def build_multi_match_keyboard(sites: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build single-column site picker keyboard for multiple search matches."""
    keyboard: List[List[Dict[str, str]]] = []
    for s in sites[:5]:
        sid = s.get("site_id") or ""
        name = s.get("name") or sid
        loc = s.get("location_info") or {}
        commune = loc.get("xa_moi") or loc.get("huyen") or ""
        label = f"📍 {sid} - {name}" + (f" ({commune})" if commune else "")
        keyboard.append([{"text": label[:45], "callback_data": f"S:{sid}"}])

    keyboard.append([{"text": "❌ Hủy tìm kiếm", "callback_data": "C:CANCEL"}])
    return {"inline_keyboard": keyboard}


def build_not_found_keyboard() -> Dict[str, Any]:
    """Keyboard when no site is found."""
    return {
        "inline_keyboard": [
            [{"text": "❓ Hướng dẫn tìm kiếm", "callback_data": "H:HELP"}]
        ]
    }
