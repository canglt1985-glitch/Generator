# Phase 03: Viber API Integration
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Kết nối và gửi tin nhắn tự động ra kênh Viber thông qua REST API.

## Requirements
### Functional
- [ ] Gọi HTTP POST request tới API của Viber.
- [ ] Đính kèm Token `567370461ff5bfce-6527e240db117ad7-ce130e1ad6041265` vào tham số Authorization/Header.
- [ ] Quản lý chống đứt kết nối (Try/Catch) nếu API Viber bị sập.

## Implementation Steps
1. [ ] Viết hàm `send_to_viber(message_text)`.
2. [ ] Nối hàm này vào sau quá trình sinh nội dung ở Phase 02.
3. [ ] Ghi Log (Log file) thành công hay thất bại.
