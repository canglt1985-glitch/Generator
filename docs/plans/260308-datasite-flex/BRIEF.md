# 💡 BRIEF: Nâng cấp DataSite Scraper (Đồng bộ linh hoạt & Quản lý Mật khẩu)

**Ngày tạo:** 08/03/2026
**Brainstorm cùng:** Admin

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
1. Máy chủ DataSite phản hồi quá chậm (thường xuyên bị timeout) khi yêu cầu "Xuất Toàn Bộ Dữ Liệu" hoặc xuất một file Excel khổng lồ chứa tất cả các loại tài sản. Quá trình đồng bộ dễ bị gãy gánh giữa chừng.
2. Mật khẩu tài khoản DataSite (`cang.letan`) hiện tại đang bị hardcode trong mã nguồn, người dùng không thể chủ động thay đổi khi DataSite yêu cầu đổi mật khẩu định kỳ giống như SmartW.

## 2. GIẢI PHÁP ĐỀ XUẤT
1. **Chia nhỏ gói đồng bộ (Granular Sync):** Liệt kê các hạng mục tài sản cụ thể trên giao diện Web (Hạ tầng, Máy phát điện, Điều hoà, Ắc quy, Tủ Nguồn, BTS 3G/4G/5G). Cho phép người dùng tick chọn thủ công mục nào cần đồng bộ hôm nay, hoặc lập lịch tự động mỗi ngày chỉ lấy 1-2 danh mục nhỏ để tránh quá tải.
2. **Tab Quản lý Mật khẩu DataSite:** Bổ sung giao diện trong phần Cài đặt / Đồng bộ để người dùng tự nhập và cập nhật Username/Password của DataSite. Lưu mật khẩu mã hoá an toàn tương tự như module SmartW hiện tại.

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Người dùng chính:** Quan trị viên (Admin) quản lý hệ thống VHKT.

## 4. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Giai đoạn 1 - Bắt buộc có):
- [ ] Giao diện (UI): Thêm Form "Cấu hình DataSite" cho phép người dùng nhập/đổi Password. Đọc/Ghi vào cài đặt hệ thống.
- [ ] Giao diện (UI): Cập nhật Card "Đồng bộ DataSite" trong tab DataSite thành một danh sách (Checklist) các hạng mục có thể quét.
     - 1. Thông tin chung Trạm
     - 2. Tài sản: Cơ sở hạ tầng (Cột, Nhà trạm)
     - 3. Phụ trợ: Máy phát điện, Máy lạnh, Ắc quy, Tủ Nguồn
     - 4. Viễn thông: Tủ BTS 3G, 4G, 5G
- [ ] Backend (API): Endpoint `/api/datasite/sync_real` tiếp nhận danh sách các hạng mục (mảng) do Client gửi lên.
- [ ] Code Playwright: Sửa lại Scraper để có khả năng bắt đầu và chỉ thực thi hàm xuất Excel tương ứng với danh sách hạng mục yêu cầu, thay vì chạy nguyên một mạch cứng nhắc.

### 🎁 Phase 2 (Giai đoạn 2 - Hẹn giờ thông minh):
- [ ] Tuỳ biến Cronjob: Thay vì lịch cố định (2h sáng Chủ Nhật gom hết), cho phép chia lịch: Thứ 2 gom Hạ tầng, Thứ 3 gom Máy Phát, v.v. để luôn có dữ liệu mới nhẹ nhàng trong tuần.

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** TRUNG BÌNH (Modunlerize lại code Playwright và thêm vài bảng/cấu hình nhánh nhỏ).
- **Rủi ro:** Khi chia nhỏ thành nhiều bước, cần phải tái sử dụng Session (Cookies) một cách hiệu quả để Playwright không phải Login > Tải file A > Đóng > Login > Tải file B, mà Login một lần >> Tải A, B, C liên tiếp >> Đóng.

## 6. BƯỚC TIẾP THEO
→ Review bản Brief này, nếu Anh đồng ý thì chúng ta chạy `/plan` để lên thiết kế chi tiết Frontend và Backend!
