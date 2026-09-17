# Phase 05: Floating Action Buttons (FABs) & Cable Route Banner

Status: ⬜ Pending  
Dependencies: Phase 01

## Objective
Xây dựng cụm nút điều khiển nổi (Floating Action Buttons) chuẩn Google Maps ở góc phải và banner thông số tuyến cáp nổi ở cạnh dưới.

## Requirements
### Functional
- [ ] **Bộ nút FABs góc phải (`absolute right-4 bottom-24 lg:bottom-8 z-[1000] flex flex-col gap-2`):**
  - **Nút Định vị GPS (My Location FAB):** Nút tròn trắng/tối với icon la bàn/mục tiêu 🎯. Bấm vào chuyển bật/tắt `useGPS` và canh giữa bản đồ vào vị trí người dùng.
  - **Nút Chuyển Lớp Bản Đồ (Layers FAB):** Nút vuông bo tròn với icon layer stack ⛶. Bấm vào xổ popup chọn nhanh nền Vệ tinh hoặc Đường phố.
  - **Nút Toàn Màn Hình (Fullscreen FAB):** Nút vuông bo tròn với icon `Maximize2` / `Minimize2`.
- [ ] **Floating Cable Route Banner:**
  - Vị trí: Treo nổi giữa đáy màn hình (`bottom-6 left-1/2 -translate-x-1/2 z-[1000]`).
  - Hiển thị: `🔌 Tuyến kéo đến [Mã trạm]: Tuyến đường [X] km | Cáp (+5%): [Y] km  [✕ Ẩn]`.
  - Giúp người dùng theo dõi tức thì kết quả đo mà không cần mở bảng to.

## Implementation Steps
1. Thay thế LayersControl mặc định của Leaflet hoặc bọc nó vào nút FAB hiện đại.
2. Thiết kế các nút FAB tròn/vuông bo góc mềm mại với hiệu ứng hover và active scale.
3. Tạo Floating Banner hiển thị khi `cableRoute !== null`.

## Files to Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Bấm nút GPS kích hoạt định vị thực địa.
- [ ] Khi kéo cáp (VD: DNLK51 -> DNLK24), banner nổi dưới đáy bản đồ hiện chính xác khoảng cách 3.86 km / 4.05 km.
