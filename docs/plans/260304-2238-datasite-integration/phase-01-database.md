# Phase 01: Setup Database & Import Logic
Status: ⬜ Pending
Dependencies: None

## Objective
Khởi tạo bảng `datasite_assets` trong database.db và viết các functions đọc 7 mẫu file Excel DataSite bằng thư viện Pandas để ghi vào Database.

## Requirements
### Functional
- [ ] Schema database linh hoạt chứa các trường: `site_id`, `asset_type`, `asset_name`, `brand`, `capacity`, `quantity`, `status`, `extra_info_1`, `extra_info_2`, `sync_date`.
- [ ] Hàm `import_asset_data(file_path, asset_type)` xử lý đọc file.
- [ ] Tự động map đúng các cột Excel DataSite với cột trong Model Database.

### Non-Functional
- [ ] Xử lý mượt file Excel rác (Header có thể nằm ở dòng 1 hoặc 2 tùy biểu đồ).
- [ ] Dòng nào chưa có (NaN) phải cast về dạng rỗng (NULL hoặc '') thay vì báo lỗi.

## Implementation Steps
1. [ ] Mở file `models.py`, khai báo class `DataSiteAsset(db.Model)`. Sinh câu lệnh tạo bảng.
2. [ ] Tạo file tiện ích: `datasite_utils.py` chưa hàm parse Pandas từng biểu đồ Excel của DataSite.
3. [ ] Viết UnitTest (nhập file Excel thủ công từ list 7 file download mẫu) đảm bảo nó đi vào DB đúng chuẩn.

## Files to Create/Modify
- `web-app/models.py` - Thêm Model `DataSiteAsset`.
- `web-app/datasite_utils.py` - Chứa logic xử lý DataSite Files.

---
Next Phase: `phase-02-scraper.md`
