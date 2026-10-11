"""
Site Resolver Module for SmartW and TVT3 Telecom Operations.

Single Source of Truth for resolving raw site strings (from SmartW alarms,
MLL reports, Telegram messages, and spreadsheets) into standardized site IDs.

Rules:
1. Active BTS New Site ID: Strictly 8 characters (DNI + 3-char Ward/Commune + 2-digit number).
   e.g. DNILKH11 (Long Khánh 11), DNIDGI28 (Định Quán 28), DNIXLO16 (Xuân Lộc 16).
2. Active BTS Old Site ID: Strictly 6 characters (DN + 2-char District + 2-digit number).
   e.g. DNLK45, DNTN55, DNCM12, DNXL01.
3. Special Transmission / Dedicated Nodes: DNILKH1, DNIDQN1, ILA-DNIXLC.
   Must only be matched EXACTLY. Isolated from loose prefix matching.
4. Planning Codes (26DNa...): CSHT legal/planning codes, never active on SmartW.
"""

import re
import logging
from typing import Optional, Tuple, Dict, Any, List

logger = logging.getLogger("site_resolver")

# Special transmission / non-8-char sites that must ONLY match exactly
SPECIAL_SITES_EXACT = {
    "DNILKH1",       # AGG Long Khánh (7 chars)
    "DNIDQN1",       # AGG Định Quán (7 chars)
    "ILA-DNIXLC"     # Trạm đặc thù ILA (10 chars)
}

# Regex for standard 8-char active BTS new ID: DNI + 3 letters + 2 digits
RE_BTS_NEW = re.compile(r"^DNI[A-Z]{3}[0-9]{2}", re.IGNORECASE)

# Regex for standard 6-char active BTS old ID: DN + 2 letters + 2 digits
RE_BTS_OLD = re.compile(r"^DN[A-Z]{2}[0-9]{2}", re.IGNORECASE)

# Cache for datasites list when fetched internally
_cached_datasites: Optional[List[Dict[str, Any]]] = None
_lookup_by_new: Optional[Dict[str, Dict[str, Any]]] = None
_lookup_by_old: Optional[Dict[str, Dict[str, Any]]] = None


def set_datasites_cache(data: List[Dict[str, Any]]) -> None:
    """Set or update in-memory datasites cache."""
    global _cached_datasites, _lookup_by_new, _lookup_by_old
    _cached_datasites = data or []
    _lookup_by_new = {}
    _lookup_by_old = {}
    for item in _cached_datasites:
        s_new = (item.get("site_id") or "").strip().upper()
        s_old = (item.get("site_id_old") or "").strip().upper()
        if s_new:
            _lookup_by_new[s_new] = item
        if s_old:
            _lookup_by_old[s_old] = item


def get_datasites_cache() -> List[Dict[str, Any]]:
    """Get in-memory datasites cache or fetch via supabase if available."""
    global _cached_datasites
    if _cached_datasites is not None:
        return _cached_datasites
    
    try:
        from bots.core.supabase_client import supabase  # type: ignore
    except ImportError:
        try:
            from supabase_client import supabase  # type: ignore
        except ImportError:
            supabase = None

    if supabase:
        try:
            res = supabase.table("datasites").select(
                "site_id, site_id_old, name, management_info, technical_info, classification, location_info"
            ).execute()
            set_datasites_cache(res.data or [])
            return _cached_datasites or []
        except Exception as e:
            logger.error(f"site_resolver failed to fetch datasites: {e}")
    
    return []


def _split_delimiters(raw: str) -> Tuple[str, str]:
    """Split string by first '_' or '-' delimiter.
    Example: 'DNILKH11_1' -> ('DNILKH11', '_1')
    """
    s = str(raw or "").strip()
    for delimiter in ['_', '-']:
        if delimiter in s:
            parts = s.split(delimiter)
            if parts[0]:
                base = parts[0]
                suffix = delimiter + delimiter.join(parts[1:])
                return base, suffix
    return s, ""


