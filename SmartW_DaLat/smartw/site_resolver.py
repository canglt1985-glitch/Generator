"""
Site Resolver Module for SmartW Da Lat Telecom Operations.
Single Source of Truth for resolving raw site strings into standardized site IDs.
Supports reading local data/sites_dalat.json and fallback lookups.
"""
import os
import re
import json
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

logger = logging.getLogger("site_resolver")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SITES_FILE = PROJECT_ROOT / 'data' / 'sites_dalat.json'

_cached_sites: Optional[List[Dict[str, Any]]] = None
_lookup_by_new: Optional[Dict[str, Dict[str, Any]]] = None
_lookup_by_old: Optional[Dict[str, Dict[str, Any]]] = None


def load_dalat_sites() -> List[Dict[str, Any]]:
    """Tải danh bạ trạm Tổ Đà Lạt từ data/sites_dalat.json."""
    global _cached_sites, _lookup_by_new, _lookup_by_old
    if _cached_sites is not None:
        return _cached_sites

    _cached_sites = []
    _lookup_by_new = {}
    _lookup_by_old = {}

    if SITES_FILE.exists():
        try:
            with open(SITES_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    _cached_sites = data
                elif isinstance(data, dict):
                    _cached_sites = list(data.values())

            for item in _cached_sites:
                s_new = (item.get("site_id") or "").strip().upper()
                s_old = (item.get("site_id_old") or "").strip().upper()
                if s_new:
                    _lookup_by_new[s_new] = item
                if s_old:
                    _lookup_by_old[s_old] = item
            logger.info(f"SiteResolver: Đã nạp {len(_cached_sites)} trạm Đà Lạt từ {SITES_FILE.name}")
        except Exception as e:
            logger.error(f"SiteResolver: Lỗi nạp danh bạ trạm Đà Lạt: {e}")

    return _cached_sites


def resolve_base_site_id(raw_str: str) -> str:
    """Tách mã trạm chuẩn từ chuỗi cảnh báo SmartW (vd: LDDL01_4G_A -> LDDL01)."""
    s = str(raw_str or "").strip()
    if not s:
        return ""

    # Tách dấu gạch dưới hoặc gạch ngang
    for delimiter in ['_', '-']:
        if delimiter in s:
            s = s.split(delimiter)[0]
            break

    return s.strip().upper()


def get_site_info(site_code: str) -> Optional[Dict[str, Any]]:
    """Tra cứu thông tin chi tiết của trạm Đà Lạt (tên trạm, quản lý, huyện/xã)."""
    load_dalat_sites()
    code = resolve_base_site_id(site_code)
    if not code:
        return None

    if _lookup_by_new and code in _lookup_by_new:
        return _lookup_by_new[code]
    if _lookup_by_old and code in _lookup_by_old:
        return _lookup_by_old[code]

    return None
