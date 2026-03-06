# Phase 02: Python Auto Scraper (Background Sync)
Status: ⬜ Pending
Dependencies: phase-01-database.md

## Objective
Viết script tự login DataSite bằng Request, lấy Session ID, sau đó tự xuất File Excel định kỳ.

## Requirements
### Functional
- [ ] Hàm `login_datasite(username, password)` trả về Session ID hợp lệ.
- [ ] Hàm `request_export_asset(session_id, asset_type_id)` gọi API tạo File.
- [ ] Hàm `poll_and_download(session_id, task_id)` đợi file tạo xong, lấy link, tải về thư mục `tmp`.

### Non-Functional
- [ ] Cơ chế xử lý Timeout / Chặn Request.
- [ ] Luồng chạy trong Flask Background Scheduler (VD: APScheduler).

## Implementation Steps
1. [ ] Cài thêm `APScheduler` hoặc cấu hình luồng chạy Threading cho Flask.
2. [ ] Hoàn thiện `datasite_scraper.py` mô phỏng hành vi Subagent.
3. [ ] Xây dựng Endpoint / Nút giao diện cho Admin "Chạy đồng bộ thủ công ngay bây giờ" thay vì đợi lịch.

## Files to Create/Modify
- `web-app/datasite_scraper.py`
- `web-app/app.py` - Gọi module tạo lịch hẹn APScheduler

---
Next Phase: `phase-03-webui.md`
