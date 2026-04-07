# Phase 03: Progressive Web App (PWA) Setup
Status: ✅ Complete

## Objective
Nâng cấp giao diện Mobile thành một PWA (App dạng cài đặt như Native - Shortcut màn hình chính full screen, không thanh công cụ trình duyệt mạng). Giúp hệ sinh thái Smartphone của người dùng trực quan, nhanh hơn.

## Requirements
- Browser hỗ trợ Manifest json, service workers caching cốt lõi. Giao thức hỗ trợ (HTTPS - Cloudflare sẽ gánh phần giao thức từ xa, hoặc local).
- Có icon logo định dạng 192x192 và 512x512 thiết lập.

## Implementation Steps
1. [ ] Cấu hình Web App Manifest `manifest.json`.
   - Name, short_name, icons, display (standalone), background_color, theme_color, start_url (VD: `/`).
2. [ ] (Tuỳ chọn) Đăng ký một Service Worker cơ bản `sw.js` vào file Script chung. (PWA yêu cầu service worker để có thể Cache Offline cũng như nhận diện App chính thức).
   - Tạm thời service worker dạng "network-first" hoặc rỗng "No-op" để đáp ứng tiêu chí.
3. [ ] Import khai báo vào thẻ `<head>` của `base.html` template layout dùng chung.
   - Thêm `<link rel="manifest" href="{{ url_for('static', filename='manifest.json') }}">`
   - Thêm Meta Tag for Apple (iOS Shortcut) như  `apple-mobile-web-app-capable`.

## Logic Backend Integration
- Thêm route để serve `manifest.json` (nếu đặt ở `static`, chỉ cần đảm bảo route trỏ đúng vào static là HTML sẽ gọi được file).

## Files to Modify
- Templates chính: Component layout `<head>` (Thường nằm ở file UI `layout.html` hoặc `base.html`).
- Directory: `static/manifest.json`.
- Directory: `static/sw.js` cho worker.

## Test Criteria
- [ ] Truy cập từ điện thoại qua Cloudflare.
- [ ] Thấy gợi ý "Add to Home Screen" ở Menu Browser.
- [ ] Khi click từ Home Screen icon, giao diện chạy Single Window/Standalone.

---
Next Phase: `phase-04-testing.md`
