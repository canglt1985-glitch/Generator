# Phase 01: Cloudflared Service Setup
Status: ✅ Complete

## Objective
Cài đặt `cloudflared` hoạt động dưới dạng Windows Service để chạy ngầm thay vì mở bằng cửa sổ dòng lệnh (console).

## Implementation Steps
1. [x] Xác minh thư mục cài đặt `cloudflared.exe`.
2. [x] Xóa bỏ các session/quy trình đang chạy ngầm hoặc console đang mở của `cloudflared`.
3. [x] Tạo script `scripts/install_cloudflared_service.ps1` hỗ trợ cài qua TOKEN hoặc config cục bộ, quét sạch config lỗi.
4. [x] Khởi động service thông qua script tự động.
5. [x] Cấu hình Service để đảm bảo nó luôn Start khi Windows boot up (Auto-Recovery qua sc.exe).

## Test Criteria
- [ ] Truy cập URL qua Cloudflare thành công khi không có console nào được mở.
- [ ] Service `cloudflared` hiển thị trạng thái "Running" trong Services.

## Notes
- Cần quyền Administrator trên Windows Server.
- Nếu service bị lỗi khởi động, kiểm tra Log của System trong Event Viewer.

---
Next Phase: `phase-02-flask-session.md`
