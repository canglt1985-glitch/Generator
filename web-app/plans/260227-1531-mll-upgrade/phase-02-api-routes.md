# Phase 02: API Routes
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thêm API endpoint mới cho MLL Cell + cập nhật summary + worker

## Implementation Steps

### 1. [ ] Thêm route `/api/smartw/mll-cell` (routes.py)
```python
@smartw_bp.route('/api/smartw/mll-cell')
def api_mll_cell():
    """Return MLL Cell data — active CellOff (isDownSite=N)."""
    from .scraper import load_cached_data
    cached = load_cached_data('mll_cell')
    records = _classify_records(cached)

    return jsonify({
        'count': len(records),
        'data': records,
        'scraped_at': cached.get('scraped_at') if cached else None
    })
```

### 2. [ ] Cập nhật `api_summary()` — thêm mll_cell_count
```python
# Trong api_summary(), thêm:
mll_cell_raw = load_cached_data('mll_cell')
mll_cell_active = [r for r in _classify_records(mll_cell_raw) if r.get('status') == 'ACTIVE']

# Return thêm:
'mll_cell_count': len(mll_cell_active),
```

### 3. [ ] Cập nhật worker `run_alarm_poll()` — gọi thêm scrape_mll_cell()
```python
# Trong _do_alarm_poll(), sau dòng results['mll']:
results['mll_cell'] = await scraper.scrape_mll_cell()

# Cập nhật backup + clear detection:
for table_type in ['md', 'mpd', 'mll', 'mll_cell']:
    _backup_active(table_type)

# Cập nhật log message:
f'MLL Cell: {len(result.get("mll_cell", []))}'
```

### 4. [ ] Cập nhật `load_cached_data()` filenames dict
Đã nằm trong Phase 01 step 7 — double check ở đây.

### 5. [ ] Cập nhật crash retry trong worker
```python
# Trong retry block, thêm:
results['mll_cell'] = await scraper.scrape_mll_cell()
```

## Files to Create/Modify
- `smartw/routes.py` — Thêm api_mll_cell, sửa api_summary
- `smartw/worker.py` — Thêm scrape_mll_cell vào poll cycle

## Test Criteria
- [ ] GET `/api/smartw/mll-cell` trả JSON đúng format
- [ ] `/api/smartw/summary` trả thêm `mll_cell_count`  
- [ ] Worker poll gọi cả scrape_mll + scrape_mll_cell
- [ ] Clear detection hoạt động cho mll_cell

---
Next Phase: [phase-03-frontend.md](phase-03-frontend.md)
