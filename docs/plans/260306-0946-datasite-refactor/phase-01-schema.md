# Phase 01: Database Schema Redesign
Status: ⬜ Pending

## Objective
Thiết kế lại và áp dụng sơ đồ cơ sở dữ liệu mới (5 nhóm thực thể chính) dưới dạng Model trong SQLAlchemy (`models.py`).

## Requirements
### Functional
- [ ] Xóa bỏ Model `DataSiteAsset` cũ, thay bằng các `Ds`-prefixed Model (VD: `DsGeneralInfo`, `DsInfrastructure`, `DsEquipment`, `DsTelecom`).
- [ ] Vẫn giữ và nâng cấp bảng `DataSiteAnomaly`.
- [ ] Cột `metadata` (JSON) ở các thiết bị cần được khai báo `db.JSON` để lưu trữ linh hoạt.

## Implementation Steps
1. [ ] Cập nhật `models.py`: Khai báo 4 model DataSite cốt lõi (General, Infra, Equip, Telecom, Anomaly).
2. [ ] Tạo file Migration Alembic hoặc Drop các bảng DataSite cũ nếu chưa có Data live (chỉ có data mock) và Create_all() lại để cập nhật cột Mới trên CSDL.

## Files to Modify
- `models.py` - Chỉnh Models DataSite.

---
Next Phase: phase-02-migration.md
