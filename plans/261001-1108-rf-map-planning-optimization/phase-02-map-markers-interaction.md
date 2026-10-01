# Phase 02: Map Markers & Interaction
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tối ưu hóa thẩm mỹ marker trạm trên bản đồ: nhãn chữ trắng không viền đen/hộp đen và đổi cơ chế lấy tọa độ sang 2-click (Double Click).

## Requirements
### Functional
- [ ] Nhãn tên trạm: Bỏ hoàn toàn background `rgba(15, 23, 42, 0.88)` và viền xám đen. Sử dụng chữ trắng với `text-shadow: 0 1px 2px #000, 0 0 2px #000, 1px 1px 2px #000`, giúp chữ luôn sắc nét và nhìn thấy rõ trên mọi nền ảnh vệ tinh lẫn bản đồ đường phố.
- [ ] Đổi chế độ lấy tọa độ khảo sát từ 1-click thành 2-click (`dblclick`):
  - Click chuột 1 lần thông thường: Chỉ dùng để tương tác bản đồ, kéo thả, chọn trạm.
  - Nhấp đúp chuột (Double Click): Ghim tọa độ khách hàng và kích hoạt quét trạm lân cận + kéo cáp.
  - Vô hiệu hóa `doubleClickZoom` khi double-click lấy tọa độ để bản đồ không bị zoom giật đột ngột.

## Implementation Steps
1. [ ] Cập nhật `createSiteDivIcon` trong `NetworkMap.jsx`:
   - Style nhãn: `color: #ffffff; text-shadow: 0 1px 2px #000, 0 0 2px #000, 1px 1px 2px #000; background: transparent; border: none; font-weight: 700;`.
2. [ ] Sửa `MapClickListener` trong `NetworkMap.jsx`:
   - Lắng nghe sự kiện `dblclick` trên Leaflet Map instance thay vì `click`.
   - Ngăn chặn zoom mặc định của dblclick khi người dùng nhấp đúp chọn điểm.

## Files to Create/Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Nhãn tên trạm (VD: `DNDQ31`, `DNDQ37`) hiển thị chữ trắng sắc sảo, không có hộp đen bao quanh.
- [ ] Click chuột 1 lần trên bản đồ không ghim vị trí.
- [ ] Nhấp đúp chuột 2 lần ghim chính xác vị trí khảo sát và hiển thị khoảng cách kéo cáp.
