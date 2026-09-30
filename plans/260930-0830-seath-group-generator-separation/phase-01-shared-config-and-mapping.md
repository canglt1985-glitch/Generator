# Phase 01: Shared Config & Station Mapping
Status: ✅ Complete
Dependencies: None

## Objective
Xác lập cấu hình chuẩn cho 11 trạm Seath Group trên cả frontend và backend, đồng thời chuẩn hóa việc loại trừ `DNDQ12` và `DNTP11` khỏi tập hợp 67 trạm đặc thù của Nhóm 1.

## Requirements
### Functional
- [x] Khai báo danh sách 11 trạm Seath Group hỗ trợ cả mã trạm cũ và mã trạm chuẩn mới (canonical ID).
- [x] Đảm bảo 2 trạm `DNDQ12` (`DNILNA02`) và `DNTP11` (`DNITPU03`) được gỡ bỏ/loại trừ khỏi `SPECIAL_67_SITES_SET` trong tất cả các module tính toán.
- [x] Xây dựng helper function kiểm tra trạm có thuộc Seath Group hay không: `isSeathGroupSite(siteId, siteIdOld)`.

### Non-Functional
- [ ] Nhất quán giữa frontend (`tvt3_v2/src/`) và backend (`backend/` & `scripts/`).
- [ ] Tối ưu tra cứu dạng `Set` O(1).

## Implementation Steps
1. [ ] Cập nhật hoặc tạo file cấu hình trạm Seath Group trong frontend: `tvt3_v2/src/utils/seathGroupConfig.js`.
2. [ ] Cập nhật hoặc thêm cấu hình Seath Group trong backend: `backend/seath_group_config.py`.
3. [ ] Cập nhật `SPECIAL_67_SITES` trong `mfdStatementExporter.js`, `daily_report.py`, và `export_official_mfd_statement.py` để loại trừ các trạm Seath Group.

## Files to Create/Modify
- `tvt3_v2/src/utils/seathGroupConfig.js` - Helper và Set mã trạm Seath Group.
- `backend/seath_group_config.py` - Helper và Set mã trạm Seath Group cho backend.
- `tvt3_v2/src/utils/mfdStatementExporter.js` - Loại trừ Seath Group khỏi 67 trạm và Group 1/2.
- `backend/daily_report.py` - Loại trừ Seath Group khỏi 67 trạm.
- `scripts/export_official_mfd_statement.py` - Loại trừ Seath Group khỏi 67 trạm.

## Test Criteria
- [ ] `isSeathGroupSite('DNDQ12')` trả về `true`.
- [ ] `isSeathGroupSite('DNILNA02')` trả về `true`.
- [ ] `isSpecial67Site('DNDQ12')` trả về `false` (vì đã thuộc Seath Group).
- [ ] `isSpecial67Site('DNTP11')` trả về `false` (vì đã thuộc Seath Group).

---
Next Phase: [phase-02-frontend-ui-and-exporter.md](file:///Users/cang_it/Antigravity/TVT3/plans/260930-0830-seath-group-generator-separation/phase-02-frontend-ui-and-exporter.md)
