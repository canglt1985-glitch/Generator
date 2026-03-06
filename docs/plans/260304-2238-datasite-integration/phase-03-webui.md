# Phase 03: Web UI - Tra Cứu Danh Bạ Trạm
Status: ⬜ Pending
Dependencies: phase-02-scraper.md

## Objective
Giao diện hiển thị tra cứu Trạm (Card) ở màn hình người dùng (`/vhkt`). Nhanh, mượt, không cần tải lại trang cũng được (hoặc SSR thẳng HTML).

## Requirements
- [ ] Giao diện tìm kiếm 1 trường: Nhập mã `SITE_ID`
- [ ] Render ra HTML "Card" tài sản nhóm thành các loại: (Cột Ăng Ten, Phòng Máy, Lưu Điện, Làm Mát...)
- [ ] Hiển thị thông số Máy phát/Tủ nguồn trực quan.

## Implementation Steps
1. [ ] Cập nhật Template `index.html` hoặc thư mục `templates` con có trang Tra cứu Danh Bạ.
2. [ ] Viết Route GET trả ra Model `DataSiteAsset` gom nhóm qua GroupBy Python, trả dict `assets = {'MAY_LANH': [...], 'MAY_PHAT': [...]}`
3. [ ] Design CSS Card View (Modern, Shadow Box, Status Colors: Red cho Hỏng, Green cho Tốt).

## Files to Create/Modify
- `web-app/app.py` - Endpoint route `/search-station`
- `web-app/templates/stations.html` - Giao diện HTML mới.
