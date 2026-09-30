# Phase 04: Retroactive Split & Verification
Status: ✅ Complete
Dependencies: Phase 01, Phase 02, Phase 03

## Objective
Thực hiện cắt tách thực tế dữ liệu quá khứ của Tháng 8 và Tháng 9/2026, xuất kiểm tra 2 file Bảng kê Seath Group (Excel chuẩn Times New Roman), và đối soát lại hồ sơ nội bộ Mẫu 02A của Tháng 8 và 9 để đảm bảo 100% sạch sẽ và chính xác.

## Requirements
### Functional
- [x] Xuất file Bảng kê Seath Group Tháng 8/2026:
  * File name: `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T08_2026.xlsx`.
  * Khớp chính xác 3 ca máy: `DNITPU03` (31.41L), `DNITLA03` (13.11L), `DNIXBA07` (1.24L) ➔ Tổng: **45.76 Lít**.
- [x] Xuất file Bảng kê Seath Group Tháng 9/2026:
  * File name: `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx`.
  * Khớp chính xác 8 ca máy: `DNIXHO08` (5 ca), `DNILNA03` (1 ca), `DNIXBA07` (2 ca) ➔ Tổng: **53.54 Lít**.
- [x] Xuất lại Mẫu 02A nội bộ Tháng 8/2026 và Tháng 9/2026:
  * Kiểm tra không còn sót bất kỳ ca nào của 11 trạm Seath Group trong Nhóm 1 và Nhóm 2.
- [x] Kiểm tra font chữ trong file Excel xuất ra: 100% Times New Roman.

## Implementation Steps
1. [ ] Chạy script tạo 2 file Excel Bảng kê Seath Group T8 và T9/2026 vào thư mục output / desktop hoặc reports.
2. [ ] Rà soát cấu trúc file, kiểm tra font Times New Roman, định dạng lề, border, header, chữ ký.
3. [ ] Chạy đối soát kiểm tra chéo (cross-check) trên CSDL Supabase để đảm bảo:
   * Tổng số ca nội bộ T8 + số ca Seath T8 = Tổng số ca T8 gốc (159 ca).
   * Tổng số ca nội bộ T9 + số ca Seath T9 = Tổng số ca T9 gốc.
4. [ ] Báo cáo kết quả chi tiết cho User kèm link file tải về.

## Test Criteria
- [ ] File `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T08_2026.xlsx` mở được, font Times New Roman, tổng lít = 45.76 L.
- [ ] File `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx` mở được, font Times New Roman, tổng lít = 53.54 L.
- [ ] Không có lỗi lint hoặc crash trên frontend web khi chọn nhóm Seath Group.

---
Plan Complete ➔ Sẵn sàng thực thi qua `/code phase-01`
