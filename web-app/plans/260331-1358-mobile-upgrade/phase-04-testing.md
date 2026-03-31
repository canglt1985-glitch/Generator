# Phase 04: Testing & Deployment Review
Status: ⬜ Pending

## Objective
Kiểm thử toàn diện các luồng tính năng Cloudflared Background, độ lưu Session, và khả năng cài đặt App Web từ Shortcut Home Screen. Đây là bước review toàn bộ thay đổi.

## Requirements
### Functional
- [ ] Dừng Cloudflared Window Console và kiểm tra Cloudflare Tunnel Background còn sống không.
- [ ] Đăng nhập Web và test Session còn tồn tại sau khi thoát trình duyệt và sau một khoảng thời gian dài.
- [ ] Thêm App vào Home Screen iOS và Android thành công.
- [ ] Sau khi Home Screen App mở lên: Kiểm tra giao diện Full Screen Modal không bị lỗi UI.

## Implementation Steps
1. [ ] Thực thi kiểm thử (thường làm chung với thiết bị ảo Local hoặc Smart Phone thực).
2. [ ] Review kết quả và sửa lỗi UI/Config nếu phát hiện ở Cloudflare Service (nếu có, ví dụ do Windows Firewall).
3. [ ] Hoàn thành dự án Deployment thay đổi và chốt kế hoạch.

## Test Criteria
- Cloudflare Service có thể tự bật khi Windows Reset (Reboot).
- Truy cập không lỗi 5xx timeout.
- Android không hiển thị thanh URL.
- iOS App load ổn định không crash.

## Notes
- Nếu PWA báo lỗi HTTPS thì nhớ kiểm tra Tunnel kết nối của Cloudflare Proxy đã setup chuẩn chưa vì Service Workers chỉ chạy được trên Localhost (môi trường dev) hoặc HTTPS.

---
End of Plan.
