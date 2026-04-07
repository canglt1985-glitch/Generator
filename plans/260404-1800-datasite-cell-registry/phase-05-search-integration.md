# Phase 05: Search Integration
Status: ⬜ Pending
Dependencies: phase-04-edit-feature.md

## Objective
Tích hợp khả năng tìm kiếm mới vào thành phần Search tổng (DataSite Search), đáp ứng yêu cầu "Không biến giới" (nhập bất kỳ Cũ/Mới, Site/Cell đều nhúng ra kết quả).

## Requirements
- [ ] Chỉnh sửa query SQLAlchemy tại route bắt Search Text.
- [ ] Tham gia join / filter trên cả bảng `SiteRegistry` (`site_name_cũ`, `site_name_mới`) và `CellRegistry` (`cell_name_cũ`, `cell_name_mới`).
- [ ] Trả về Object của Trạm tương ứng và điều hướng thẳng vào trang Detail của Tab Vô Tuyến.

## Implementation Steps
1. [ ] Kiểm tra hàm Search hiện tại có trong file `datasite_routes.py` (Hàm `ds_search` hoặc block tương tự).
2. [ ] Sửa lại logic query Search: `OR` các keyword cho các cột ID trạm mới.
3. [ ] Test nhập thử 4 case: Trang Cũ Site, Trang Cũ Cell, Trang Mới Site, Trang Mới Cell đều phải đưa về được Station_ID đúng.
