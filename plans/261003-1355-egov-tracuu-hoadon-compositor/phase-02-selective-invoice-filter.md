# Phase 02: Bộ Lọc Hóa Đơn & Nguồn Excel

Status: ⬜ Pending  
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-01-core-egov-refactor-template.md)  

## Objective
Xây dựng cơ chế lựa chọn linh hoạt nguồn dữ liệu và các hóa đơn cần tra cứu ("áp dụng cho các hóa đơn cần sử dụng"), hỗ trợ chỉ định file Excel tùy ý hoặc lọc theo số hóa đơn, số thứ tự, hoặc bỏ qua các hóa đơn đã có ảnh sẵn.

## Requirements
### Functional
- [ ] **Tự động tìm kiếm file Excel nguồn:**
  - Hỗ trợ tham số `--excel <path>` qua CLI.
  - Nếu không chỉ định, tự động tìm các file như `Bangkenhienlieu.xlsx`, hoặc các file bảng kê trong `scratch/` (như `scratch/Hoa_Don_Xang_Dau_*.xlsx`).
- [ ] **Lọc danh sách hóa đơn cần xử lý:**
  - Hỗ trợ tham số `--so-hd <so1,so2,...>`: Chỉ chạy các hóa đơn có số tương ứng.
  - Hỗ trợ tham số `--rows <from>-<to>` hoặc `--stt <1,2,3>`: Chỉ chạy các dòng cụ thể.
  - Hỗ trợ tham số `--skip-existing`: Nếu hóa đơn đã có file ảnh trong `Hoadon.JPG/` thì tự động bỏ qua để tiết kiệm thời gian.
  - Hỗ trợ tham số `--limit <n>`: Giới hạn số lượng hóa đơn cần chạy trong lần thử nghiệm.
- [ ] Cập nhật kết quả vào cột `EGOV_CHECK` trong file Excel đầu ra một cách an toàn.

## Implementation Steps
1. [ ] Thêm module phân tích tham số dòng lệnh `argparse` vào [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py).
2. [ ] Viết hàm lọc DataFrame `filter_target_invoices(df, so_hd_list, rows_range, skip_existing_dir)` áp dụng trước khi đưa vào hàng đợi `tasks`.
3. [ ] In bảng tóm tắt danh sách các hóa đơn được chọn trước khi kích hoạt worker Playwright để người dùng kiểm soát.

## Files to Create/Modify
- [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) - Tích hợp bộ lọc hóa đơn và CLI arguments.

---
Next Phase: [Phase 03: Kiểm Thử Thực Tế & Xuất Kết Quả](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/phase-03-full-flow-export-testing.md)
