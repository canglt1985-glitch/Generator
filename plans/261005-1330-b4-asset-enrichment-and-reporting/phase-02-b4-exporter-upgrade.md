# Phase 2: Nâng cấp B4 Repair Proposal Exporter

**Mã giai đoạn:** `PHASE-02-B4-EXPORTER-UPGRADE`  
**Thuộc kế hoạch:** `261005-1330-b4-asset-enrichment-and-reporting`  
**Mục tiêu:** Cập nhật module `tvt3_v2/src/utils/b4RepairExporter.js` xuất file Excel chuẩn 100% biểu mẫu đã được TCT/Đài phê duyệt.

---

## 1. Yêu cầu kỹ thuật đối với Biểu mẫu B4

### 1.1. Sheet `Máy phát điện_Cố định` (26 Cột Chuẩn A $\rightarrow$ Z):
- **Cột A (1)**: STT
- **Cột B (2)**: Tỉnh (`Đồng Nai`)
- **Cột C (3)**: Mã ERP trạm đặt thiết bị (Tự động đổi sang mã trạm sổ sách ERP nếu nằm trong danh sách 17 trạm điều chuyển)
- **Cột D (4)**: Phân loại (`TSCĐ`, `CCDC`, `Hiện vật`)
- **Cột E (5)**: Tên thiết bị/vật tư (`Máy phát điện`)
- **Cột F (6)**: thiết bị/vật tư (Mã VT 14 số)
- **Cột G (7)**: Mã tài sản/ mã CCDC (Mã TSCĐ mới 15 số `2027B15...`)
- **Cột H (8)**: Serial (Bổ sung cột Serial đang bị thiếu trong code cũ)
- **Cột I (9)**: Thời gian bắt đầu đưa vào khai thác sử dụng
- **Cột J (10)**: Hãng sản xuất
- **Cột K (11)**: Công suất (kVA)
- **Cột L (12)**: Công cụ theo dõi/quản lý (`Datasite`)
- **Cột M (13)**: Lịch sửa sửa chữa từ 01/01/2025 đến nay (số lần sửa - sửa lại từ chi phí tiền thành số lần)
- **Cột N (14)**: Mô tả hiện trạng, tình trạng hỏng
- **Cột O (15)**: Chi phí sửa chữa dự kiến - Trước VAT (Công thức `=SUM(P{r}:Z{r})`)
- **Cột P..Z (16..26)**: Đủ 11 Hạng mục kỹ thuật B4 (Đại tu động cơ, Đầu phát, Khởi động DC, Nhiên liệu, Làm mát, Điều khiển ATS, Điện công suất, Khí xả/nạp, Relay bảo vệ, Dinamo nạp DC, Bảo dưỡng tổng thể)

### 1.2. Sheet `Điều hòa` (25 Cột Chuẩn A $\rightarrow$ Y):
- Chuẩn hóa 25 cột cho Điều hòa không khí (BTU, Serial dàn nóng/lạnh, 11 hạng mục chuyên môn ĐHKK).
- Tự động điền phân loại `CCDC` hoặc `Hiện vật`.

### 1.3. Sheet `Diễn giải DM hỏng tham chiếu`:
- Kèm theo từ điển giải nghĩa chi tiết 11 hạng mục của cả MPĐ và Điều hòa để cấp trên dễ thẩm định.

---

## 2. Các công việc thực hiện (Tasks)

### Task 2.1: Sửa đổi cấu trúc mảng danh mục B4
- Cập nhật `B4_REPAIR_CATEGORIES.MPD_CO_DINH` từ 8 lên **11 Hạng mục**.
- Cập nhật `B4_REPAIR_CATEGORIES.DHKK` chuẩn **11 Hạng mục**.

### Task 2.2: Tái cấu trúc hàm `exportB4RepairProposal`
- Sắp xếp thứ tự cột đúng tuyệt đối theo mẫu đã duyệt.
- Thêm cột `Serial` (Cột H).
- Thay thế cột M thành `Lịch sử sửa chữa từ 01/01/2025 (số lần sửa)`.
- Áp dụng công thức Excel tính tổng dự toán cho Cột Chi phí.
- Định dạng độ rộng cột (Column widths), font chữ và viền bảng biểu.

---

## 3. Tiêu chí hoàn thành (Acceptance Criteria)
- [ ] File xuất ra mở được trên Microsoft Excel, Google Sheets mà không bị lỗi layout.
- [ ] Số lượng và tên tiêu đề cột khớp 100% với file `TVT3-B4. Biểu mẫu chuyên môn sua DHKK &  MPD.xlsx`.
- [ ] 17 trạm điều chuyển tự động hiển thị đúng mã trạm sổ sách ERP tại Cột C.
