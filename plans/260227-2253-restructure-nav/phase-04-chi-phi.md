# Phase 04: Tách trang Chi Phí Khác
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Tách tab "Chi Phí" ra thành trang `/chi-phi-khac` riêng.

## Implementation Steps

### Backend
1. [ ] Tạo function `chi_phi_khac()` trong `routes.py`
   - Route: `/chi-phi-khac`
   - Query: OtherExpense (limit 50)
   - Template: `chi_phi_khac.html`
2. [ ] Update CRUD redirects: add_other_expense, edit_other_expense, delete_other_expense → `/chi-phi-khac`

### Frontend
3. [ ] Tạo `chi_phi_khac.html`
   - Page header: "📝 Chi Phí Khác"
   - Toolbar: search, export, tạo
   - Bảng OtherExpense
   - Modal: addExpenseModal
4. [ ] Script: editExpense, reset modal

## Data cần query:
```python
expenses = OtherExpense.query.order_by(OtherExpense.ngay_su_dung.desc()).limit(50).all()
```

## Files to Create
- `web-app/templates/chi_phi_khac.html`

## Files to Modify
- `web-app/generator/routes.py` — add route + update redirects
- `web-app/templates/layout.html` — sidebar link

## Test Criteria
- [ ] Trang `/chi-phi-khac` hiển thị bảng chi phí
- [ ] Thêm/sửa/xóa chi phí hoạt động
- [ ] Export Excel hoạt động

---
Next Phase: phase-05-thanh-toan.md
