# Phase 06: Verification, Production Build & Deployment

Status: ⬜ Pending  
Dependencies: Phase 01 to Phase 05

## Objective
Kiểm thử toàn diện giao diện mới trên nhiều độ phân giải màn hình (Mobile Responsive & Desktop Widescreen), kiểm tra tương thích trình duyệt, build Vite production không lỗi, deploy Vercel và chụp ảnh nghiệm thu.

## Test Cases
### 1. Mobile Viewport (375px - 414px)
- [ ] Mở trang trên kích thước mobile: Bản đồ hiển thị tràn viền.
- [ ] Thanh tìm kiếm nổi đỉnh màn hình hoạt động tốt.
- [ ] Dải filter chips cuộn ngang mượt mà.
- [ ] Chạm vào bản đồ khảo sát: Bottom Sheet ở trạng thái Peek hiện tóm tắt.
- [ ] Vuốt/bấm mở Bottom Sheet lên Half và Full: Chọn kéo cáp, xem thông tin đầy đủ.

### 2. Desktop Viewport (1366px - 1920px)
- [ ] Bản đồ chiếm 100% không gian, không bị méo.
- [ ] Thanh tìm kiếm nổi góc trên trái + dải chip ngang hoạt động chuẩn.
- [ ] Thẻ trượt trái trượt ra khi có kết quả khảo sát và bấm `‹` thu gọn vào mép trái trơn tru.
- [ ] Tuyến kéo cáp hiển thị màu tím dạ quang nổi bật trên nền vệ tinh.
- [ ] Bấm nút FAB GPS, Layer, Fullscreen hoạt động hoàn hảo.

### 3. Build & Deploy
- [ ] `npm run build` thành công với 0 lỗi linter và compiler.
- [ ] `git commit` & `git push`.
- [ ] Deploy Vercel Production và kiểm tra trực tiếp qua browser subagent.
