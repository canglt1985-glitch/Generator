"""
Seath Group XHH Stations Configuration (TVT3 V2)
Manages 11 XHH Partner Stations handled separately by Seath Group.
"""

# 11 Seath Group Partner Sites (Raw & Canonical)
SEATH_GROUP_SITES_RAW = [
    'DNCM05', 'DNDQ09', 'DNDQ12', 'DNDQ13', 'DNDQ14', 
    'DNTN07', 'DNTP11', 'DNTP12', 'DNTP13', 'DNXL28', 'DNXL31'
]

SEATH_GROUP_CANONICAL_SITES = [
    'DNIXDO02', 'DNIPHO01', 'DNILNA02', 'DNILNA03', 'DNILNA04',
    'DNIDGI05', 'DNITPU03', 'DNITLA03', 'DNITPU04', 'DNIXHO08', 'DNIXBA07'
]

# Set for fast O(1) lookup
SEATH_GROUP_SITES_SET = set(s.upper() for s in SEATH_GROUP_SITES_RAW + SEATH_GROUP_CANONICAL_SITES)

def is_seath_group_site(site_id: str, site_id_old: str = "") -> bool:
    """
    Check if a site belongs to Seath Group (11 XHH partner stations).
    """
    s1 = (site_id or "").strip().upper()
    s2 = (site_id_old or "").strip().upper()
    return s1 in SEATH_GROUP_SITES_SET or s2 in SEATH_GROUP_SITES_SET
