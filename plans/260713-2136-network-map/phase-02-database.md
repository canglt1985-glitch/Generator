# Phase 02: Database Queries
Status: ✅ Complete
Dependencies: [Phase 01](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-01-setup.md)

## Objective
Xây dựng các câu truy vấn (queries) lấy dữ liệu từ hai bảng `datasites` (trạm đang hoạt động) và `infrastructure_projects` (dự án CSHT) từ Supabase để hiển thị đồng thời lên bản đồ.

## Requirements
- [x] Truy vấn danh sách trạm đang hoạt động (`datasites`) chứa trường: `site_id`, `site_id_old`, `name`, `location_info` (toạ độ vĩ độ/kinh độ, huyện), `management_info` (tổ viễn thông quản lý).
- [x] Truy vấn danh sách dự án CSHT (`infrastructure_projects`) chứa trường: `planning_id_new`, `planning_id_old`, `latitude_survey`, `longitude_survey`, `latitude_plan`, `longitude_plan`, `survey_status`, `overall_status`, `notes`.

## Implementation Steps
1. [x] Viết hàm `fetchMapData` trong React Component để song song tải dữ liệu trạm hoạt động và dự án CSHT bằng `Promise.all`.
2. [x] Lọc bỏ dữ liệu trạm/dự án bị lỗi tọa độ (không có `vi_do`/`kinh_do` hoặc giá trị `null`) để tránh làm vỡ bản đồ.

## Files Created/Modified
- `tvt3_v2/src/pages/NetworkMap.jsx` - Component chính của trang bản đồ.

---
Next Phase: [phase-03-frontend.md](file:///Users/cang_it/Antigravity/TVT3/plans/260713-2136-network-map/phase-03-frontend.md)
