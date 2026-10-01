# Phase 05: Testing & Verification
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02, Phase 03, Phase 04

## Objective
Kiểm thử toàn diện các tính năng đã nâng cấp trên trình duyệt thực tế cả giao diện Desktop và Mobile.

## Requirements
- [ ] Build dự án thành công không có cảnh báo hay lỗi cú pháp (`npm run build`).
- [ ] Chạy subagent kiểm thử giao diện Desktop:
  - Kiểm tra nhãn tên trạm (chữ trắng, không hộp viền đen).
  - Kiểm tra thao tác Double Click lấy tọa độ (click 1 lần không ghim tọa độ).
  - Mở popup trạm `DNDQ37`: kiểm tra nhãn `3G/4G`, không có cột 5G, không có chữ `null°`.
  - Mở popup trạm `DNDQ31`: kiểm tra nhãn `SRAN/5G`, danh sách cell hiển thị theo góc hướng với các badge công nghệ đẹp mắt.
- [ ] Chạy subagent kiểm thử giao diện Mobile:
  - Mở Drawer / Bottom Sheet chi tiết trạm trên màn hình di động.
  - Vuốt đóng, thao tác nút gọi QLT, dẫn đường, copy tọa độ.

## Files to Create/Modify
- Không (chạy test và chụp ảnh kết quả).

## Test Criteria
- [ ] Tất cả các tiêu chí kiểm thử đạt 100%.
