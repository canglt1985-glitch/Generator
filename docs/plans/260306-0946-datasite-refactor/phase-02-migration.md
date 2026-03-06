# Phase 02: Script Migration (Data Import / Exporter)
Status: ⬜ Pending

## Objective
Viết lại file `datasite_utils.py` và `datasite_scraper.py` để sử dụng cấu trúc DB JSON mới và kết hợp Filter "nhà trồng được" của Tổ mình.

## Requirements
### Functional
- [ ] Hàm Parse: Import tất cả dữ liệu có prefix `DNTN`, `DNLK`, `DNXL`, `DNDQ`, `DNCM`, `DNTP` hoặc Trạm có tồn tại trước.
- [ ] Import Excel Data Trạm: Tách Hợp Đồng/Thanh toán.
- [ ] Import Thiết bị: Gom các Cột vào `metadata` dưới dạng JSON (Vị trí, Dòng tải, Capacity...).
- [ ] Bật logic phát hiện Duplicate: Update thay vì Insert nếu trùng Serial.

## Implementation Steps
1. Đập bỏ code cũ (gọi `DataSiteAsset`) thay bằng code trỏ vào các bảng `Ds`.
2. Tạo Cột "Map" (Excel Column => JSON Key).
3. Test thử Import đối với 1 File (Nhà dân hợp đồng).

## Files to Modify
- `datasite_utils.py`
- `datasite_scraper.py` (nếu cần đổi luồng tải)
