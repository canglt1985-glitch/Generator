# Plan: Tối Ưu Bản Đồ Số & Chuẩn Hóa Theo Quy Hoạch Vô Tuyến (Chuẩn 5G-A)
Created: 2026-10-01 11:08
Updated: 2026-10-01 11:10 (Đồng bộ thuật ngữ 5G 2 lớp thành 5G-A)
Status: 🟢 Completed

## Overview
Chuẩn hóa hiển thị bản đồ trạm vô tuyến TVT3 hoàn toàn dựa trên Quy Hoạch Vô Tuyến (RF Planning) thay vì tiến độ swap ngoài hiện trường. Chuẩn hóa thuật ngữ 5G 2 lớp thành **5G-A** (5G-Advanced: kết hợp NR2600 + NR3800). Thiết kế lại danh sách Cell gom nhóm theo góc hướng Azimuth (chuẩn DataSite TVT2), loại bỏ viền đen nhãn mã trạm, chuyển sang chế độ 2-click (Double Click) lấy tọa độ, xử lý hiển thị trạm thiếu azimuth (như DNDQ37), ẩn cột 5G khi trạm không có 5G, và sẵn sàng tích hợp số liệu lưu lượng Data/Voice.

## Tech Stack
- Frontend: React 18, Leaflet 1.9, React-Leaflet 4.2, TailwindCSS, Lucide Icons, Vite
- Backend/Data: Supabase PostgreSQL (`datasites`, `infrastructure_projects`), GeoJSON/Turf geometry calculation
- Data Sources: `ERA_RF_ALL_2026.xlsx` (Quy hoạch ERA/SRAN), `3G.xlsx`, `4G.xlsx` (KPI/Traffic)

## Phases

| Phase | Name | Description | Status | Progress |
|---|---|---|---|---|
| 01 | Data Model & Planning Matrix | Chuẩn hóa phân loại công nghệ theo quy hoạch ERA & chuẩn 5G-A | ✅ Completed | 100% |
| 02 | Map Markers & Interaction | Text chữ trắng không viền đen, chế độ 2-click (dblclick) lấy tọa độ | ✅ Completed | 100% |
| 03 | Cell List by Azimuth & Popup UI | Danh sách cell theo góc hướng (chuẩn TVT2), hiển thị badge 5G-A, ẩn cột 5G khi không có, xử lý DNDQ37 | ✅ Completed | 100% |
| 04 | Map Performance & Canvas | Bật HTML5 Canvas Renderer (`preferCanvas: true`), Viewport Culling | ✅ Completed | 100% |
| 05 | Testing & Verification | Kiểm thử trực tiếp trên trình duyệt máy tính và điện thoại | ✅ Completed | 100% |

## Quick Commands
- Tiếp tục bước tiếp theo: `/next`
- Lưu ngữ cảnh: `/save-brain`
