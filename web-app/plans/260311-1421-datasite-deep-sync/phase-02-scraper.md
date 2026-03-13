# Phase 02: Scalable Scraper Refactor
Status: ⬜ Pending
Dependencies: phase-01-database.md

## Objective
Xây dựng logic Playwright sử dụng tính năng "Xuất dữ liệu báo cáo" của DataSite để tải nhanh dữ liệu toàn bộ khu vực theo từng "Đối tượng" cấu hình sẵn.

## Requirements
### Functional
- [ ] **Object Mapping**: Tạo map `EXPORT_OBJECT_MAP` gộp các "Đối tượng" trên form xuất báo cáo vào Hạng mục tương ứng trong DB.
- [ ] **Export Triggering**: Viết logic tự mở popup Xuất dữ liệu, chọn `Tỉnh/Huyện` và chọn `Đối tượng`.
- [ ] **Download Handler**: Bấm nút Export, chờ tải file Excel/JSON về và nạp vào pandas/parser.

## Implementation Steps
1. [ ] Sửa `smartw/scraper.py`:
    - Thêm `EXPORT_OBJECT_MAP` (Map VD: `{'MAY_LANH': 'MAY_LANH', 'MAY_DO': 'THIET_BI_VT'}`)
2. [ ] Viết hàm `scrape_export_data(area, object_names)`: Logic thao tác giao diện xuất báo cáo và parse file.
3. [ ] Xử lý error: Xử lý file download error, popup không mở.

## Files to Create/Modify
- `web-app/smartw/scraper.py`

## Test Criteria
- [ ] Scraper mở được modal Xuất dữ liệu, chọn đúng đối tượng "PHÒNG MÁY" và tải được file.
- [ ] Parse được dữ liệu Excel/CSV tải về thành Hash Dictionary hoặc List.

---
Next Phase: [phase-03-worker.md](phase-03-worker.md)
