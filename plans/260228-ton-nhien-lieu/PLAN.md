# 📝 PLAN: Thêm Cột Tồn Nhiên Liệu vào Fuel Ledger

**Ngày:** 2026-02-28  
**Tham chiếu:** [BRIEF.md](./BRIEF.md)  
**Ước tính:** ~30 phút  
**Trạng thái:** ⏳ Chờ thực hiện

---

## Tổng quan

Thêm cột **"Tồn KHO"** vào bảng fuel ledger (tab Nhiên Liệu, page Chi Phí).  
Hiển thị running balance kho tổng sau mỗi giao dịch.

---

## Task 1: Backend — Tính running balance

**File:** `web-app/generator/routes.py`

### Logic:
1. Sau khi query `fuel_logs` (30 dòng, sorted desc by ngày), tính running balance
2. Lấy `central_stock` hiện tại (đã có từ `get_central_stock()`)
3. Duyệt từ dòng mới nhất → cũ nhất, tính ngược:

```python
# central_stock đã tính tổng hiện tại
# fuel_logs sorted DESC (mới nhất trước)
# Cần tính "tồn kho SAU giao dịch này"

# Bắt đầu từ stock hiện tại, trừ/cộng ngược
# Dòng 1 (mới nhất) → tồn = central_stock hiện tại
# Dòng 2 → tồn = central_stock - ảnh hưởng dòng 1
# ...

running_dau = central_stock['Dầu']
running_xang = central_stock['Xăng']

for log in fuel_logs:
    # Gán tồn SAU giao dịch này
    if log.loai_nhien_lieu == 'Dầu':
        log.ton_kho = running_dau
    else:
        log.ton_kho = running_xang
    
    # Trừ ngược ảnh hưởng của giao dịch này
    delta = 0
    if log.type == 'STOCK_IN':
        delta = -log.so_luong  # ngược: bỏ ảnh hưởng nhập
    elif log.type == 'STATION_OUT':
        delta = +log.so_luong  # ngược: bỏ ảnh hưởng xuất
    elif log.type == 'ADJUSTMENT' and not log.id_tram:
        delta = -log.so_luong  # ngược: bỏ hiệu chỉnh kho
    # DIRECT_BUY: không ảnh hưởng kho tổng → delta = 0
    
    if log.loai_nhien_lieu == 'Dầu':
        running_dau += delta
    else:
        running_xang += delta
```

### Lưu ý:
- `ADJUSTMENT` chỉ tính khi `id_tram` rỗng (hiệu chỉnh KHO, không phải trạm)  
- `DIRECT_BUY` không thay đổi kho tổng → `ton_kho` giữ nguyên
- Khi filter theo tháng, `central_stock` vẫn là hiện tại → cần tính lại từ hiện tại trừ ngược

---

## Task 2: Template — Thêm cột hiển thị

**File:** `web-app/templates/generator.html`

### Thay đổi:
1. Thêm `<th>Tồn KHO</th>` vào header bảng fuel ledger
2. Thêm `<td>` hiển thị `log.ton_kho` ở mỗi dòng

### Format:
```html
<td class="text-end fw-bold">
    <span class="{{ 'text-success' if log.ton_kho > 500 else 'text-warning' if log.ton_kho > 100 else 'text-danger' }}">
        {{ "{:,.0f}".format(log.ton_kho) }}L
    </span>
</td>
```

### Quy tắc màu:
- 🟢 **Xanh** (`text-success`): > 500L
- 🟡 **Vàng** (`text-warning`): 100-500L  
- 🔴 **Đỏ** (`text-danger`): < 100L

---

## Task 3: Xử lý edge cases

1. **Filter theo tháng cũ:** 
   - `central_stock` hiện tại sẽ KHÔNG chính xác cho tháng cũ
   - Cần tính `central_stock` tại thời điểm cuối tháng đang xem
   - Cách: sum tất cả giao dịch từ đầu đến cuối tháng filter

2. **Hiệu chỉnh dầu tồn trạm (ADJUSTMENT có id_tram):**
   - KHÔNG ảnh hưởng kho tổng → bỏ qua

3. **Cột trống cho DIRECT_BUY:**
   - Hiện "—" thay vì số (vì DIRECT_BUY không qua kho)
   - Hoặc hiện số tồn kho tại thời điểm đó (không thay đổi)

---

## Checklist thực hiện

- [ ] Task 1: Backend tính running balance
- [ ] Task 2: Template thêm cột
- [ ] Task 3: Edge cases (filter tháng cũ)
- [ ] Test tất cả tabs vẫn hoạt động
- [ ] Commit + test trên browser

---

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `generator/routes.py` | Thêm running balance logic trong `if active_tab == 'fuel'` |
| `templates/generator.html` | Thêm `<th>` + `<td>` cột Tồn KHO |
