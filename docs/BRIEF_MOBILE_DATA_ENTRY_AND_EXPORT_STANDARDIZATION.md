# 💡 BRIEF: Rà Soát Tổng Thể Ứng Dụng TVT3 - Tối Ưu Mobile (Thuần Nhập Liệu) & Chuẩn Hóa Quản Lý File Xuất Desktop

**Ngày tạo:** 2026-10-06  
**Chủ đề:** Tối ưu hóa trải nghiệm di động (Field Operations) & Chuẩn hóa hậu tố thời gian cho toàn bộ file kết xuất (Desktop Management Center).

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

1. **Giao diện Mobile bị chật chội và rối mắt bởi các nút Xuất File:**
   - Hiện tại trên điện thoại di động (Smartphones), nhiều trang chính (`DailyWork.jsx`, `Generator.jsx`, `InfrastructureDevelopment.jsx`, `DatasiteDetailFullscreen.jsx`, `ContractDetailPanel.jsx`) vẫn hiển thị hàng loạt nút bấm xuất file: *Xuất B4 Đợt 1/Đợt 2, Dropdown B4, Xuất Bảng Kê Ắc Quy, Xuất Bảng Kê CSHT, Xuất Excel Thường, Hồ Sơ 02A, Seath Group, Map HĐ Trạm, ZIP Hóa Đơn, Word Hợp Đồng...*
   - Thực tế sử dụng: Kỹ thuật viên đi hiện trường dùng điện thoại chỉ cần **nhập liệu nhanh, báo hỏng 1-chạm, kiểm tra vị trí trạm và cập nhật trạng thái xử lý**. Việc tải về các file bảng tính Excel/Word/PDF trên điện thoại vừa làm nặng máy, vừa khó kiểm tra đầy đủ cột dòng và dễ bấm nhầm.

2. **File kết xuất thiếu ngày tháng dẫn đến khó quản lý và dễ bị ghi đè:**
   - Một số chức năng xuất file quan trọng hiện chưa có hậu tố ngày tháng (Timestamp) xuất thực tế:
     - Biểu mẫu B4 tổng hợp: `TVT3-B4. Bieu mau chuyen mon sua DHKK & MPD.xlsx` (thiếu ngày)
     - Hồ sơ thanh toán 02A TTNB: `Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx` (chỉ có tháng báo cáo, thiếu ngày xuất)
     - Báo cáo phân bổ HĐ trạm: `Bao_Cao_Phan_Bo_HD_Theo_Tram_Nhom1_T09_2026.xlsx` (thiếu ngày)
     - Bảng kê Seath Group: `Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026.xlsx` (thiếu ngày)
     - Hồ sơ trạm đơn lẻ: `Datasite_DNDQ01_Detail.xlsx` (thiếu ngày)
     - Hợp đồng Word: `DNDQ01_Phu_Luc_Giam_Gia.docx` (thiếu ngày)
   - Khi cán bộ văn phòng xuất nhiều bản thảo hoặc cập nhật lại số liệu nhiều lần trong tuần, các file này đè lên nhau hoặc khó phân biệt bản nào là mới nhất khi gửi trình Lãnh đạo/Đối tác.

---

## 2. GIẢI PHÁP ĐỀ XUẤT

### 📱 2.1. Triết lý Giao Diện Phân Tách Theo Thiết Bị
- **Trên Mobile (Viewport < 768px - Smartphones):**
  - **100% Thuần Nhập Liệu & Giám Sát:** Ẩn toàn bộ cụm nút xuất file (Excel, Word, ZIP, PDF).
  - Tối ưu không gian hiển thị cho các nút hành động cốt lõi:
    - `[+ Ghi nhật ký]`
    - `[+ Báo hỏng MPĐ / ĐHKK]`
    - `[+ Đề xuất mua ắc quy]`
    - `[+ Báo tồn tại CSHT]`
    - `[+ Thêm thiết bị lưu động]`
    - `[+ Đề xuất trạm mới CSHT]`
  - Giữ lại các nút tiện ích nhanh hiện trường: Gửi tin Viber 1-chạm, Copy nội dung, Điều chuyển thiết bị.
- **Trên Desktop (PC / Laptop):**
  - Giữ nguyên đầy đủ hệ sinh thái xuất file chuyên nghiệp (Executive Center).
  - Bố trí thanh công cụ xuất file khoa học, nhóm theo phân hệ và biểu mẫu.

### 🗂️ 2.2. Chuẩn Hóa Định Danh File Kết Xuất (Naming Convention)
- Mọi file kết xuất đều tuân theo cấu trúc chuẩn:
  `[Tên_Báo_Cáo]_[Mã_Trạm/Phân_Kỳ]_[YYYYMMDD].xlsx` (hoặc `.docx` / `.pdf` / `.zip`)
