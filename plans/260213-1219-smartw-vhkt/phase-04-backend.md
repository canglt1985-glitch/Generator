# Phase 04: Backend API
**Status:** ⬜ Pending
**Dependencies:** Phase 03

## Objective
Tạo route `/vhkt` + API endpoints để frontend lấy dữ liệu SmartW.

## Implementation Steps

1. [ ] **Route `/vhkt`** — render template `vhkt.html`
   - Truyền: summary counts (MĐ, MPĐ, MLL, ứng cứu)
   - Truyền: scrape status (last poll, errors)
2. [ ] **API `/api/smartw/md`** — trả JSON data MĐ (active + cleared)
3. [ ] **API `/api/smartw/mpd`** — trả JSON data MPĐ (active + cleared)
4. [ ] **API `/api/smartw/mll`** — trả JSON data MLL + validation flags
5. [ ] **API `/api/smartw/vhkt`** — trả JSON data VHKT
6. [ ] **API `/api/smartw/summary`** — trả dashboard counts
   - `md_count`, `mpd_count`, `mll_count`, `ung_cuu_count`
   - Cross-check MĐ ↔ MPĐ: đếm trạm MĐ chưa có MPĐ
7. [ ] **Cross-check logic (helpers):**
   - Load `md_active.json` + `mfd_active.json`
   - Match by `site_id`: MĐ có → MPĐ có? Nếu không → ứng cứu

## Files to Create/Modify
- `web-app/app.py` — thêm route `/vhkt` + 5 API endpoints
- `web-app/helpers.py` — thêm hàm `get_smartw_summary()`, `cross_check_md_mpd()`
- `web-app/smartw_worker.py` — thêm hàm `load_json()` helpers

## Test Criteria
- [ ] `/vhkt` render đúng template
- [ ] `/api/smartw/md` trả JSON list
- [ ] `/api/smartw/summary` trả đúng counts
- [ ] Cross-check: trạm MĐ không có MPĐ → đếm vào ứng cứu
- [ ] Cleared items hiện đúng + ẩn sau 1h

---
Next Phase: [Phase 05 — Frontend UI](phase-05-frontend.md)
