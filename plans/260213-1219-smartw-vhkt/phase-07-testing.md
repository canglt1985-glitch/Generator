# Phase 07: Testing & Polish
**Status:** ⬜ Pending
**Dependencies:** Phase 05, Phase 06

## Objective
Test toàn bộ flow end-to-end, fix bugs, polish UI.

## Implementation Steps

1. [ ] **Test login SSO** với credentials thật → verify session management
2. [ ] **Test scrape cycle:** manual trigger → check JSON output đúng format
3. [ ] **Test scheduler:** để chạy 2-3 rounds alarm poll → verify data update
4. [ ] **Test clear detection:** tắt alarm trên SmartW → verify CLEARED badge hiện
5. [ ] **Test UI responsive:** mở trên mobile/tablet → verify bảng scroll OK
6. [ ] **Test MLL validation:** tạo tình huống thiếu/mâu thuẫn → verify highlight

## Files to Verify
- `web-app/smartw_scraper.py` — login + scrape flow
- `web-app/smartw_worker.py` — scheduler + clear detection
- `web-app/app.py` — routes + APIs
- `web-app/templates/vhkt.html` — UI rendering
- `web-app/helpers.py` — cross-check + MLL validation
- `data/smartw/*.json` — output files

## Polish Tasks
- [ ] Loading spinner khi đang fetch API
- [ ] Empty state: "Chưa có dữ liệu — Kiểm tra SmartW config"
- [ ] Error state: "Lỗi kết nối SmartW — Chi tiết: [error message]"

---
✅ Feature Complete → Phase 2 items sẽ plan khi MVP hoạt động ổn
