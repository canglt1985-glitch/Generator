# Báo Cáo Kiểm Toán Bảo Mật (Security Audit) - TVT3 V2

## 1. Mục tiêu
Xác định và khắc phục các lỗ hổng bảo mật liên quan đến phân quyền, xác thực người dùng và rò rỉ dữ liệu trong quá trình nâng cấp từ V1 sang V2.

## 2. Các thay đổi và nâng cấp Bảo Mật

### 2.1. Chuyển đổi mô hình Xác Thực
- **V1 (Cũ):** Dùng Flask-Login với Session Cookie lưu trực tiếp, tiềm ẩn nguy cơ CSRF và không an toàn khi ứng dụng ngày càng mở rộng.
- **V2 (Mới):** Sử dụng Supabase Auth (JWT - JSON Web Tokens) với chính sách bảo mật chặt chẽ cho API requests.

### 2.2. Row Level Security (RLS) trên Supabase
- Tất cả các bảng quan trọng (`datasites`, `generator_logs`, `daily_work`, `contracts`) đã được kích hoạt **RLS (Row Level Security)** trên Supabase.
- **Chính sách áp dụng:**
  - `anon` (Khách): Không được phép thay đổi hay đọc thông tin nhạy cảm.
  - `authenticated` (Người dùng đã đăng nhập): Có quyền SELECT (đọc), INSERT (thêm), UPDATE (sửa) trên dữ liệu theo vai trò (Role-based Access Control).
- Xóa bỏ tình trạng vô tình ghi đè dữ liệu do thiếu kiểm soát ở Backend.

### 2.3. Quản lý Biến Môi Trường (Secrets Management)
- Các cấu hình như `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, mật khẩu tài khoản SmartW, token của Telegram/Viber Bot đều đã được chuyển vào tệp `.env`.
- Mã nguồn React tĩnh (đẩy lên Vercel) chỉ chứa `ANON_KEY`, an toàn để lộ ở frontend (vì đã có RLS bảo vệ).
- Các keys backend (`SERVICE_ROLE_KEY`) chỉ tồn tại trong các máy chủ Worker Python nội bộ và tuyệt đối không bao gồm trong mã nguồn React.

## 3. Khuyến nghị Bổ Sung
- Cấu hình thêm tính năng tự động khóa IP nếu dò mật khẩu đăng nhập SmartW hoặc Supabase quá nhiều lần.
- Đảm bảo quyền truy cập file `.env` trên production folder (Ví dụ trên máy chủ chạy Worker) được thiết lập CHMOD 600.
- Thực hiện xoay khóa bí mật (Secret Rotation) định kỳ mỗi 6 tháng cho Bot Telegram và Viber SSO.

## 4. Kết luận
Hệ thống V2 có độ bảo mật cao hơn đáng kể so với V1. Việc loại bỏ hoàn toàn cơ sở dữ liệu SQLite cục bộ và tận dụng hệ sinh thái bảo mật của Supabase Auth & RLS giảm thiểu nguy cơ tấn công SQL Injection và truy cập trái phép.
