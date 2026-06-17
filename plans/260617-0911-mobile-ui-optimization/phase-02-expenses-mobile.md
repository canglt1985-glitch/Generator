# Phase 02: Optimize Expenses Page Mobile UI
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tối ưu hóa giao diện di động cho trang Quản lý Chi phí (Expenses.jsx) bao gồm Tab Nhiên liệu và Tab Chi phí khác.

## Requirements
### Functional
- [ ] Ẩn bảng lịch sử giao dịch nhiên liệu trên màn hình nhỏ và thay thế bằng dạng Grid Card hiển thị ngày, loại giao dịch (badge màu sắc), loại nhiên liệu, mã trạm, số lượng, đơn giá, thành tiền và mức dầu tồn sau giao dịch.
- [ ] Ẩn bảng chi phí khác trên màn hình nhỏ và thay thế bằng dạng Grid Card hiển thị ngày, nội dung chi, dự án, số tiền, người chi và ghi chú.
- [ ] Bảo toàn đầy đủ tất cả các nút thao tác xóa giao dịch trên các card di động.

### Non-Functional
- [ ] Tailwind CSS responsive clean-up, đảm bảo tính thẩm mỹ, mượt mà và padding hợp lý trên thiết bị di động.

## Implementation Steps
1. [ ] Cập nhật phần render Tab Nhiên liệu (`fuel`) trong `Expenses.jsx`: ẩn table trên mobile và thêm Grid Cards.
2. [ ] Cập nhật phần render Tab Chi phí khác (`other`) trong `Expenses.jsx`: ẩn table trên mobile và thêm Grid Cards.
3. [ ] Chạy thử nghiệm trên công cụ DevTools của trình duyệt ở chế độ mobile để xác minh giao diện.

## Files to Create/Modify
- [MODIFY] [Expenses.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Expenses.jsx)

## Test Criteria
- [ ] Ứng dụng React build/chạy thành công không lỗi syntax.
- [ ] Trên giao diện mobile (màn hình nhỏ hơn 1024px), tab Nhiên liệu và Chi phí khác chuyển sang dạng card trực quan và không bị lỗi tràn ngang.
