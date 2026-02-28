# Phase 05: Tách trang Thanh Toán
Status: ⬜ Pending
Dependencies: Phase 04

## Objective
Tách tab "Thanh Toán" ra thành trang `/thanh-toan` riêng.

## Implementation Steps

### Backend
1. [ ] Tạo function `thanh_toan()` trong `routes.py`
   - Route: `/thanh-toan`
   - Query: payment_data, payment_groups, totals (logic lines 125-259 trong generator())
   - Template: `thanh_toan.html`
2. [ ] Giữ nguyên: `save_payment_group_gen`, `calc_payment_amount`

### Frontend
3. [ ] Tạo `thanh_toan.html`
   - Page header: "💳 Thanh Toán"
   - Payment group cards (Chi phí mua ngoài / CX222)
   - Bảng thanh toán theo nhân viên
   - Modal: paymentGroupModal (đã nằm trong layout.html)
4. [ ] Script: payment group save/calc (đã có trong layout.html)

## Data cần query:
```python
# Logic phức tạp nhất - payment aggregation
# Copy từ generator() lines 125-259
payment_data = {...}
payment_groups = {...}
mua_ngoai_total, cx222_total, mua_ngoai_new, cx222_new
```

## Files to Create
- `web-app/templates/thanh_toan.html`

## Files to Modify
- `web-app/generator/routes.py` — add route (extract payment logic)
- `web-app/templates/layout.html` — sidebar link

## Test Criteria
- [ ] Trang `/thanh-toan` hiển thị bảng thanh toán
- [ ] Payment group cards hiển thị đúng số liệu
- [ ] Cập nhật thanh toán (modal) hoạt động
- [ ] Filter theo tháng/năm hoạt động

---
Next Phase: phase-06-chay-may.md
