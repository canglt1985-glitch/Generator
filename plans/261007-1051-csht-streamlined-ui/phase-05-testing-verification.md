# Phase 05: Kiểm thử, ESLint & Xác thực trên Trình duyệt
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03, 04

## Objective
Kiểm tra toàn diện tính ổn định của mã nguồn, kiểm tra lint không phát sinh lỗi, build bundle Vite thành công và dùng browser subagent xác thực trực quan trải nghiệm người dùng.

## Requirements
### Functional
- [ ] Chạy `npm run lint` đảm bảo 0 errors.
- [ ] Chạy `npm run build` đảm bảo bundle biên dịch thành công.
- [ ] Dùng `browser_subagent` điều khiển trình duyệt kiểm tra:
  - Xem thử modal chi tiết trạm với 3 tab mới.
  - Bấm chuyển qua lại giữa các tab: Quy hoạch, Kỹ thuật, Chủ đất.
  - Thử mở form Chỉnh sửa và kiểm tra các Smart Inputs.
  - Thử tải file Hợp đồng (.docx) và BB Ghi nhớ (.docx).
  - Thử mở dropdown Xuất báo cáo.

## Implementation Steps
1. Chạy lint & build commands.
2. Khởi chạy browser subagent để chụp ảnh thực tế các góc cạnh của giao diện mới.
3. Commit Git sạch và sẵn sàng deploy.

## Files to Test
- `tvt3_v2/src/pages/InfrastructureDevelopment.jsx`

## Test Criteria
- [ ] 0 ESLint errors.
- [ ] 0 Runtime errors trong DevTools Console.
- [ ] Ảnh chụp màn hình xác thực hiển thị đẹp mắt, trực quan và tiện dụng.