def _parse_tech_from_suffix(suffix: str, raw_network: str = "") -> str:
    """Parse detected tech string from remaining suffix."""
    suff = suffix.strip().upper().lstrip("_-")
    if not suff:
        return _norm_net(raw_network)

    if suff == "UL" or suff.startswith("UL"):
        return "4G SRAN"
    elif suff == "GL" or suff.startswith("GL"):
        return "2G/4G"
    elif suff == "L" or (suff.startswith("L") and (len(suff) == 1 or suff[1].isdigit())):
        return "4G"
    elif suff == "N" or (suff.startswith("N") and (len(suff) == 1 or suff[1].isdigit())):
        return "5G"
    elif suff == "U" or (suff.startswith("U") and (len(suff) == 1 or suff[1].isdigit())):
        return "3G"
    elif suff == "G" or (suff.startswith("G") and (len(suff) == 1 or suff[1].isdigit())):
        return "2G"
    elif suff == "4G" or suff.startswith("4G"):
        return "4G"
    elif suff == "5G" or suff.startswith("5G"):
        return "5G"
    elif suff == "3G" or suff.startswith("3G"):
        return "3G"
    elif suff == "2G" or suff.startswith("2G"):
        return "2G"

    return _norm_net(raw_network)


def _norm_net(network: str) -> str:
    """Normalize raw network string."""
    net = str(network or "").upper()
    if 'RAN_4G' in net or '4G' in net:
        return '4G'
    elif 'UTRAN' in net or '3G' in net:
        return '3G'
    elif 'GERAN' in net or '2G' in net:
        return '2G'
    elif '5G' in net:
        return '5G'
    return net


def resolve_smartw_site(
    raw_input: str,
    raw_network: str = "",
    datasites: Optional[List[Dict[str, Any]]] = None
) -> Tuple[str, str, str]:
    """
    Parse a raw site ID from SmartW into:
    1. base_new_id (8 chars for active BTS, e.g. 'DNILKH11')
    2. base_old_id (6 chars for active BTS, e.g. 'DNLK45')
    3. detected_tech (e.g. '4G SRAN', '4G', '5G', '3G', '2G')

    Ensures that 7-char AGG transmission sites (DNILKH1, DNIDQN1) never
    clobber active 8-char BTS sites (DNILKH10 - DNILKH15).
    """
    if not raw_input:
        return "", "", _norm_net(raw_network)

    s = str(raw_input).strip().upper()

    # Strip common vendor/carrier prefixes
    if s.startswith("MBF_"):
        s = s[4:]
    if s.startswith("CSG-") or s.startswith("AGG-"):
        s = s[4:]

    base_part, sep_suffix = _split_delimiters(s)
    s_clean = base_part.strip().upper()

    # Step 1: Special Dedicated Sites (Exact Match Isolation)
    if s_clean in SPECIAL_SITES_EXACT:
        data = datasites or get_datasites_cache()
        old_id = s_clean
        for item in data:
            if (item.get("site_id") or "").strip().upper() == s_clean:
                old_id = (item.get("site_id_old") or "").strip().upper() or s_clean
                break
        return s_clean, old_id, _parse_tech_from_suffix(sep_suffix, raw_network)

    # Prepare lookup dictionaries
    if datasites is not None:
        lookup_new = {
            (d.get("site_id") or "").strip().upper(): d for d in datasites if d.get("site_id")
        }
        lookup_old = {
            (d.get("site_id_old") or "").strip().upper(): d for d in datasites if d.get("site_id_old")
        }
    else:
        get_datasites_cache()
        lookup_new = _lookup_by_new or {}
        lookup_old = _lookup_by_old or {}

    matched_new = ""
    matched_old = ""
    suffix = sep_suffix

    # Step 2: Exact Match against Full Clean String
    if s_clean in lookup_new:
        matched_new = s_clean
        matched_old = (lookup_new[s_clean].get("site_id_old") or "").strip().upper()
        return matched_new, matched_old, _parse_tech_from_suffix(sep_suffix, raw_network)

    if s_clean in lookup_old:
        item = lookup_old[s_clean]
        matched_old = s_clean
        matched_new = (item.get("site_id") or "").strip().upper()
        return matched_new, matched_old, _parse_tech_from_suffix(sep_suffix, raw_network)

    # Step 3: Active BTS MỚI (Strict 8-char rule: DNI + 3-char Ward + 2-digit number)
    # Check if raw input begins with DNI and has at least 8 characters
    if s_clean.startswith("DNI") and len(s_clean) >= 8:
        cand_8 = s_clean[:8]
        if cand_8 in lookup_new:
            matched_new = cand_8
            matched_old = (lookup_new[cand_8].get("site_id_old") or "").strip().upper()
            suffix = s_clean[8:] + sep_suffix
            tech = _parse_tech_from_suffix(suffix, raw_network)
            return matched_new, matched_old, tech
        elif RE_BTS_NEW.match(cand_8):
            # Formally valid new BTS pattern even if not yet in local datasites table
            matched_new = cand_8
            suffix = s_clean[8:] + sep_suffix
            tech = _parse_tech_from_suffix(suffix, raw_network)
            return matched_new, "", tech

    # Step 4: Active BTS CŨ (Strict 6-char rule: DN + 2-char District + 2-digit number)
    # Check if raw input begins with DN (not DNI) and has at least 6 characters
    if s_clean.startswith("DN") and not s_clean.startswith("DNI") and len(s_clean) >= 6:
        cand_6 = s_clean[:6]
        if cand_6 in lookup_old:
            item = lookup_old[cand_6]
            matched_old = cand_6
            matched_new = (item.get("site_id") or "").strip().upper()
            suffix = s_clean[6:] + sep_suffix
            tech = _parse_tech_from_suffix(suffix, raw_network)
            return matched_new, matched_old, tech
        elif cand_6 in lookup_new:
            # Rarely an old-formatted code stored in site_id
            matched_new = cand_6
            matched_old = (lookup_new[cand_6].get("site_id_old") or "").strip().upper()
            suffix = s_clean[6:] + sep_suffix
            tech = _parse_tech_from_suffix(suffix, raw_network)
            return matched_new, matched_old, tech
        elif RE_BTS_OLD.match(cand_6):
            matched_old = cand_6
            suffix = s_clean[6:] + sep_suffix
            tech = _parse_tech_from_suffix(suffix, raw_network)
            return matched_new or matched_old, matched_old, tech

    # Step 5: Planning / Construction Codes (26DNa... 8 characters)
    if s_clean.startswith("26") and len(s_clean) >= 8:
        cand_8 = s_clean[:8]
        if cand_8 in lookup_new:
            matched_new = cand_8
            matched_old = (lookup_new[cand_8].get("site_id_old") or "").strip().upper()
        else:
            matched_new = cand_8
        suffix = s_clean[8:] + sep_suffix
        return matched_new, matched_old, _parse_tech_from_suffix(suffix, raw_network)

    # Step 6: Fallback Longest Prefix Match
    # Exclude SPECIAL_SITES_EXACT from loose prefix matching to prevent DNILKH1 clobbering
    all_data = datasites or get_datasites_cache()
    sorted_data = sorted(
        all_data,
        key=lambda x: max(len(x.get("site_id") or ""), len(x.get("site_id_old") or "")),
        reverse=True
    )

    for item in sorted_data:
        s_id = (item.get("site_id") or "").strip().upper()
        s_old = (item.get("site_id_old") or "").strip().upper()

        if s_id and s_id not in SPECIAL_SITES_EXACT and s_clean.startswith(s_id):
            matched_new = s_id
            matched_old = s_old
            suffix = s_clean[len(s_id):] + sep_suffix
            break
        if s_old and s_old not in SPECIAL_SITES_EXACT and s_clean.startswith(s_old):
            matched_new = s_id
            matched_old = s_old
            suffix = s_clean[len(s_old):] + sep_suffix
            break

    tech = _parse_tech_from_suffix(suffix, raw_network)
    final_new = matched_new or (s_clean if not matched_old else "")
    return final_new or matched_old or s, matched_old, tech


