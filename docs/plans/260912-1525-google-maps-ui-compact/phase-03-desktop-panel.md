# Phase 03: Desktop Collapsible Side Panel

Status: ⬜ Pending  
Dependencies: Phase 01, Phase 02

## Objective
Xây dựng thẻ nổi trượt cạnh trái (Floating Collapsible Side Drawer) trên Desktop, cho phép hiển thị kết quả khảo sát, danh sách trạm lân cận và thao tác kéo cáp mà vẫn có thể thu gọn chỉ bằng 1 nút bấm để người dùng xem trọn vẹn bản đồ.

## Requirements
### Functional
- [ ] Vị trí: Treo nổi dưới thanh tìm kiếm (`top-20 left-4 z-[1000] w-96 max-h-[calc(100vh-160px)]`).
- [ ] Nút Toggle thu gọn/mở rộng dạng tab kẹp mép trái (`‹` Thu gọn / `›` Mở ra).
- [ ] Nội dung khi có điểm khảo sát:
  - Tọa độ điểm khảo sát + Nút Copy Google Maps format.
  - Bộ chọn bán kính quét nhanh (1km, 2km, 3km, 5km, 10km).
  - Ô tìm kiếm trạm đích bất kỳ (nhập `DNLK24` -> hiện khoảng cách -> nút kéo cáp).
  - Danh sách trạm lân cận sắp xếp theo khoảng cách.
  - Nút `🔌 Kéo cáp` cho từng trạm.

## Implementation Steps
1. Khởi tạo state `isSidebarOpen` (mặc định mở khi có kết quả khảo sát, có thể đóng bằng nút bấm).
2. Tích hợp `renderNearestSitesTable` vào thẻ nổi kính mờ bo tròn `rounded-2xl backdrop-blur-md shadow-2xl`.
3. Thêm nút chevron thu gọn/mở rộng ở cạnh phải của thẻ nổi.

## Files to Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Chấm điểm khảo sát -> Thẻ trượt mở hiển thị trạm lân cận.
- [ ] Bấm `‹` -> Thẻ giấu sang lề trái mượt mà, bấm `›` -> Thẻ trượt ra lại.
