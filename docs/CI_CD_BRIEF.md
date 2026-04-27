# 💡 BRIEF: Tự Động Hóa Deploy (CI/CD) với GitHub Actions

**Ngày tạo:** 24/04/2026 (theo giờ hệ thống)
**Brainstorm cùng:** Anh Quân / VHKT Team

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại việc copy/push code lên máy chủ và khởi động lại app đang làm thủ công, tốn thời gian và dễ xảy ra sai sót.
- Cần một luồng chuẩn để bất kỳ ai push code cũng tự động cập nhật lên máy chủ.

## 2. GIẢI PHÁP ĐỀ XUẤT (WORKFLOW)
Xây dựng một đường ống (pipeline) tự động sử dụng GitHub Actions:
1. **Local:** Code trên máy cá nhân -> Chạy Test thủ công -> Push lên GitHub repository.
2. **GitHub Actions:** Lắng nghe sự kiện Push trên nhánh chính (VD: `main`).
3. **CI (Test):** GitHub Actions tự động kiểm tra code (nếu có script test).
4. **CD (Deploy kết nối SSH):** GitHub Actions dùng khoá SSH (được bảo mật trong GitHub Secrets) đăng nhập vào Server.
5. **Cập nhật:** Server tự động kéo (`git pull`) phiên bản code mới nhất về.
6. **Khởi động lại:** Khởi động lại ứng dụng qua thiết lập có sẵn (Sử dụng `PM2` hoặc `Docker Compose`).

## 3. TÍNH NĂNG (CÁC BƯỚC CẦN SÉT UP)

### 🚀 MVP (Bắt buộc phải cài đặt ngay):
- [ ] Tạo file `.github/workflows/deploy.yml` chứa luồng logic.
- [ ] Thiết lập bảo mật GitHub Secrets: Lưu trữ an toàn các thông tin `SERVER_IP`, `SSH_USER`, `SSH_PRIVATE_KEY`.
- [ ] Viết đoạn script tự động trên Server (Vào đúng thư mục dự án -> `git pull` -> `pm2 restart app` hoặc `docker compose up -d`).
- [ ] Viết một file Hướng dẫn (`DEPLOY_GUIDE.md`) cho anh em trong tổ biết quy trình.

### 🎁 Phase 2 (Nâng cấp sau):
- [ ] Thông báo qua Telegram/Zalo khi Deploy thành công hoặc thất bại.
- [ ] Tự động chạy Unit Test trước khi cho phép Deploy (nếu lỗi -> huỷ nhánh đó, không cho đẩy lên Server).

## 4. ƯỚC TÍNH SƠ BỘ VÀ RỦI RO
- **Độ phức tạp:** 🟡 TRUNG BÌNH (Mất khoảng vài giờ để setup mượt mà).
- **Rủi ro rớt mạng/Downtime:** Khi `git pull` và restart app có thể mất vài giây gián đoạn. 
- **Lưu ý bảo mật:** SSH Private Key phải được tạo riêng (chỉ cấp quyền cho thư mục sinh ra dự án) để tránh bot tấn công Server.

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để bắt đầu cấu hình file `.yml` và viết Hướng dẫn cụ thể!
