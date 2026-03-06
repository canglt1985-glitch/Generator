# 💡 BRIEF: Nâng Cấp Database DataSite (VT3-VHKT)

**Ngày tạo:** 2026-03-06
**Mục tiêu:** Cấu trúc lại toàn bộ cơ sở dữ liệu quản lý tài sản, thiết bị trạm Viễn Thông theo chuẩn taxonomy chuyên nghiệp, có khả năng mở rộng và cảnh báo lỗi dữ liệu.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Dữ liệu hiện tại nằm rải rác trên 14+ file Excel khác nhau với hàng trăm cột không đồng nhất.
- Cần một cấu trúc chuẩn hóa, dễ tra cứu, phân quyền theo nhóm nghiệp vụ (Hạ tầng, Phụ trợ, Kỹ thuật) và đặc biệt là kiểm soát được chất lượng dữ liệu (Data Quality).

## 2. GIẢI PHÁP ĐỀ XUẤT (CẤU TRÚC DATABASE)

Cơ sở dữ liệu sẽ được thiết kế thành **5 Nhóm Chính** theo đúng chuẩn quản lý Viễn Thông:

### 📦 Nhóm 1: Thông Tin Chung (General Info)
Nhóm này làm trục "xương sống" để các nhóm khác tham chiếu vào bằng `SITE_ID`. Nó gom toàn bộ dữ liệu từ file **Thông tin chung.xlsx** và **Data Trạm Nhà Dân...xlsx**.
- **Trạm (Stations):** Tên trạm, loại trạm, địa chỉ, vị trí, tọa độ...
- **Hợp Đồng (Contracts):** Thông tin hợp đồng thuê trạm, chủ nhà, CCCD, số điện thoại, tình trạng hợp đồng, giá thuê (VAT/không VAT), giá điện khoán...
- **Thanh Toán (Payments):** Chu kỳ thanh toán, ngày bắt đầu thanh toán, lịch sử thanh toán các tháng (-VAT, +VAT...).

### 🏢 Nhóm 2: Cơ Sở Hạ Tầng (Infrastructure)
Các hạng mục vật lý mang tính cố định:
- Cột Anten (Loại cột, chiều cao, dùng chung)
- Phòng Máy (Diện tích, vị trí)
- Phòng Máy Phát Điện (MFĐ)

### 🔌 Nhóm 3: Phụ Trợ (Auxiliary)
Các thiết bị đảm bảo nguồn và môi trường hoạt động:
- Máy Lạnh (BTU, loại máy)
- Máy Phát Điện (KVA, Pha, nhiên liệu)
- Tủ Nguồn (Số lượng Rectifier, dòng tải)
- Tổ Accu (Dung lượng, số lượng bình)
- Năng lượng mặt trời (Solar)
- Phòng cháy chữa cháy (PCCC)

### 📡 Nhóm 4: Kỹ Thuật (Telecom/Technical)
Các thiết bị phục vụ trực tiếp phát sóng và truyền dẫn:
- Tủ BTS 2G, 3G, 4G, 5G (BBU, RRU, cấu hình)
- Data Cell (Sector, eNB-ID, Tilt, Azimuth...)
- Truyền dẫn: Viba, Cáp quang, Thiết bị truyền dẫn chung
- Tiêu chuẩn: Kiểm định trạm (Ngày kiểm định, hạn kiểm định)

### 🛡️ Nhóm 5: Data Quality / Cross-check (Dữ Liệu Lỗi)
Một bảng (hoặc View) độc lập chạy nền để rà soát dữ liệu:
- **DataAuditLog:** Lưu các cảnh báo dữ liệu (VD: "Trạm DNCM02 có thiết bị Phụ Trợ nhưng chưa có Phòng Máy", "Thiết bị thiếu Serial", "Hết hạn hợp đồng"...).

## 3. PHƯƠNG ÁN LƯU TRỮ (TECHNICAL APPROACH)
- Có thể dùng mô hình **Relational Tables** (mỗi hạng mục 1 bảng riêng biệt như `tb_phu_tro_may_lanh`, `tb_ky_thuat_4g`) kết hợp khóa ngoại (Foreign Key) trỏ về nhóm Thông Tin Chung.
- Khớp nối dữ liệu thông minh qua mã `SITE_ID` và `Mã tài sản`.

## 4. TẠO BỘ LỌC KHI IMPORT DỮ LIỆU (DATA FILTERING)
- **Danh sách prefix Trạm của Tổ:** Chỉ lấy các dòng có `SITE_ID` thoả mãn 1 trong 2 điều kiện sau:
  1. Có sẵn trong DataBase hiện tại (Bảng `GeneralInfo`)
  2. Hoặc bắt đầu bằng các tiền tố: `DNTN`, `DNLK`, `DNXL`, `DNDQ`, `DNCM`, `DNTP`.
- Các trạm có mã Prefix khác (VD: BHM, DNBH...) sẽ bị skip (bỏ qua) để làm nhẹ DB.

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết: Vẽ sơ đồ Database JSON Schema, vạch ra các Script migrate dữ liệu.
