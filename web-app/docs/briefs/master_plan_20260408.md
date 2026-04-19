# 💡 BRIEF: TÁI CẤU TRÚC HỆ THỐNG ADMIN & EXPORT (2026-04-08)

**Trạng thái hiện tại**: Dự án đã được Rollback về commit `5ab1c06` (Hôm qua). Mọi lỗi của ngày hôm nay đã được xóa sạch trên Code để bắt đầu `/audit` và `/refactor` từng bước.

---

## 🔍 CÁC ĐIỂM CẦN KHẮC PHỤC (THEO DÕI TỪ HÔM NAY):

### 1. Pháo đài Admin (Sidebar & Dropdown)
- **Triệu chứng**: Chết luồng JavaScript khiến menu không mở được.
- **Nguyên nhân chính**: Xung đột logic CSRF trong `layout.html` chọc vào `window.fetch`.
- **Hướng giải quyết**: Thực hiện Audit bảo mật toàn diện cho CSRF. Chia tách logic nạp thư viện Bootstrap.

### 2. Hệ thống Xuất Excel (Export PWA-Safe)
- **Vấn đề**: File không có đuôi công cụ, bị GUID hóa trên Mobile, bị chặn bởi CSRF.
- **Giải pháp đã kiểm chứng**: 
    - Miễn trừ CSRF cho Route export.
    - Ép định dạng `.xlsx` trong `send_file`.
    - Phục hồi lại cơ chế `a.click()` ổn định (thay vì Fetch/Blob gây lỗi).
- **Thư viện**: Dùng `openpyxl` (hoặc `xlsxwriter` nếu cần định dạng đẹp).

### 3. Giao diện & Footer
- **Vấn đề**: Footer nhảy loạn xạ, đè bảng.
- **Nguyên nhân**: CSS "độc hại" (`z-index: 9999`) và thiếu wrapper HTML.
- **Giải pháp**: Refactor lại cấu trúc `layout.html` và `style.css` theo chuẩn Flexbox.

---

## 🛠 LỘ TRÌNH TIẾP THEO:
1. **Bước 1**: `/audit` file `app.py` và `extensions.py` để xử lý CSRF & Session.
2. **Bước 2**: `/refactor` file `layout.html` và `style.css` để ổn định giao diện.
3. **Bước 3**: `/code` lại từng hàm Export trong `datasite_routes.py`.
