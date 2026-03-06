# Phase 01: Backend API
Status: ✅ Complete
Dependencies: None

## Objective
Tạo API Endpoint cho phép truy vấn danh sách thiết bị trên toàn mạng dựa theo hạng mục (asset_type).

## Requirements
### Functional
- [x] Xây dựng route GET `/api/datasite/assets` hoặc mở rộng `/api/datasite/search` để hỗ trợ param `?asset_type=XXX`.
- [x] Trả về danh sách tất cả các tài sản trùng khớp `asset_type` từ bảng `DataSiteAsset`.
- [x] Dữ liệu trả về cần được sort theo mã trạm (`site_id`) để dễ nhìn.
- [x] Định dạng JSON chuẩn `{success: true, data: [...]}`.

## Implementation Steps
1. [x] Mở file `web-app/datasite_routes.py`.
2. [x] Thêm một route mới `@datasite_bp.route('/api/datasite/assets/by_type', methods=['GET'])`.
3. [x] Lấy `type = request.args.get('type')` từ URL.
4. [x] Query database: `DataSiteAsset.query.filter_by(asset_type=type).order_by(DataSiteAsset.site_id).all()`.
5. [x] Chuyển đổi kết quả (to_dict) và return jsonify.

## Files to Create/Modify
- `web-app/datasite_routes.py` - Add API logic.

## Test Criteria
- [x] Gọi thử `/api/datasite/assets/by_type?type=MAY_LANH` trả về mảng JSON chứa 100% máy lạnh thay vì null/error.

---
Next Phase: phase-02-frontend-ui.md
