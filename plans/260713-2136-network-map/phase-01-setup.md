# Phase 01: Setup & CSS Integration
Status: ✅ Complete
Dependencies: None

## Objective
Chuẩn bị môi trường, cài đặt các thư viện bản đồ cần thiết và tích hợp file style (CSS) của Leaflet vào ứng dụng Web.

## Requirements
- [x] Cài đặt `leaflet` và `react-leaflet`.
- [x] Nhúng link CSS Leaflet UMD vào tệp `index.html`.

## Implementation Steps
1. [x] Chạy lệnh cài đặt npm trong thư mục `tvt3_v2`:
   `npm install leaflet react-leaflet`
2. [x] Sửa file `tvt3_v2/index.html` để nhúng link CSS CDN của Leaflet vào thẻ `<head>` để đảm bảo render layout bản đồ không bị lỗi.

## Files Created/Modified
- `tvt3_v2/package.json` - Cài đặt thêm thư viện bản đồ.
- `tvt3_v2/index.html` - Nhúng CSS Leaflet.

---
Next Phase: [phase-02-database.md](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-02-database.md)