def get_site_qlt_short(raw_input: str, datasites: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Look up QLT short name (e.g. 'Thái', 'Vinh', 'Khuân') for a given site ID.
    Extracts the last word of full name (e.g. 'Lê Thành Thái' -> 'Thái').
    Returns short name, or 'Khác' if not found.
    """
    if not raw_input:
        return "Khác"

    base_new, base_old, _ = resolve_smartw_site(raw_input, datasites=datasites)
    data = datasites or get_datasites_cache()

    for item in data:
        s_id = (item.get("site_id") or "").strip().upper()
        s_old = (item.get("site_id_old") or "").strip().upper()
        if (base_new and s_id == base_new) or (base_old and s_old == base_old) or (base_new and s_old == base_new):
            mgt = item.get("management_info") or {}
            full_name = (mgt.get("qlt") or "").strip()
            if full_name:
                parts = full_name.split()
                return parts[-1] if parts else full_name
            return "Khác"

    return "Khác"


def is_managed_site(raw_input: str, datasites: Optional[List[Dict[str, Any]]] = None) -> bool:
    """
    Check if the site exists in datasites table (i.e. managed by Telecom Team 3).
    """
    if not raw_input:
        return False

    base_new, base_old, _ = resolve_smartw_site(raw_input, datasites=datasites)
    data = datasites or get_datasites_cache()
    if not data:
        return True

    for item in data:
        s_id = (item.get("site_id") or "").strip().upper()
        s_old = (item.get("site_id_old") or "").strip().upper()
        if (base_new and (s_id == base_new or s_old == base_new)) or \
           (base_old and (s_old == base_old or s_id == base_old)):
            return True

    return False
