# Phase 01: Database Schema
Status: ⬜ Pending
Dependencies: None

## Objective
Thiết kế Schema Database để lưu thông tin Trạm (Site) và Cell của Phân hệ Vô Tuyến.

## Requirements
- [ ] Bảng `SiteRegistry`: Lưu ID mới, ID cũ, Node-ID, Vùng Phủ, Vendor, Antenna Height, Lat, Long, và xã.
- [ ] Bảng `CellRegistry`: Khóa ngoại trỏ về `SiteRegistry`, lưu Cell Mới, Cell Cũ, Công Nghệ (3G/4G), Hướng, Azimuth, Tilt, PCI/PSC.
- [ ] Tích hợp nhẹ nhàng (Foreign Keys) hoặc thiết kế độc lập nối logic qua `site_id` của DataSite dùng chung (Station).

## Implementation Steps
1. [ ] Thêm model `SiteRegistry` và `CellRegistry` vào `datasite_models.py` (hoặc tạo file mixin mới nếu cần).
2. [ ] Viết Alembic / Flask-Migrate script để nâng cấp DB.
3. [ ] Chạy `flask db upgrade` để tạo bảng và test kết nối mẫu.

---
Next Phase: [Phase 02](phase-02-import-logic.md)
