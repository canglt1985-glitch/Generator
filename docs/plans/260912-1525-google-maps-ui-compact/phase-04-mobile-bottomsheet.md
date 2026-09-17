# Phase 04: Mobile Interactive Bottom Sheet

Status: ⬜ Pending  
Dependencies: Phase 01, Phase 02

## Objective
Xây dựng tấm kéo trượt ở đáy màn hình (Interactive Bottom Sheet) chuẩn Google Maps trên điện thoại di động, hỗ trợ 3 nấc chiều cao (Thu gọn / Nửa màn hình / Toàn màn hình) với thanh kéo pill `—`.

## Requirements
### Functional
- [ ] Vị trí: Cố định mép đáy màn hình trên thiết bị di động (`lg:hidden fixed bottom-0 left-0 right-0 z-[1000]`).
- [ ] Thiết kế bo tròn viền trên (`rounded-t-3xl bg-slate-900/95 backdrop-blur-md border-t border-slate-700/80 shadow-2xl`).
- [ ] Thanh gạt pill `—` ở đỉnh sheet, hỗ trợ bấm hoặc kéo để chuyển nấc.
- [ ] **3 nấc trạng thái (Bottom Sheet States):**
  - **Peek (Thu gọn ~65px):** 
    - Chưa chọn điểm: *"📍 Chạm bản đồ để quét trạm & kéo cáp"*.
    - Đã chọn điểm: Hiện tọa độ tóm tắt + số trạm lân cận + khoảng cách trạm gần nhất.
  - **Half (Nửa màn hình ~45vh):** Hiện bộ chọn bán kính (1km-10km), danh sách 4 trạm gần nhất kèm nút `🔌 Kéo cáp`.
  - **Full (Mở rộng ~85vh):** Hiện toàn bộ bảng chi tiết, ô tìm trạm đích khác, thông tin người QLT, link chỉ đường Google Maps.

## Implementation Steps
1. Khởi tạo state `bottomSheetState` ('collapsed' | 'half' | 'full').
2. Bắt sự kiện click hoặc kéo trượt trên thanh pull-handle.
3. Render giao diện tương ứng theo từng nấc chiều cao với transition `transition-all duration-300 ease-out`.

## Files to Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Trên mobile, bản đồ không bị che lấp khi ở trạng thái Peek.
- [ ] Chạm vào pull-handle hoặc nút mở rộng, sheet trượt lên êm ái.
- [ ] Chọn trạm kéo cáp ngay trong sheet thành công.
