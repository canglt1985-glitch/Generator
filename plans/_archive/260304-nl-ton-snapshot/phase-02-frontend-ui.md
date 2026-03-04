# Phase 02: Frontend UI
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Hiển thị cột NL tồn từ `ton_sau_gd` (snapshot cố định) thay vì fetch real-time.
Thêm field `ton_sau_gd` vào modal tạo/edit giao dịch.

## Implementation Steps

### Step 1: Cột NL tồn — hiển thị từ DB thay vì JS fetch
**File:** `web-app/templates/generator.html`

Hiện tại cột NL tồn dùng JS fetch `/api/fuel-stock-all` rồi inject vào `.fuel-ton-cell`.
Đổi thành: render trực tiếp từ Jinja2 `{{ log.ton_sau_gd }}`.

```html
<!-- THAY THẾ td fuel-ton-cell hiện tại: -->
<td class="text-end d-none d-md-table-cell">
    {% if log.ton_sau_gd is not none %}
        {% set ton = log.ton_sau_gd %}
        <span class="{% if ton > 50 %}text-success fw-bold{% elif ton > 20 %}text-warning fw-bold{% elif ton > 0 %}text-danger fw-bold{% else %}text-muted{% endif %}">
            {{ "{:,.0f}".format(ton) }}L
        </span>
    {% elif log.id_tram %}
        <span class="text-muted">--</span>
    {% else %}
        <span class="text-muted">—</span>
    {% endif %}
</td>
```

**XÓA** block JS fetch `/api/fuel-stock-all` cuối file (không cần nữa cho bảng NL).

### Step 2: Modal tạo giao dịch — thêm field tồn
**File:** `web-app/templates/generator.html` (smartFuelModal)

Thêm input `ton_sau_gd` cho user hiệu chỉnh:

```html
<!-- Thêm sau row "Ghi chú" trong modal: -->
<div class="row mb-2" id="tonRow" style="display:none">
    <div class="col-6">
        <label class="form-label small">NL tồn sau GD (L)</label>
        <input type="number" step="0.1" class="form-control form-control-sm"
               name="ton_sau_gd" id="fuelTonSauGd" placeholder="Tự động tính">
        <small class="text-muted">Để trống = hệ thống tự tính</small>
    </div>
</div>
```

JS: Hiện `tonRow` khi type = DIRECT_BUY, STATION_OUT, ADJUSTMENT (ẩn khi STOCK_IN).

### Step 3: Edit giao dịch — load ton_sau_gd
**File:** `web-app/templates/generator.html` (function `editFuel`)

Khi edit, load `ton_sau_gd` từ `data-json`:
```javascript
// Trong editFuel():
document.getElementById('fuelTonSauGd').value = log.ton_sau_gd || '';
tonRow.style.display = log.id_tram ? '' : 'none';
```

## Files to Modify
- `web-app/templates/generator.html` — cột + modal + JS

## Test Criteria
- [ ] Cột NL tồn hiện số từ DB (không fetch API)
- [ ] Màu đúng: xanh >50, vàng 20-50, đỏ <20, muted 0
- [ ] STOCK_IN hiện "—" (không có ton_sau_gd)
- [ ] Modal tạo GD: field tồn hiện khi type != STOCK_IN
- [ ] Modal edit: load ton_sau_gd đúng
- [ ] Để trống → hệ thống auto-calc
- [ ] Nhập số → lưu override

---
✅ Done — Commit sau khi test xong
