# Phase 01: Database Schema & Hotfix Log 16/09
Status: ⬜ Pending
Dependencies: None

## Objective
1. Bổ sung cột `alarm_info` vào bảng `smartw_alarms` trên Supabase (nếu chưa có).
2. Nạp ngay 3 log chạy máy thực tế ngày 16/09/2026 cho `DNIXLO01`, `DNIXLO10`, `DNIXLO16` vào bảng `generator_logs` để xóa chúng khỏi danh sách thiếu log.

## Implementation Steps
1. [ ] Kiểm tra cột `alarm_info` trong bảng `smartw_alarms`. Nếu chưa có, thực hiện migration bổ sung cột.
2. [ ] Tạo script `scripts/hotfix_logs_20260916.py` chèn 3 bản ghi chạy máy:
   - `DNIXLO01`: 07:34 - 14:04 (~6.50h)
   - `DNIXLO10`: 09:36 - 16:45 (~7.15h) và 07:32 - 08:30 (~0.97h)
   - `DNIXLO16`: 08:20 - 15:45 (~7.42h)
3. [ ] Thực thi script và kiểm tra kết quả trong bảng `generator_logs`.
4. [ ] Chạy kiểm thử hàm `get_missing_logs_recommendations()` để xác nhận danh sách thiếu log ngày 16/09 đã sạch.

## Test Criteria
- [ ] Bảng `generator_logs` có 3 dòng log mới ngày 2026-09-16 với `status = 'approved'`.
- [ ] Báo cáo thiếu log ngày 16/09 không còn hiển thị `DNIXLO01`, `DNIXLO10`, `DNIXLO16`.

---
Next Phase: [phase-02-scraper-era-detection.md](file:///Users/cang_it/Antigravity/TVT3/plans/260917-0910-smartw-era-mll-detection/phase-02-scraper-era-detection.md)
