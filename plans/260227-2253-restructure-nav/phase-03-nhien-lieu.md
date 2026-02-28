# Phase 03: Tách trang Sổ Nhiên Liệu
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Tách tab "Nhiên Liệu" ra thành trang `/nhien-lieu` riêng. Đổi tên "Sổ cái nhiên liệu" → "Sổ Nhiên Liệu"

## Implementation Steps

### Backend
1. [ ] Tạo function `nhien_lieu()` trong `routes_fuel.py`
   - Route: `/nhien-lieu`
   - Query: FuelLedger (limit 200), central_stock, suggested_price, stations
   - Template: `nhien_lieu.html`
2. [ ] Update CRUD redirects trong `routes_fuel.py`
   - `add_fuel_ledger` → redirect `/nhien-lieu`
   - `edit_fuel_ledger` → redirect `/nhien-lieu`
   - `delete_fuel_ledger` → redirect `/nhien-lieu`
   - `export_fuel_ledger` — giữ nguyên

### Frontend
3. [ ] Tạo `nhien_lieu.html` — extract fuel tab
   - Page header: "⛽ Sổ Nhiên Liệu"
   - Tồn kho cards (Dầu: XXL | Xăng: XXL)
   - Toolbar: search, export, tạo phiếu
   - Bảng FuelLedger
   - Modal: smartFuelModal (create + edit)
4. [ ] Script: setFuelType, resetFuelModal, editFuel, calcMoney, calcQty, validateStation

## Data cần query:
```python
fuel_logs = FuelLedger.query.order_by(FuelLedger.ngay.desc()).limit(200).all()
central_stock = get_central_stock()
suggested_price = ...  # latest STOCK_IN/DIRECT_BUY price
stations = GeneralInfo.query.with_entities(GeneralInfo.id_tram).all()
```

## Files to Create
- `web-app/templates/nhien_lieu.html`

## Files to Modify
- `web-app/generator/routes_fuel.py` — add route + update redirects
- `web-app/templates/layout.html` — sidebar link

## Test Criteria
- [ ] Trang `/nhien-lieu` hiển thị bảng nhiên liệu
- [ ] Tạo phiếu ĐỔ NL / NHẬP KHO / XUẤT KHO hoạt động
- [ ] Edit phiếu hoạt động (dropdown, auto-fill đơn giá)
- [ ] Delete phiếu hoạt động
- [ ] Export Excel hoạt động
- [ ] Tồn kho cards hiển thị đúng
- [ ] STATION_OUT auto-fill đơn giá đúng

---
Next Phase: phase-04-chi-phi.md
