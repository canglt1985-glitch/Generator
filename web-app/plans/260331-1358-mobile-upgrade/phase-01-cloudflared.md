# Phase 01: Cloudflared Service Setup
Status: ⬜ Pending

## Objective
Cài đặt `cloudflared` hoạt động dưới dạng Windows Service để chạy ngầm thay vì mở bằng cửa sổ dòng lệnh (console).

## Implementation Steps
1. [ ] Xác minh thư mục cài đặt `cloudflared.exe`.
2. [ ] Xóa bỏ các session/quy trình đang chạy ngầm hoặc console đang mở của `cloudflared`.
3. [ ] Chạy lệnh `cloudflared service install [TOKEN_CỦA_DỰ_ÁN]`.
4. [ ] Khởi động service thông qua `services.msc` hoặc lệnh `Stop-Service`/`Start-Service`.
5. [ ] (Optional) Cấu hình Service để đảm bảo nó luôn Start khi Windows boot up.

## Test Criteria
- [ ] Truy cập URL qua Cloudflare thành công khi không có console nào được mở.
- [ ] Service `cloudflared` hiển thị trạng thái "Running" trong Services.

## Notes
- Cần quyền Administrator trên Windows Server.
- Nếu service bị lỗi khởi động, kiểm tra Log của System trong Event Viewer.

---
Next Phase: `phase-02-flask-session.md`
