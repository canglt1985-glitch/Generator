# Phase 03: Backend Daily Report & CLI Exporter
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Cập nhật script CLI `scripts/export_official_mfd_statement.py` và báo cáo hàng ngày `backend/daily_report.py` để loại trừ các trạm Seath Group khỏi quyết toán nội bộ và bổ sung khả năng xuất báo cáo Seath Group qua terminal.

## Requirements
### Functional
- [x] `scripts/export_official_mfd_statement.py`:
  * Cập nhật hàm lọc loại trừ Seath Group khỏi Nhóm 1 (65 trạm) và Nhóm 2.
  * Bổ sung flag `--group seath` hoặc tự động tạo thêm sheet `SEATH_GROUP` khi xuất cả tháng.
  * Xuất file Excel Bảng kê Seath Group bằng Python (`openpyxl`) với font **Times New Roman**.
- [x] `backend/daily_report.py`:
  * Loại trừ các trạm Seath Group khỏi `SPECIAL_67_SITES_SET`.
  * Trong bảng tính MTD tiêu hao và đối soát chi phí (Nhóm 1 và Nhóm 2), không cộng dồn các ca chạy máy của Seath Group vào chi phí thanh toán nhiên liệu nội bộ.
  * Thêm thống kê riêng nếu ngày có ca nổ máy thuộc Seath Group (ví dụ: `⚠️ Trạm Seath Group (đối tác xử lý): DNXL28 (0.6h - 1.38L)`).

### Non-Functional
- [ ] Đảm bảo script CLI chạy độc lập bằng python, không phụ thuộc trình duyệt.
- [ ] Giữ nguyên các báo cáo khác không bị ảnh hưởng.

## Implementation Steps
1. [ ] Sửa `scripts/export_official_mfd_statement.py`: Import `backend/seath_group_config.py`, loại trừ Seath Group khỏi `is_group_1`, tạo hàm `create_seath_group_statement(month, year, output_path)`.
2. [ ] Sửa `backend/daily_report.py`: Loại trừ các trạm Seath Group khỏi tính toán MTD và ledger thanh toán nội bộ.

## Files to Create/Modify
- `scripts/export_official_mfd_statement.py` - CLI exporter cập nhật Seath Group.
- `backend/daily_report.py` - Báo cáo vận hành hàng ngày cập nhật tách chi phí.

## Test Criteria
- [ ] Chạy CLI: `python scripts/export_official_mfd_statement.py --month 8 --year 2026 --group seath` tạo file Excel Seath Group thành công.
- [ ] Chạy CLI: `python scripts/export_official_mfd_statement.py --month 9 --year 2026 --group seath` tạo file Excel Seath Group thành công.
- [ ] Chạy test `daily_report.py` không phát sinh lỗi cú pháp hay import.

---
Next Phase: [phase-04-retroactive-split-and-verification.md](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-04-retroactive-split-and-verification.md)
