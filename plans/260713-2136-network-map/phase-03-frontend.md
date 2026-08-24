# Phase 03: Network Map UI Development
Status: ✅ Complete
Dependencies: [Phase 02](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-02-database.md)

## Objective
Xây dựng giao diện trang bản đồ `NetworkMap.jsx` tích hợp đầy đủ tính năng tra cứu, lọc và tương tác.

## Requirements
### Functional
- [x] **Bản đồ Leaflet**: Hiển thị trạm hoạt động (marker xanh dương) và dự án CSHT (marker cam/vàng).
- [x] **Bật/Tắt Layer (Toggle)**: Cho phép ẩn/hiện trạm hoạt động, trạm quy hoạch, và vòng tròn vùng phủ sóng.
- [x] **Vòng tròn Vùng phủ (Radius Circles)**: Vẽ vòng tròn bán kính 500m (hoặc 300m) xung quanh mỗi trạm.
- [x] **Tìm kiếm trạm**: Ô search mã trạm, click vào trạm sẽ chuyển hướng bản đồ (FlyTo) và hiển thị thông tin trạm.
- [x] **Tương tác click**: Cho phép người dùng click chuột trực tiếp vào bất kỳ điểm nào trên bản đồ để làm vị trí khách hàng phản ánh, tự động quét tìm các trạm xung quanh và vẽ đường đứt nét nối khoảng cách.
- [x] **Logic khoảng cách động**: Tìm 1, 2, 3 hoặc 5 trạm phát sóng gần nhất theo logic khoảng cách động (nhỏ hơn 500m lấy 5 trạm, lớn hơn 2km lấy 1 trạm...).
- [x] **Quét bán kính (Radius Slider)**: Thanh trượt chọn bán kính quét (500m, 1km, 2km, 5km) xung quanh điểm khách hàng phản ánh.
- [x] **Bảng kết quả**: Hiển thị bảng chi tiết các trạm gần nhất dưới bản đồ.

### Non-Functional
- [x] Hiển thị mượt mà khi render >300 markers trạm trên bản đồ (sử dụng Marker thông thường hoặc CSS tối ưu).
- [x] Responsive hiển thị tốt trên cả màn hình máy tính và thiết bị di động.

## Implementation Steps
1. [x] Tạo file [NetworkMap.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/NetworkMap.jsx).
2. [x] Khắc phục lỗi hiển thị default marker icon của Leaflet trong môi trường build Vite.
3. [x] Viết hàm tính toán Haversine và logic khoảng cách động.
4. [x] Thiết kế Layout 2 cột (Panel thông tin bên trái, Bản đồ & Bảng chi tiết bên phải).

## Files Created/Modified
- `tvt3_v2/src/pages/NetworkMap.jsx` - Component trang Bản đồ Trạm.

---
Next Phase: [phase-04-routing.md](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-04-routing.md)
