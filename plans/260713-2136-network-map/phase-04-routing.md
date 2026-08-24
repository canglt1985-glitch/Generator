# Phase 04: Menu & Routing Integration
Status: ✅ Complete
Dependencies: [Phase 03](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-03-frontend.md)

## Objective
Cập nhật menu điều hướng trên Header và cấu hình React Router để chính thức kích hoạt trang Bản đồ Trạm thay thế cho Dashboard cũ.

## Requirements
- [x] Ẩn mục **Dashboard** khỏi danh sách `navigation` trên Header và Mobile Menu.
- [x] Thêm mục **Bản đồ Trạm** (trỏ tới `/network-map`) sử dụng biểu tượng `Map` của `lucide-react`.
- [x] Cấu hình Route trang chủ `/` redirect trực tiếp sang `/network-map`.
- [x] Khai báo Route `/network-map` chạy trang `NetworkMap`.

## Implementation Steps
1. [x] Cập nhật file [Header.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/components/Header.jsx) thay đổi mảng `navigation` và import icon `Map`.
2. [x] Cập nhật file [App.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/App.jsx) để import `NetworkMap`, thay đổi route `/` và thêm route `/network-map`.
3. [x] Xóa bỏ trang `PakhCheck.jsx` tạm thời trước đó để tránh dư thừa mã nguồn.

## Files Created/Modified
- `tvt3_v2/src/components/Header.jsx` - Cập nhật menu điều hướng.
- `tvt3_v2/src/App.jsx` - Cập nhật Router configuration.
- `tvt3_v2/src/pages/PakhCheck.jsx` [DELETE] - Xóa file tạm.

---
Next Phase: [phase-05-testing.md](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-05-testing.md)