- Ví dụ cụ thể:
  - B4 Toàn Bộ: `TVT3_Bieu_Mau_B4_DHKK_MPD_20261006.xlsx`
  - B4 Đợt 2: `TVT3_De_Nghi_Sua_Chua_B4_DOT_2_20261006.xlsx`
  - Ắc quy UCTT: `TVT3_Bang_Ke_De_Xuat_Mua_Ac_Quy_De_MPD_20261006.xlsx`
  - Tồn tại CSHT: `TVT3_Ton_Tai_De_Xuat_Sua_Chua_Ha_Tang_Dia_Ban_20261006.xlsx`
  - Hồ sơ 02A TTNB: `TVT3_Ho_So_Thanh_Toan_02A_TTNB_T09_2026_20261006.xlsx`
  - Phân bổ HĐ Nhóm 1: `TVT3_Bao_Cao_Phan_Bo_HD_Theo_Tram_Nhom1_T09_2026_20261006.xlsx`
  - Bảng kê Seath: `TVT3_Bang_Ke_Chay_May_Phat_Dien_Seath_Group_T09_2026_20261006.xlsx`
  - Hợp đồng Word: `DNDQ01_Phu_Luc_Dam_Phan_20261006.docx`
  - Biên bản làm việc: `DNDQ01_Bien_Ban_Lam_Viec_20261006.docx`
  - Chi tiết trạm Excel: `Datasite_DNDQ01_Detail_20261006.xlsx`

---

## 3. RÀ SOÁT CÁC ĐIỂM CẦN NÂNG CẤP THEO TỪNG COMPONENT

| STT | Trang / Module | Các nút Export cần ẩn trên Mobile (`hidden md:inline-flex`) | Cần chuẩn hóa tên file kèm Ngày Tháng |
| :---: | :--- | :--- | :--- |
| **1** | `tvt3_v2/src/pages/DailyWork.jsx` | - Nút xuất B4 (`b4BatchFilter`) & Dropdown 6 sheet<br>- Nút xuất ắc quy đề MPĐ (`BATTERY_UCTT`)<br>- Nút xuất CSHT địa bàn (`LOCAL_INFRA`)<br>- Nút xuất toàn bộ Excel / Excel thường | Đã có ngày tháng ở các hàm con, cần bổ sung ngày tháng cho bản xuất full B4. |
| **2** | `tvt3_v2/src/pages/Generator.jsx` | - Nút Hồ Sơ 02A (`exportToExcel`)<br>- Nút Bảng Kê Seath (`exportSeathGroupReport`)<br>- Nút MPĐ Lưu Động<br>- Cụm nút tab Invoices: PDF GDT, PDF Hóa Đơn, ZIP Nhóm 1, Map HĐ Trạm, ZIP Tất Cả, Bảng Kê<br>- Nút Xuất Excel tab Anomalies & Transfer | Cập nhật `mfdStatementExporter.js` bổ sung hậu tố `_${todayStr}` cho: Hồ Sơ 02A, Map HĐ Trạm, Seath Group. |
| **3** | `tvt3_v2/src/pages/InfrastructureDevelopment.jsx` | - Nút `Xuất Excel`<br>- Nút `Báo Cáo Rà Soát CSHT` | Cập nhật tải báo cáo và file xuất phụ lục kèm `${todayStr}`. |
| **4** | `tvt3_v2/src/components/datasites/DatasiteDetailFullscreen.jsx` | - Nút `Xuất Excel` ở thanh footer modal chi tiết | Thêm ngày tháng cho trường hợp xuất trạm đơn lẻ `Datasite_${site_id}_Detail_${todayStr}.xlsx`. |
| **5** | `tvt3_v2/src/components/datasites/ContractExportButton.jsx` | - Nút `ContractExportButton` trong `ContractDetailPanel.jsx` | Bổ sung hậu tố `_${todayStr}` cho cả file hợp đồng Word chính và Biên bản làm việc BBLV. |

---

## 4. KẾ HOẠCH TRIỂN KHAI (DỰ KIẾN KHI CHUYỂN SANG /PLAN)

- **Phase 1 (Mobile Clean-up):** Rà soát và thêm class `hidden md:inline-flex` (hoặc `hidden md:flex`) cho toàn bộ các nút xuất file ở 5 component trên; kiểm tra viewport 390px đảm bảo giao diện gọn gàng, thanh thoát 100% dành cho nhập liệu.
- **Phase 2 (File Naming Standardization):** Cập nhật các hàm xuất trong `b4RepairExporter.js`, `mfdStatementExporter.js`, `ContractExportButton.jsx`, `Datasites.jsx` đảm bảo 100% file tải về đều tự động gắn ngày xuất `_YYYYMMDD`.
- **Phase 3 (Testing & Build Verification):** Chạy kiểm thử build Vite, test thực tế hành vi tải file trên Desktop và xác thực giao diện trên điện thoại di động.
