# 💡 BRIEF: Tách Bảng Kê Chạy Máy Phát Điện & Thống Kê Hóa Đơn Thành 2 Nhóm (Từ Tháng 8/2026)

**Ngày cập nhật:** 11/08/2026
**Phạm vi áp dụng:** Module Máy Phát Điện (`Generator.jsx`) & Báo cáo Vận hành Chi phí hàng ngày từ Tháng 08/2026 trở đi. (Module Chi Phí `Expenses.jsx` giữ nguyên).
**Tệp dữ liệu gốc:** `/Users/cang_it/Downloads/TVT3_ds67tram.xlsx`

---

## 1. YÊU CẦU & THỐNG NHẤT VỚI USER

### 📌 **A. Phạm vi & Ánh xạ Trạm**:
1. **Phạm vi thay đổi**:
   - **Áp dụng riêng cho trang Máy Phát Điện (`Generator.jsx`) & Báo cáo Vận hành Chi phí Hàng ngày**.
   - Các trang khác như **Chi Phí (`Expenses.jsx`) giữ nguyên 100%** không thay đổi.
2. **Ánh xạ Mã Trạm (Mapping)**:
   - Tất cả 67 trạm trong file `TVT3_ds67tram.xlsx` đã được ánh xạ chính xác 100% sang cơ sở dữ liệu V2.
   - Xác nhận cụ thể: `DNITNT1` = `DNTNL1` ➔ Mã V2 chuẩn: **`DNIDGI31`**.

---

### 🏢 **B. Thông Tin Đơn Vị Mua Hàng / Xuất Hóa Đơn Chi Tiết Cho 2 Nhóm**:

#### 1️⃣ **NHÓM 1: 67 Trạm Đặc Thù** *(Theo file Excel `TVT3_ds67tram.xlsx`)*
- **Tên đơn vị (Company Name)**: `MOBIFONE ĐỒNG NAI- CHI NHÁNH TỔNG CÔNG TY VIỄN THÔNG MOBIFONE`
- **Mã số thuế (Tax Code)**: `0100686209-129`
- **Địa chỉ (Address)**: `Số 236A Phan Trung, Phường Tam Hiệp, Đồng Nai, Việt Nam.`

#### 2️⃣ **NHÓM 2: Các Trạm Còn Lại** *(Tất cả trạm còn lại thuộc TVT3)*
- **Tên đơn vị (Company Name)**: `CHI NHÁNH TẠI TP HỒ CHÍ MINH CÔNG TY CỔ PHẦN CÔNG NGHỆ MOBIFONE TOÀN CẦU (TP HÀ NỘI)`
- **Mã số thuế (Tax Code)**: `0102577251-001`
- **Địa chỉ (Address)**: `Số 45 Võ Thị Sáu, Phường Tân Định, Thành phố Hồ Chí Minh, Việt Nam`

---

## 2. KẾT QUẢ PHÂN TÍCH DỮ LIỆU THÁNG 8/2026 (SUPABASE)

### 📊 **Số liệu thực tế Tháng 8/2026**:
- **Tổng số lượt chạy máy Tháng 8/2026**: 159 lượt.
- 📌 **Nhóm 1 (67 Trạm đặc thù - MobiFone Đồng Nai)**:
  - Lượt nổ máy: **26 lượt**
  - Nhiên liệu tiêu hao: **Dầu 318.2L | Xăng 0L**
- 🏢 **Nhóm 2 (Các trạm còn lại - MobiFone Toàn Cầu)**:
  - Lượt nổ máy: **133 lượt**
  - Nhiên liệu tiêu hao: **Dầu 1,027.7L | Xăng 961.8L**

---

## 3. PHƯƠNG ÁN THIẾT KẾ CỤ THỂ (`Generator.jsx` & `daily_report.py`)

### 📌 **A. Bộ Lọc Giao Diện (`Generator.jsx`)**
- Tại vùng chọn **Tháng / Năm**:
  - **Trước Tháng 8/2026**: Giữ nguyên xem/xuất 1 bảng kê tổng như hiện tại.
  - **Từ Tháng 8/2026 trở đi**: Hiển thị thêm **Dropdown Phân Loại Bảng Kê**:
    1. `Tất cả trạm (Tổng hợp)`
    2. `Nhóm 1: 67 Trạm Đặc Thù (MobiFone Đồng Nai)`
    3. `Nhóm 2: Các Trạm Còn Lại (MobiFone Toàn Cầu)`

### 📋 **B. Hiển Thị Thông Tin Đơn Vị Hóa Đơn & Báo Cáo Đối Chiếu Độc Lập**
- Báo cáo Hàng ngày & Lũy kế Tháng (MTD) tự động phân tách làm **2 phần Báo cáo riêng biệt** cho Nhóm 1 và Nhóm 2:
  - **Đối chiếu Tiêu hao (L) vs Ledger Mua (L) vs Hóa đơn (L)** độc lập cho từng nhóm.
  - Cảnh báo thiếu/thừa hóa đơn tức thì cho từng bảng kê thanh toán.

### 📊 **C. Tính Năng Xuất File Excel**
- Nút **"Xuất Excel Bảng Kê"** khi click ở Tháng 8/2026 trở đi sẽ kết xuất **1 File Excel duy nhất** (`Bang_Ke_Chay_May_Thang_08_2026.xlsx`) chứa **2 Sheet độc lập**:
  - **Sheet 1 (`67_Tram_Dac_Thu`)**: Bảng kê 26 lượt chạy máy (MobiFone Đồng Nai - MST `0100686209-129`).
  - **Sheet 2 (`Tram_Con_Lai`)**: Bảng kê 133 lượt chạy máy (MobiFone Toàn Cầu - MST `0102577251-001`).

---

## 4. BƯỚC TIẾP THEO
- Cập nhật Kế hoạch triển khai chi tiết (`implementation_plan.md`) và sẵn sàng lập trình.
