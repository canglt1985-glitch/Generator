import logging
logging.basicConfig(level=logging.DEBUG)
from app import app
from smartw.worker import _get_site_label

def _parse_site_suffix(site_id: str) -> tuple[str, str]:
    if not site_id:
        return "", ""
    s = site_id.strip()
    for delimiter in ['_', '-']:
        if delimiter in s:
            parts = s.split(delimiter)
            if parts[0]:
                base = parts[0]
                suffix = delimiter + delimiter.join(parts[1:])
                return base, suffix
    return s, ""

def test_label_custom(site_id: str) -> str:
    from models import DsCellRegistry, DsSiteRegistry
    site_upper = site_id.strip().upper()
    
    # 1. Try Cell Registry first
    cell_row = DsCellRegistry.query.filter(
        (DsCellRegistry.cell_id_new == site_upper) |
        (DsCellRegistry.cell_id_old == site_upper)
    ).first()
    if cell_row and cell_row.cell_id_new and cell_row.cell_id_old:
        return f"*{cell_row.cell_id_new}* ({cell_row.cell_id_old})"
    if cell_row and cell_row.cell_id_new:
        return f"*{cell_row.cell_id_new}*"
        
    # 2. Try Site Registry directly
    site_row = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new == site_upper) |
        (DsSiteRegistry.site_id_old == site_upper)
    ).first()
    if site_row and site_row.site_id_new and site_row.site_id_old:
        return f"*{site_row.site_id_new}* ({site_row.site_id_old})"
    if site_row and site_row.site_id_new:
        return f"*{site_row.site_id_new}*"
        
    # 3. Fallback: Parse suffix if it has _ or -
    base_id, suffix = _parse_site_suffix(site_id)
    base_upper = base_id.upper()
    
    row = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new == base_upper) |
        (DsSiteRegistry.site_id_old == base_upper)
    ).first()
    if row and row.site_id_new and row.site_id_old:
        return f"*{row.site_id_new}* ({row.site_id_old}){suffix}"
    if row and row.site_id_new:
        return f"*{row.site_id_new}*{suffix}"
        
    return f"*{site_id}*"

def test_old_custom(site_id: str) -> str:
    from models import DsCellRegistry, DsSiteRegistry
    site_upper = site_id.strip().upper()
    
    # 1. Try Cell Registry first
    cell_row = DsCellRegistry.query.filter(
        (DsCellRegistry.cell_id_new == site_upper) |
        (DsCellRegistry.cell_id_old == site_upper)
    ).first()
    if cell_row and cell_row.cell_id_old:
        return cell_row.cell_id_old
        
    # 2. Try Site Registry directly
    site_row = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new == site_upper) |
        (DsSiteRegistry.site_id_old == site_upper)
    ).first()
    if site_row and site_row.site_id_old:
        return site_row.site_id_old
        
    # 3. Fallback: Parse suffix if it has _ or -
    base_id, suffix = _parse_site_suffix(site_id)
    base_upper = base_id.upper()
    
    row = DsSiteRegistry.query.filter(
        (DsSiteRegistry.site_id_new == base_upper) |
        (DsSiteRegistry.site_id_old == base_upper)
    ).first()
    if row and row.site_id_old:
        return row.site_id_old + suffix
        
    return site_id

def test():
    app.app_context().push()
    
    test_cases = [
        'DNIBLC11CM5SA',  # Exists in DsCellRegistry
        'DNIHGO05CM3GA',  # Exists in DsCellRegistry
        'DNIXTC02DM3GB',  # Exists in DsCellRegistry
        'DNIXTC06_1',     # Does not exist in DsCellRegistry (falls back to DsSiteRegistry suffix parsing)
        'DNIXTC06',       # Exists in DsSiteRegistry
        'UNKNOWN_SITE_1'  # Not found anywhere
    ]
    print("Testing label formatting:")
    for tc in test_cases:
        print(f"Input: {tc:<15} -> Label: {test_label_custom(tc):<28} -> Old ID: {test_old_custom(tc)}")

test()
