# Phase 03: Worker Site ID Strip & Fallback Sync
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
1. Chuẩn hóa site ID (strip suffix `L`, `UL`, `N`) trong worker và mfd_import.
2. Bổ sung nhánh nhận diện MPĐ theo Danh sách trạm có máy phát điện khi có lịch cúp điện.
3. Lưu trường `alarm_info` vào bảng `smartw_alarms`.

## Implementation Steps
1. [ ] Trong `backend/smartw_worker.py`:
   - Hàm `_sync_alarms_to_supabase()`: Đưa `alarmInfo` vào payload insert/upsert `smartw_alarms` (cột `alarm_info`).
   - Hàm `auto_sync_mpd_alarms_fallback()`:
     - Dùng `_resolve_base_site_and_tech()` để giải mã `raw_site` (ví dụ `DNIXLO10L` -> `DNIXLO10`).
     - Bổ sung quét cả các alarm có `alarm_info` chứa `generat` hoặc cảnh báo `External Alarm` của các trạm nằm trong danh sách chạy máy trong khung giờ cúp điện lưới (`power_schedule`).
2. [ ] Trong `backend/smartw/mfd_import.py`:
   - Hàm `get_station_info()`: Dùng `_resolve_base_site_and_tech()` để không trả về `None` cho trạm ERA. Tránh lỗi crash `AttributeError`.

## Files to Modify
- `backend/smartw_worker.py`
- `backend/smartw/mfd_import.py`

## Test Criteria
- [ ] Chạy thử nghiệm hàm `_resolve_base_site_and_tech()` với `DNIXLO01L`, `DNIXLO10L`, `DNIXLO16L` trả về đúng trạm gốc và lấy được định mức máy nổ.

---
Next Phase: [phase-04-mll-cause-audit-fix.md](file:///Users/cang_it/Antigravity/TVT3/plans/260917-0910-smartw-era-mll-detection/phase-04-mll-cause-audit-fix.md)
