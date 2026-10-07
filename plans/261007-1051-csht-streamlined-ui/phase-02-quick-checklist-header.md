# Phase 02: Quick Checklist Hồ sơ Trình ký trên Header Modal
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thêm khối Checklist thông minh ngay tại Header của Modal Chi Tiết để người dùng liếc mắt 1 giây là biết ngay trạm này đã đủ điều kiện trình ký hay còn thiếu giấy tờ/thông tin nào.

## Requirements
### Functional
- [ ] Tính toán 5 tiêu chí bắt buộc để trình ký hợp đồng CSHT:
  1. `Tọa độ KS`: Có vĩ độ/kinh độ khảo sát thực tế.
  2. `BB Ghi nhớ`: Có biên bản làm việc/ghi nhớ (file upload hoặc ghi nhận đồng ý).
  3. `Chủ đất`: Có họ tên chủ nhà/chủ đất.
  4. `CCCD & SĐT`: Có đủ số CMND/CCCD và số điện thoại liên hệ.
  5. `Giá thuê hợp lệ`: Có giá đề xuất $> 0$ và không vượt khung trần quy định.
- [ ] Hiển thị thanh Quick Checklist dạng pill badge trực quan:
  - Nếu đủ: Icon tích xanh `✓ Tọa độ KS`, `✓ Chủ đất`, `✓ CCCD & SĐT`, ...
  - Nếu thiếu: Badge đỏ/cam nổi bật `! Thiếu CCCD`, `! Chưa có SĐT`, `! Chưa có Tọa độ KS`.
- [ ] Hiển thị Status Badge lớn ở góc trên:
  - 🟢 `ĐỦ ĐIỀU KIỆN TRÌNH KÝ` (Đạt 5/5)
  - 🟡 `CẦN BỔ SUNG (X/5)` (Nếu thiếu từ 1-2 tiêu chí)
  - 🔴 `CHƯA KHẢO SÁT / VƯỚNG DÙNG CHUNG` (Nếu vướng cự ly < 400m hoặc chưa có tọa độ)

## Implementation Steps
1. Viết helper function `getContractReadiness(project)` trả về danh sách tiêu chí đạt/chưa đạt.
2. Render khối Checklist mini dưới dòng tiêu đề của modal `InfrastructureDevelopment.jsx`.
3. Tích hợp click vào từng pill checklist để tự động nhảy sang Tab tương ứng (VD: click `! Thiếu CCCD` tự động chuyển sang Tab 3).

## Files to Modify
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [ ] Trạm đã có đầy đủ thông tin (như 26DNa356) hiện badge xanh và 5/5 tick xanh.
- [ ] Trạm mới tạo chưa có CCCD hiển thị badge cảnh báo thiếu cụ thể.
