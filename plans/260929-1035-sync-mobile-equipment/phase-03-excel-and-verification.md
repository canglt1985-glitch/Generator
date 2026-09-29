# Phase 03: Excel Report Sync & End-to-End Verification
Status: ✅ Complete
Dependencies: Phase 01, Phase 02

## Objective
Cập nhật script xuất file Excel theo dõi thiết bị lưu động để đồng bộ với cơ sở dữ liệu mới (hiển thị Site ID cũ, chuẩn hóa 28 máy + 8 pin, 3 máy hỏng) và xuất file cập nhật ra Desktop.

## Requirements
### Functional
- [x] Script `scripts/export_mobile_equipment_excel.py`:
  - `format_location` hiển thị Site ID cũ ngắn gọn hoặc `Kho TVT3`.
  - Sheet 4 (KPI): cập nhật đúng 28 MPĐ, 8 Pin, 3 máy Hư/Hỏng.
- [x] Chạy script xuất file cập nhật ra Desktop: `/Users/cang_it/Desktop/Quan_Ly_Thiet_Bi_Luu_Dong_TVT3.xlsx`.
- [x] Kiểm tra toàn diện trên Web và file Excel.

## Implementation Steps
1. [x] Cập nhật `scripts/export_mobile_equipment_excel.py`.
2. [x] Chạy script tạo file Excel.
3. [x] Báo cáo nghiệm thu hoàn tất.
