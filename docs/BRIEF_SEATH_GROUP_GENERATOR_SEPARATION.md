# 💡 BRIEF: Phân Tách 11 Trạm XHH Chạy MPĐ Gửi Đối Tác Seath Group Xử Lý Riêng

**Ngày lập:** 30/09/2026  
**Dự án:** Antigravity TVT3 - Module Máy Phát Điện & Quyết Toán Nhiên Liệu  
**Trạng thái:** Brainstorm Completed ➔ Ready for Plan (`/plan`)

---

## 1. BỐI CẢNH & MỤC TIÊU (CORE PROBLEM & VALUE)

- **Vấn đề:** 
  Hiện tại có **11 trạm thuê Xã hội hóa (XHH)** do đối tác hạ tầng (**Seath Group**) quản lý. Trước đây, khi các trạm này phát sinh ca chạy máy phát điện (MPĐ), dữ liệu chạy máy vẫn được gom chung vào hồ sơ thanh toán nội bộ của MobiFone (chia vào Nhóm 1 - MobiFone Đồng Nai hoặc Nhóm 2 - MobiFone Toàn Cầu).
  Theo quy định/thỏa thuận mới, chi phí nhiên liệu chạy MPĐ tại 11 trạm này do **Seath Group chịu trách nhiệm xử lý riêng**, không đưa vào hồ sơ thanh toán kinh phí nội bộ của MobiFone Đồng Nai / TVT3.

- **Mục tiêu:**
  1. **Loại trừ 100%** các ca chạy máy của 11 trạm này ra khỏi **Hồ sơ thanh toán nội bộ** (Mẫu 02A-TTNB_NLMPD & Bảng kê hóa đơn nội bộ) từ Tháng 8/2026 trở đi (bao gồm T8, T9 và các tháng tiếp theo).
  2. **Tách riêng thành luồng dữ liệu độc lập** để theo dõi và xuất file: **"Bảng kê chạy máy phát điện Seath Group"** (file Excel chuẩn font Times New Roman, đầy đủ ngày giờ chạy, số lít tiêu hao, lý do cúp điện/sự cố, KTV vận hành).
  3. Cập nhật báo cáo hàng ngày (`daily_report.py`) để không tính chi phí 11 trạm này vào ngân sách thanh toán nhiên liệu nội bộ, đồng thời khi bot thông báo nổ máy thì có ghi chú rõ `[Trạm XHH - Seath Group xử lý]`.

---

## 2. DANH SÁCH 11 TRẠM SEATH GROUP (MAPPING CHUẨN)

| STT | Mã trạm cũ | Mã trạm chuẩn V2 | Loại trạm (CSHT) | Đơn vị QL | Phân nhóm cũ | Trạng thái mới |
| :---: | :---: | :---: | :--- | :---: | :---: | :---: |
| 1 | **DNCM05** | `DNIXDO02` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |
| 2 | **DNDQ09** | `DNIPHO01` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |
| 3 | **DNDQ12** | `DNILNA02` | Trạm remote XHH | VT3 | ⚠️ Nhóm 1 (67 trạm) | **Seath Group** |
| 4 | **DNDQ13** | `DNILNA03` | Trạm BBU XHH | VT3 | Nhóm 2 | **Seath Group** |
| 5 | **DNDQ14** | `DNILNA04` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |
| 6 | **DNTN07** | `DNIDGI05` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |
| 7 | **DNTP11** | `DNITPU03` | Trạm remote XHH | VT3 | ⚠️ Nhóm 1 (67 trạm) | **Seath Group** |
| 8 | **DNTP12** | `DNITLA03` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |
| 9 | **DNTP13** | `DNITPU04` | Trạm trung gian XHH | VT3 | Nhóm 2 | **Seath Group** |
| 10 | **DNXL28** | `DNIXHO08` | Trạm trung gian XHH | VT3 | Nhóm 2 | **Seath Group** |
| 11 | **DNXL31** | `DNIXBA07` | Trạm remote XHH | VT3 | Nhóm 2 | **Seath Group** |

> 📌 **LƯU Ý ĐẶC BIỆT KHI CẮT TÁCH:**
> - Hai trạm `DNDQ12` (`DNILNA02`) và `DNTP11` (`DNITPU03`) trước đây nằm trong tập hợp `SPECIAL_67_SITES_SET`. Khi tách sang Seath Group, **bắt buộc phải loại trừ ra khỏi danh sách 67 trạm đặc thù của Nhóm 1** để không bị kéo vào hồ sơ thanh toán MobiFone Đồng Nai.

---

## 3. SỐ LIỆU ĐÃ PHÁT SINH TRONG QUÁ KHỨ (CẦN TÁCH NGAY)

### A. Tháng 08/2026 (3 ca chạy máy):
1. `DNITPU03` (`DNTP11`): Ngày 11/08/2026 | 9.13h | Định mức 3.44 L/h | **31.41 L** | 867,544 đ
2. `DNITLA03` (`DNTP12`): Ngày 17/08/2026 | 5.70h | Định mức 2.30 L/h | **13.11 L** | 361,049 đ
3. `DNIXBA07` (`DNXL31`): Ngày 27/08/2026 | 0.54h | Định mức 2.30 L/h | **1.24 L** | 32,079 đ
- **Tổng T8 Seath Group:** **3 ca** | **15.37 giờ** | **45.76 L dầu** | **1,260,672 đ**.

