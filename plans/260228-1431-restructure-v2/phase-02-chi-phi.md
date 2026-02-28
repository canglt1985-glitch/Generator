# Phase 02: Trang Chi Phí (`/chi-phi`)
Status: ⬜ Pending
Dependencies: Phase 00

## Objective
Tạo trang `/chi-phi` mới với 3 tab: Nhiên Liệu, Chi Phí Khác, Tổng Hợp.
Load data qua API (giống VHKT), mặc định hiện tháng hiện tại.

## Implementation Steps

### Backend — Route + 3 API endpoints
1. [ ] Tạo route `/chi-phi` trong `generator/routes.py`
   - `render_template('chi_phi.html')` — không query gì, chỉ render
2. [ ] Tạo API `/api/chi-phi/nhien-lieu`
   - Params: `?month=2&year=2026` (mặc định tháng hiện tại)
   - Query: FuelLedger filter theo tháng, order by ngay desc
   - Response: `{ data: [...], central_stock: {...}, suggested_price: 20000 }`
3. [ ] Tạo API `/api/chi-phi/chi-phi-khac`
   - Params: `?month=2&year=2026`
   - Query: OtherExpense filter theo tháng
   - Response: `{ data: [...] }`
4. [ ] Tạo API `/api/chi-phi/tong-hop`
   - Params: `?month=&year=2026` (month rỗng = cả năm)
   - Query: Aggregation giống payment tab hiện tại
   - Response: `{ payment_data: {...}, groups: {...}, totals: {...} }`

### Frontend — chi_phi.html (3 tab)
5. [ ] Tạo `templates/chi_phi.html` (extends layout.html)
   - Page header: "💰 Chi Phí"
   - 3 tab pills hoặc tab cards: Nhiên Liệu ★ | Chi Phí Khác | Tổng Hợp
   - URL param `?tab=` để chọn tab (default: nhien-lieu)

6. [ ] Tab **⛽ Nhiên Liệu**:
   - Toolbar: Bộ lọc tháng/năm + Nút Tạo Mới + Export
   - Bảng FuelLedger: Ngày | Loại | Trạm | Số lượng | Đơn giá | Thành tiền | NCC | Người TH
   - Card tồn kho trung tâm (Dầu / Xăng)
   - Modal: form thêm/sửa nhiên liệu (reuse logic từ generator.html)

7. [ ] Tab **📝 Chi Phí Khác**:
   - Toolbar: Bộ lọc tháng/năm + Nút Tạo Mới + Export
   - Bảng OtherExpense: Ngày | Nội dung | Số tiền | Người TƯ | Ghi chú
   - Modal: form thêm/sửa chi phí

8. [ ] Tab **📊 Tổng Hợp**:
   - Bộ lọc năm/tháng
   - Bảng tổng hợp theo người (Mua lẻ | CX222 | VNPT-VTL | CP Khác | Tổng)
   - Card nhóm thanh toán (Mua Ngoài / CX222) với nút "Đã thanh toán đến"
   - Phần "Phát sinh mới" kể từ lần thanh toán trước

9. [ ] JavaScript:
   - `loadTabData(tabName)` — fetch API tương ứng
   - `buildFuelRow(r)`, `buildExpenseRow(r)`, `buildTongHopRow(r)`
   - `switchChiPhiTab(tabName)` — show/hide tab panes
   - Reuse modal logic: `resetFuelModal()`, `editFuel()`, `setFuelType()`

### CRUD endpoints (giữ nguyên, chỉ đổi redirect)
10. [ ] Update redirect trong `routes_fuel.py`: → `/chi-phi`
11. [ ] Update redirect trong `routes_info.py` (expense CRUD): → `/chi-phi?tab=chi-phi-khac`

## Files to Create
- `web-app/templates/chi_phi.html` (~25KB ước tính)

## Files to Modify
- `web-app/generator/routes.py` — Thêm route + 3 API endpoints
- `web-app/generator/routes_fuel.py` — Đổi redirect → /chi-phi
- `web-app/generator/routes_info.py` — Đổi redirect expense → /chi-phi

## Test Criteria
- [ ] Mở `/chi-phi` → tab Nhiên Liệu hiện, data tháng hiện tại
- [ ] Chọn tháng khác → load data tháng đó
- [ ] Thêm/sửa/xóa nhiên liệu → hoạt động, redirect về `/chi-phi`
- [ ] Tab Chi Phí Khác → hiện bảng, CRUD hoạt động
- [ ] Tab Tổng Hợp → hiện bảng theo người, nhóm thanh toán
- [ ] Export Excel hoạt động

---
Next Phase: phase-03-admin.md
