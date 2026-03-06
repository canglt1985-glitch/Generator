# 💡 BRIEF: DataSite Phase 2 (Tra cứu theo Hạng mục)

**Ngày tạo:** 2026-03-05
**Mục tiêu:** Nâng cấp khả năng tra cứu dữ liệu DataSite, chuyển từ góc nhìn "Từng Trạm" sang góc nhìn "Từng Hạng Mục Thiết Bị" trên toàn mạng.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại (Phase 1) chỉ có thể tra cứu thông tin thiết bị bằng cách gõ mã của một trạm cụ thể (VD: DNCM02).
- Khó khăn lớn là khi đội bảo trì hoặc quản lý muốn biết: "Toàn bộ TVT3 hiện có bao nhiêu máy lạnh?", "Bao nhiêu máy lạnh đang hỏng?", hoặc "Liệt kê danh sách tất cả Tủ Nguồn Huawei để lên kế hoạch nâng cấp". User không thể gõ từng mã trạm để đếm được.

## 2. GIẢI PHÁP ĐỀ XUẤT
- Tạo một trang / module mới (có thể tích hợp vào Dashboard DataSite hiện hành hoặc làm tab riêng) để tra cứu theo **Loại thiết bị (Asset Type)**.
- Hiển thị danh sách tổng hợp của loại thiết bị đó trên tất cả các trạm, kèm các bộ lọc thông minh (theo Trạng thái, Thương hiệu, v.v.).

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Nhân viên / Chuyên viên:** Tìm kiếm thiết bị để lên kế hoạch bảo trì, thay thế, điều chuyển tài sản.
- **Admin / Quản lý:** Thống kê tổng quan số lượng và tình trạng tài sản trên mạng lưới.

## 4. TÍNH NĂNG (FEATURE LIST)

### 🚀 MVP (Bắt buộc có trong Phase 2):
- [ ] **Dropdown chọn Hạng Mục:** Có một danh sách để chọn (Máy Phát Điện, Máy Lạnh, Tủ Nguồn, Accu, Cột Anten...).
- [ ] **Bảng hiển thị kết quả:** Hiển thị danh sách thiết bị thuộc hạng mục đã chọn trên toàn bộ các trạm. Các cột cơ bản: Tên trạm, Tên tài sản, Hãng, Thông số/Công suất, Trạng thái.
- [ ] **API Endpoint Backend:** API lấy dữ liệu theo `asset_type` (VD: `/api/datasite/filter?type=MAY_LANH`).

### 🎁 Phase 2.1 (Làm sau hoặc nếu còn thời gian):
- [ ] **Bộ lọc chi tiết (Filters):** Lọc danh sách theo "Trạng thái" (Tốt, Hỏng, ...).
- [ ] **Thống kê tóm tắt:** Phía trên bảng hiển thị cụm số liệu: "Tổng số lượng: X", "Số lượng đang hỏng: Y".
- [ ] **Tìm kiếm Text nhanh:** Ô tìm kiếm để gõ chữ lọc ngay trong bảng (như Tabler template đang có).
- [ ] **Xuất Excel/CSV:** Nút tải danh sách thống kê thiết bị về máy để làm báo cáo.

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung Bình 🟡
- **Thách thức kỹ thuật:** Dữ liệu có thể lớn (nhiều trạm * nhiều thiết bị), cần lưu ý tối ưu query hiển thị. Backend Query dùng SQLAlchemy tương đối đơn giản: `DataSiteAsset.query.filter_by(asset_type='MAY_LANH').all()`.
- **UI/UX:** Cần tính toán nơi đặt nút bấm tra cứu này trên giao diện `vhkt_dashboard.html` để không làm rối phần tìm kiếm 1 trạm hiện có.

## 6. BƯỚC TIẾP THEO
→ Khi nào anh muốn code, chỉ cần chạy lệnh `/plan` trỏ vào tài liệu này, em sẽ phân tách thành Task Frontend/Backend cụ thể!
