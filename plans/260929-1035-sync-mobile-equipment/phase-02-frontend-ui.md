# Phase 02: Frontend UI - Quick Location Edit & Site ID Old
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Cập nhật hiển thị ngắn gọn Site ID cũ cho các trạm trên giao diện Web TVT3, đồng thời xây dựng Modal sửa nhanh vị trí thiết bị lưu động ngay trên bảng danh sách.

## Requirements
### Functional
- [x] Hàm `getSiteLabel` trong `Generator.jsx` ưu tiên hiển thị `site_id_old || site_id` thay vì hiển thị cả 2 kèm ngoặc đơn.
- [x] Thêm icon/nút `✏️` hoặc nút "Sửa vị trí" tại cột Vị trí hiện tại của từng dòng thiết bị và cột Thao Tác.
- [x] Modal sửa vị trí:
  - Chọn `Kho TVT3` hoặc tìm kiếm trạm BTS theo Site ID cũ (có autocomplete/search).
  - Nhập ghi chú điều chuyển.
  - Nút "Lưu vị trí" ➔ Cập nhật Supabase và thêm 1 log vào `equipment_transfers`.
  - Cập nhật state bảng danh sách ngay lập tức.

## Implementation Steps
1. [x] Sửa `tvt3_v2/src/pages/Generator.jsx`.
2. [x] Thêm state modal, form handlers và logic cập nhật.
3. [x] Test build frontend `npm run build` đảm bảo không có lỗi cú pháp.

## Files to Create/Modify
- `tvt3_v2/src/pages/Generator.jsx` - Giao diện Quản lý thiết bị & điều chuyển.
