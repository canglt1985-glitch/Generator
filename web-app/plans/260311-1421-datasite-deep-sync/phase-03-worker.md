# Phase 03: Queue & Worker Implementation
Status: ⬜ Pending
Dependencies: phase-02-scraper.md

## Objective
Triển khai cơ chế quản lý tiến trình đồng bộ (Job Queue) thông qua việc yêu cầu xuất dữ liệu cho từng "Đối tượng" tại DataSite.

## Requirements
### Functional
- [ ] **Export Manager**: Quản lý danh sách các Đối tượng (VD: `['PHÒNG MÁY', 'PHÒNG MPĐ']`) cần sync.
- [ ] **Worker Logic**: Chạy vòng lặp gọi `scrape_export_data`, báo cáo tiến độ qua SSE (đã tải và xử lý xong đối tượng nào).
- [ ] **Upsert DB**: Xử lý logic đọc file được tải về, gom nhóm (Grouping) các đối tượng tương đương vào đúng Hạng mục UI và chèn vào DB.

## Implementation Steps
1. [ ] Sửa `smartw/worker.py`:
    - Thêm `ExportSyncWorker`: Nhận request chứa khu vực và đối tượng cần sync, gọi scraper, lưu kết quả.
    - Phát SSE event `sync_progress`.
2. [ ] Sửa `smartw/routes.py`:
    - Thêm API khởi tạo job `/api/datasite/sync/start` nhận payload `{"objects": [...]}`.

## Files to Create/Modify
- `web-app/smartw/worker.py`
- `web-app/smartw/routes.py`

## Test Criteria
- [ ] Gửi list 2 object -> Worker báo hoàn thành Object 1, nạp xong Database, sang Object 2.
- [ ] Đối tượng `MAY_DO` và `SFP_BBU_RRU` (nếu có) được gom chung vào hạng mục lớn.

---
Next Phase: [phase-04-ui.md](phase-04-ui.md)
