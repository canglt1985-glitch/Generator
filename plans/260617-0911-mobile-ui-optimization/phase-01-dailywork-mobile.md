# Phase 01: Optimize DailyWork Page Mobile UI
Status: ⬜ Pending
Dependencies: None

## Objective
Tối ưu hóa giao diện di động cho trang Công việc hàng ngày (DailyWork.jsx) bao gồm Tab Nhật ký và Tab Lịch cúp điện.

## Requirements
### Functional
- [ ] Ẩn bảng hiển thị nhật ký trên màn hình nhỏ và thay thế bằng dạng Grid Card hiển thị thông tin trạm, ngày ghi nhận, nhân viên, nội dung và các nút thao tác Sửa/Xóa.
- [ ] Ẩn bảng lịch cúp điện trên màn hình nhỏ và thay thế bằng Grid Card hiển thị ngày cúp điện, thời gian cúp điện (giờ bắt đầu/giờ kết thúc), khu vực và lý do cúp điện.
- [ ] Bảo toàn đầy đủ tất cả chức năng xem chi tiết trạm (ExternalLink detail lookup) và thao tác sửa/xóa tương ứng trên các card.

### Non-Functional
- [ ] Tailwind CSS responsive clean-up, đảm bảo tính thẩm mỹ, mượt mà và padding hợp lý trên thiết bị di động.

## Implementation Steps
1. [ ] Cập nhật phần render Tab Nhật ký (`daily`) trong `DailyWork.jsx`: ẩn table trên mobile và thêm Grid Cards.
2. [ ] Cập nhật phần render Tab Lịch cúp điện (`power`) trong `DailyWork.jsx`: ẩn table trên mobile và thêm Grid Cards.
3. [ ] Chạy thử nghiệm trên công cụ DevTools của trình duyệt ở chế độ mobile để xác minh giao diện.

## Files to Create/Modify
- [MODIFY] [DailyWork.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/DailyWork.jsx)

## Test Criteria
- [ ] Ứng dụng React build/chạy thành công không lỗi syntax.
- [ ] Trên giao diện mobile (màn hình nhỏ hơn 1024px), tab Nhật ký và Lịch cúp điện chuyển sang dạng card trực quan và không bị lỗi tràn ngang.
