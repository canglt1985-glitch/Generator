# Phase 02: SmartW Scraper ERA Alarm Info & Filter
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Cập nhật `backend/smartw/scraper.py` để không bỏ sót các cảnh báo máy nổ của thiết bị Ericsson ERA (vốn mang tên `External Alarm` và có `alarmInfo` chứa `Generator running`).

## Implementation Steps
1. [ ] Cập nhật hàm `scrape_mpd()`:
   - Thay đổi bộ lọc: Thay vì chỉ lọc `MPD_FILTER_KEYWORD in r.get('alarmName')`, kiểm tra cả `alarmName` và `alarmInfo`.
2. [ ] Cập nhật hàm `scrape_mfd_reports()`:
   - Thay đổi bộ lọc dòng 811: kiểm tra `'generat'` trong cả `r.get('alarmName')` và `r.get('alarmInfo')`.
3. [ ] Đảm bảo trường `alarmInfo` luôn được giữ lại trong dữ liệu JSON xuất ra (`mpd.json`, `mfd_reports.json`, `md.json`).

## Files to Modify
- `backend/smartw/scraper.py`

## Test Criteria
- [ ] Unit test với mẫu bản ghi ERA của `DNIXLO01L`:
  `{'alarmName': 'External Alarm', 'alarmInfo': 'Generator running'}` được nhận diện thành công vào danh sách MPĐ.

---
Next Phase: [phase-03-worker-site-id-strip.md](file:///Users/cang_it/Antigravity/TVT3/plans/260917-0910-smartw-era-mll-detection/phase-03-worker-site-id-strip.md)
