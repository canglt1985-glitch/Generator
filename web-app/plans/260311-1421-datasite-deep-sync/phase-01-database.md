# Phase 01: Database & Model Updates
Status: ⬜ Pending
Dependencies: None

## Objective
Đảm bảo mô hình dữ liệu hỗ trợ tốt việc chia nhỏ và bổ sung các hạng mục mới (Truyền dẫn, Kỹ thuật chi tiết).

## Requirements
### Functional
- [ ] Quy chuẩn hóa cách lưu trữ `extra_data` trong các bảng `DsInfrastructure`, `DsEquipment`, `DsTelecom`.
- [ ] Bổ sung trường `subcategory` hoặc logic phân loại mềm cho các bảng này để hỗ trợ việc lọc dữ liệu linh hoạt trên UI. (Ưu tiên dùng `extra_data` nhưng có quy chuẩn key).

## Implementation Steps
1. [ ] Rà soát `web-app/models.py`: Kiểm tra các bảng DataSite hiện tại.
2. [ ] Thêm logic `to_dict` mở rộng để tự động parse `extra_data` ra các trường cụ thể khi cần hiển thị.
3. [ ] Tạo migration hoặc script script `ALTER TABLE` nếu quyết định thêm cột cứng (phụ thuộc vào design chi tiết).

## Files to Create/Modify
- `web-app/models.py` - Cập nhật Schema.

## Test Criteria
- [ ] Dữ liệu cũ vẫn hoạt động bình thường.
- [ ] Dữ liệu mới với cấu trúc chia nhỏ được lưu và truy vấn OK.

---
Next Phase: [phase-02-scraper.md](phase-02-scraper.md)
