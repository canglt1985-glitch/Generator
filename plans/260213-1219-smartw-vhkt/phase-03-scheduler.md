# Phase 03: Scheduler & Worker
**Status:** ⬜ Pending
**Dependencies:** Phase 02

## Objective
Tích hợp scraper vào APScheduler: alarm poll 5 phút, VHKT 1 lần/sáng.
Quản lý "clear detection" qua so sánh active vs previous JSON.

## Implementation Steps

1. [ ] Tạo file `web-app/smartw_worker.py` — worker wrapper
   - `run_alarm_poll()` — scrape MĐ + MPĐ + MLL, lưu active + previous
   - `run_vhkt_poll()` — scrape VHKT 1 lần
   - `get_scrape_status()` — return last_run, errors, is_running
2. [ ] **Clear detection logic:**
   - Trước khi scrape mới: copy `md_active.json` → `md_previous.json`
   - So sánh active vs previous → detect trạm vừa CLEAR
   - Trạm clear: thêm vào list `cleared` kèm timestamp
   - Tự ẩn sau 1 giờ
3. [ ] **Tích hợp APScheduler trong `app.py`:**
   - Alarm poll: `interval=300` (5 phút)
   - VHKT poll: `cron hour=7, minute=0` (7h sáng)
   - Start/stop controls qua admin panel
4. [ ] **Save `scrape_status.json`:**
   - `last_alarm_poll`, `last_vhkt_poll`, `errors[]`, `is_running`
5. [ ] **Error handling:**
   - Login failed → retry 1x → báo lỗi vào status
   - Timeout → skip round, retry next
   - HTML changed → log error, không crash
6. [ ] **Admin controls:**
   - Button manual trigger poll (MĐ/MPĐ/MLL hoặc VHKT)
   - Toggle on/off scheduler

## Files to Create/Modify
- `web-app/smartw_worker.py` — **[NEW]** Worker wrapper
- `web-app/app.py` — thêm scheduler jobs + admin controls
- `web-app/templates/admin_panel.html` — thêm worker status + controls

## Test Criteria
- [ ] Scheduler chạy alarm poll đúng 5 phút
- [ ] VHKT poll chạy lúc 7h sáng
- [ ] Clear detection hoạt động: trạm biến mất → show "vừa clear"
- [ ] Manual trigger từ admin panel hoạt động
- [ ] Error handling: login fail không crash app

---
Next Phase: [Phase 04 — Backend API](phase-04-backend.md)