### B. Tháng 09/2026 (8 ca chạy máy):
1. `DNIXHO08` (`DNXL28`): Ngày 06/09/2026 | 0.68h | 2.30 L/h | **1.56 L** | 46,082 đ
2. `DNIXHO08` (`DNXL28`): Ngày 06/09/2026 | 0.60h | 2.30 L/h | **1.38 L** | 40,765 đ
3. `DNIXHO08` (`DNXL28`): Ngày 06/09/2026 | 0.30h | 2.30 L/h | **0.69 L** | 19,003 đ
4. `DNILNA03` (`DNDQ13`): Ngày 07/09/2026 | 8.28h | 2.30 L/h | **19.04 L** | 562,442 đ
5. `DNIXBA07` (`DNXL31`): Ngày 08/09/2026 | 7.00h | 2.30 L/h | **16.10 L** | 475,594 đ
6. `DNIXBA07` (`DNXL31`): Ngày 08/09/2026 | 3.37h | 2.30 L/h | **7.75 L** | 213,435 đ
7. `DNIXHO08` (`DNXL28`): Ngày 09/09/2026 | 0.42h | 2.30 L/h | **0.97 L** | 28,654 đ
8. `DNIXHO08` (`DNXL28`): Ngày 09/09/2026 | 2.63h | 2.30 L/h | **6.05 L** | 178,717 đ
- **Tổng T9 Seath Group:** **8 ca** | **23.28 giờ** | **53.54 L dầu** | **1,564,692 đ**.

---

## 4. GIẢI PHÁP THỰC HIỆN CHI TIẾT (ARCHITECTURE & CHANGES)

### A. Tầng Cấu Hình & Nhận Diện (Core Configuration)
- Định nghĩa tập hợp trạm Seath Group dùng chung cho cả Frontend và Backend:
  ```javascript
  // Hỗ trợ cả mã cũ và mã mới
  export const SEATH_GROUP_SITES = new Set([
    'DNCM05', 'DNDQ09', 'DNDQ12', 'DNDQ13', 'DNDQ14', 
    'DNTN07', 'DNTP11', 'DNTP12', 'DNTP13', 'DNXL28', 'DNXL31',
    'DNIXDO02', 'DNIPHO01', 'DNILNA02', 'DNILNA03', 'DNILNA04',
    'DNIDGI05', 'DNITPU03', 'DNITLA03', 'DNITPU04', 'DNIXHO08', 'DNIXBA07'
  ]);
  ```

### B. Tầng Web Frontend (`Generator.jsx` & `mfdStatementExporter.js`)
1. **Dropdown Phân Loại Nhóm**:
   - Thêm lựa chọn vào bộ lọc:
     * `Tất cả trạm`
     * `Nhóm 1: 67 Trạm Đặc Thù (MobiFone Đồng Nai)`
     * `Nhóm 2: Các Trạm Còn Lại (MobiFone Toàn Cầu)`
     * `Nhóm 3: Đối Tác Seath Group (Xử lý riêng)`
2. **Loại trừ khỏi Hồ sơ Thanh toán Nội bộ (Mẫu 02A)**:
   - Khi chọn xuất Mẫu 02A (Nhóm 1, Nhóm 2 hoặc Toàn bộ), tự động loại trừ các ca chạy máy thuộc `SEATH_GROUP_SITES`.
3. **Thêm Chức Năng Xuất Riêng**:
   - Nút **"Xuất Bảng Kê Seath Group (Excel)"**: Tạo file Excel `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T{MM}_{YYYY}.xlsx`.
   - Tiêu chuẩn file: Font **Times New Roman**, tiêu đề *"BẢNG KÊ CHẠY MÁY PHÁT ĐIỆN SEATH GROUP"*, bảng chi tiết ca máy, tổng hợp số giờ, số lít dầu, chữ ký xác nhận.

### C. Tầng Backend Script & Báo Cáo (`daily_report.py`, `export_official_mfd_statement.py`)
1. `daily_report.py`:
   - Exclude `SEATH_GROUP_SITES` khỏi phép tính tiêu hao nội bộ Group 1 & Group 2.
   - Thêm mục thống kê nhỏ hoặc ghi chú nếu có ca nổ máy thuộc Seath Group trong ngày.
2. `export_official_mfd_statement.py`:
   - Bổ sung flag `--group seath` để xuất độc lập bảng kê cho Seath Group qua dòng lệnh.

---

## 5. KẾ HOẠCH BÀN GIAO & BƯỚC TIẾP THEO

1. **Bước tiếp theo:** Chạy workflow `/plan` để lập kế hoạch triển khai chi tiết từng task.
2. **Thực thi (`/code`):**
   - Viết helper module quản lý danh sách trạm Seath Group.
   - Cập nhật logic lọc trong `mfdStatementExporter.js` & `Generator.jsx`.
   - Cập nhật `export_official_mfd_statement.py` & `daily_report.py`.
   - Xuất thử nghiệm 2 file Bảng kê Seath Group tháng 8 và tháng 9/2026.
   - Kiểm tra lại hồ sơ thanh toán nội bộ T8 và T9 sau khi đã loại trừ 11 trạm.
