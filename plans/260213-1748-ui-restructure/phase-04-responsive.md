# Phase 04: Responsive Table Columns
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Áp dụng responsive column hiding cho tất cả 6 tabs theo spec trong BRIEF mục 4.

## Implementation Steps
Áp dụng class `d-none d-md-table-cell` cho các cột ẩn trên mobile.

### Tab 1: Lịch Cúp Điện
- [ ] Đã OK — Đội QL, Khu Vực, NV Quản Lý đã có `d-none d-md-table-cell`

### Tab 2: Nhiên Liệu
- [ ] Ẩn mobile: Đơn giá, Thành tiền, NCC, Người mua, Ghi chú
- [ ] Giữ mobile: Ngày, Loại, NL, Trạm, Lượng, Actions

### Tab 3: Chi Phí Khác
- [ ] Đã OK — Ghi Chú đã có `d-none d-md-table-cell`

### Tab 4: Thanh Toán
- [ ] Ẩn mobile: Mua Lẻ, CX222, VNPT-VTL, Chi phí khác
- [ ] Giữ mobile: Nhân viên, Cần CK

### Tab 5: Chạy Máy (mới)
- [ ] Ẩn mobile: Site, CS Máy, Giờ BĐ, Giờ KT, Đơn Giá, Thành Tiền, Ghi Chú
- [ ] Giữ mobile: Ngày VH, Trạm, Thời Gian, NL Hao, Actions

### Tab 6: Thông Tin MPĐ (mới)
- [ ] Ẩn mobile: Checkbox, Mã KH, Quản lý, Máy phát, Dung tích, ĐM TT (tính toán), Loại trạm, Loại máy
- [ ] Giữ mobile: ID Trạm, Huyện, ĐM TT (thực tế), NL, Actions

## Files to Modify
- `web-app/templates/generator.html` — thêm responsive classes vào `<th>` và `<td>`

## Test Criteria
- [ ] Desktop: tất cả cột hiện
- [ ] Mobile (< 768px): chỉ hiện cột Key (theo BRIEF mục 4)
- [ ] Bảng không bị vỡ layout trên mobile

---
Next Phase: [phase-05-testing.md](file:///d:/download/VH%20may%20phat%20dien/plans/260213-1748-ui-restructure/phase-05-testing.md)
