# 💡 BRIEF: Hệ Thống Sổ Cái Nhiên Liệu & Quản Lý Tồn Kho (v2.0)

**Ngày:** 2026-02-05
**Mục tiêu:** Giải quyết bài toán mua sỉ (mua lô lớn), lưu kho và phân phối dầu cho nhiều trạm máy phát điện.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại việc Mua và Đổ đang tách rời, khó theo dõi lượng dầu thực tế còn đang "nằm trong can/bồn" chưa được đổ vào máy.
- Mua một hóa đơn lớn (ví dụ 1000L) nhưng thực tế chia ra đổ cho 10 trạm khác nhau ở các thời điểm khác nhau.

## 2. GIẢI PHÁP: MÔ HÌNH KHO TỔNG (MAIN STOCK)
Hệ thống sẽ chuyển sang dùng một **Sổ Cái Duy Nhất** để quản lý dòng chảy của dầu:

### Các loại giao dịch:
1.  **NHẬP KHO (STOCK_IN)**: 
    - Mua dầu về chưa đổ vào máy (ví dụ mua 200L lưu tại kho/văn phòng).
    - Tác động: **Tăng** Tồn kho tổng. **Tăng** Tổng chi phí.
2.  **XUẤT KHO ĐỔ TRAM (STATION_OUT)**:
    - Lấy dầu từ bồn/can mang đi đổ vào máy phát điện tại trạm.
    - Tác động: **Giảm** Tồn kho tổng. (Không phát sinh thêm chi phí vì đã thanh toán lúc mua).
3.  **MUA ĐỔ THẲNG (DIRECT_BUY)**:
    - Mua dầu tại cây xăng và đổ trực tiếp vào máy tại trạm.
    - Tác động: **Không** ảnh hưởng tồn kho tổng. **Tăng** Tổng chi phí.

---

## 3. TÍNH NĂNG CHÍNH (MVP)

### 🚀 Giao diện Sổ Cái Tập Trung:
- Một bảng duy nhất hiển thị cả 3 loại giao dịch trên.
- Có Badge phân biệt màu sắc (Xanh: Nhập, Cam: Xuất, Tím: Đổ thẳng).
- Bộ lọc theo Loại giao dịch, ID Trạm, Nhà cung cấp.

### 📦 Quản lý Tồn Kho:
- Thẻ tóm tắt (Card) hiển thị **Tồn kho hiện tại** (Lượng nhập - Lượng xuất).
- Cảnh báo nếu xuất kho vượt quá lượng tồn thực tế.

### 💰 Quản lý Đơn Giá:
- Tự động lấy đơn giá của lần mua gần nhất để gợi ý khi làm phiếu xuất kho (STATION_OUT).
- Tính toán tổng tiền dựa trên đơn giá mua thực tế.

---

## 4. ƯỚC TÍNH KỸ THUẬT
- **Độ phức tạp**: Trung bình.
- **Dữ liệu**: Hợp nhất `FuelPurchaseLog` và `FuelRefillLog` thành `FuelTransaction`. Cần script chuyển đổi dữ liệu cũ cẩn thận để không làm mất thông tin.
- **Rủi ro**: Phải đảm bảo logic tính toán Tồn kho luôn chính xác khi người dùng Sửa/Xóa bản ghi cũ.

---

## 5. BƯỚC TIẾP THEO
1.  Anh duyệt bản tóm tắt này.
2.  Em sẽ lên `/plan` chi tiết sơ đồ bảng dữ liệu mới (đảm bảo không bị lỗi như lần trước).
3.  Thực hiện code và kiểm tra kỹ phần tính tồn kho.
