# Phase 04: Map Performance & Canvas
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02, Phase 03

## Objective
Tối ưu hóa hiệu năng render bản đồ ở mức tối đa: sử dụng HTML5 Canvas Renderer (`preferCanvas: true`), Viewport Bounding Box Culling cho cánh sóng sector, và lưu cache đối tượng Leaflet Icon.

## Requirements
### Functional & Performance
- [ ] Bật `preferCanvas: true` trên `MapContainer` của Leaflet:
  - Thay vì tạo hàng ngàn phần tử `<path>` và `<svg>` trong cây DOM HTML, Leaflet sẽ vẽ toàn bộ Polygon và Polyline trên một thẻ `<canvas>` duy nhất.
  - Giảm sử dụng bộ nhớ trình duyệt >70%, ngăn ngừa tình trạng đơ/lag khi kéo bản đồ trên điện thoại và laptop.
- [ ] Tối ưu hóa Viewport Culling cho Sector Wedges:
  - Chỉ vẽ các cánh sóng hình vành khuyên của các trạm nằm trong khung hình nhìn thấy hiện tại (`map.getBounds()`).
- [ ] Lưu cache `L.divIcon`:
  - Tránh tạo mới hàng trăm đối tượng Icon mỗi khi zoom hoặc pan bản đồ.

## Implementation Steps
1. [ ] Cập nhật `<MapContainer preferCanvas={true} ...>` trong `NetworkMap.jsx`.
2. [ ] Thêm bounds filter trong rendering loop của `CellSectorWedges`.
3. [ ] Đo lường thời gian render và FPS khi pan/zoom.

## Files to Create/Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`
- `tvt3_v2/src/components/map/CellSectorWedges.jsx`

## Test Criteria
- [ ] Bản đồ zoom in/out mượt mà đạt ~60fps.
- [ ] Kéo thả bản đồ không có độ trễ giật lag.
