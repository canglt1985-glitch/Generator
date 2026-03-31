# 💡 BRIEF: Nâng cấp trải nghiệm di động & Cloudflared Background

**Ngày tạo:** 2026-03-31
**Tình trạng:** Hoàn tất Discovery (`/brainstorm`)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hiện tại `cloudflared` cần mở cửa sổ dòng lệnh (console) mới truy cập được từ xa, dễ bị tắt nhầm và không an toàn.
- Web-app khi thêm vào màn hình chính điện thoại (Shortcut) không lưu đăng nhập (session), gây phiền toái cho người dùng mỗi khi chuyển tab hoặc mở lại.

## 2. GIẢI PHÁP ĐỀ XUẤT
1.  **Hạ tầng:** Chuyển đổi `cloudflared` từ chạy dòng lệnh thủ công sang chạy ẩn như một Windows Service.
2.  **Ứng dụng:** Nâng cấp Web-app Flask hiện tại thành **PWA (Progressive Web App)** chuẩn.
3.  **Xác thực:** Điều chỉnh logic Flask Login để kéo dài thời gian sống của Session (Permanent Session).

## 3. TÍNH NĂNG CHÍNH

### 🚀 MVP (Triển khai ngay):
- [ ] Cài đặt `cloudflared service` trên máy chủ Windows.
- [ ] Tạo file `manifest.json` định nghĩa App Name, Icon, và Display Mode (Standalone).
- [ ] Cấu hình Route Flask để phục vụ manifest và icon.
- [ ] Cài đặt `PERMANENT_SESSION_LIFETIME` trong Flask (ví dụ: 30 ngày).
- [ ] Script cài đặt Service Worker cơ bản để trình duyệt nhận diện PWA.

### 🎁 Phase 2 (Cải thiện):
- [ ] Thêm thông báo "Cài đặt ứng dụng" cho Android/iOS.
- [ ] Backup cấu hình Tunnel lên Cloudflare Dashboard.

## 4. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Trung bình (Cần can thiệp cấu hình server và code Flask).
- **Rủi ro:** Cần đảm bảo file Icon đúng định dạng để Android/iOS nhận diện được.

---

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để thiết kế chi tiết danh sách task và cài đặt cụ thể.
