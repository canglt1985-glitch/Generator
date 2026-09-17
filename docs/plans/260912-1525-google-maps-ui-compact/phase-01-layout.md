# Phase 01: Layout Restructuring & Map-First Canvas

Status: ⬜ Pending  
Dependencies: None

## Objective
Chuyển đổi toàn bộ layout của `NetworkMap.jsx` từ cấu trúc 2 cột `grid-cols-3` sang cấu trúc bản đồ tràn viền (Map-First) 100% không gian hiển thị, loại bỏ thanh cuộn thừa và chuẩn bị hệ thống layer z-index cho các thành phần nổi (floating components).

## Requirements
### Functional
- [ ] Bản đồ Leaflet mở rộng 100% chiều rộng và chiếm trọn vẹn chiều cao viewport khả dụng (`h-[calc(100vh-140px)]` ở chế độ thường, `100vh` khi fullscreen).
- [ ] Giữ nguyên các chức năng cốt lõi của Leaflet: zoom, pan, click khảo sát, tile layers (Google Satellite, OpenStreetMap).
- [ ] Xóa bỏ khối cột trái chiếm 33% màn hình cũ.

### Non-Functional
- [ ] Hiệu ứng chuyển động mượt mà giữa các chế độ.
- [ ] Tương thích hoàn hảo với Leaflet `map.invalidateSize()`.

## Implementation Steps
1. Tái cấu trúc JSX trong `NetworkMap.jsx`: Bỏ `div.grid.grid-cols-1.lg:grid-cols-3`.
2. Đặt `MapContainer` làm khung nền chính (Relative container với full width/height).
3. Thiết lập các vùng overlay (Top-Left, Top-Center, Right-FABs, Bottom-Sheet) với `pointer-events-none` cho container và `pointer-events-auto` cho các thẻ con.

## Files to Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Bản đồ hiển thị tràn viền, không bị lệch hoặc xám khi tải trang.
- [ ] Click trên bản đồ vẫn chấm điểm khảo sát bình thường.
