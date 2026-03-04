# Phase 02: Cột NL Tồn Per-Station — Bảng Sổ Cái NL
Status: ⬜ Pending
Dependencies: Phase 01 (optional — có thể làm song song)

## Objective
Trong tab "Nhiên Liệu" trang /generator, hiện cột **NL tồn** per-station. Mỗi dòng giao dịch có `id_tram` sẽ hiện NL tồn hiện tại của trạm đó, vlookup từ API `/api/fuel-stock-all`.

## Backend đã có (KHÔNG cần sửa)
- `generator/routes_fuel.py#494`: `GET /api/fuel-stock-all` → trả `{station_id: {ton_real, dung_tich, dm_thuc_te, loai_nl, may_phat, loai_may}}`

## Hiện trạng template
File: `templates/generator.html`
- Tab fuel bắt đầu từ `{% if active_tab == 'fuel' %}` 
- Bảng fuel ledger có header + tbody render từ Jinja2
- Mỗi row có `log.id_tram`, `log.type`, `log.loai_nhien_lieu`, `log.so_luong`...

## Implementation Steps

### Step 1: Tìm vị trí bảng fuel trong generator.html
Tìm phần `{% if active_tab == 'fuel' %}` → tìm `<thead>` của bảng fuel ledger.

Cột hiện tại (ước tính):
```
Ngày | Loại | NL | Trạm | Lượng | Đơn Giá | Thành Tiền | NCC | Người | Ghi Chú | #
```

### Step 2: Thêm cột header "NL tồn"
Thêm sau cột "Trạm" (hoặc cuối trước cột #):
```html
<th class="text-end d-none d-md-table-cell">NL tồn</th>
```

### Step 3: Thêm td placeholder trong tbody
Trong vòng lặp `{% for log in fuel_logs %}`, thêm td mới:
```html
<td class="text-end d-none d-md-table-cell fuel-ton-cell" 
    data-station="{{ log.id_tram or '' }}">
    {% if log.id_tram %}
    <span class="text-muted">--</span>
    {% else %}
    <span class="text-muted">—</span>
    {% endif %}
</td>
```

Vị trí: sau cột Trạm (ID trạm), cùng vị trí với header.

### Step 4: JS fetch + inject NL tồn
Thêm đoạn JS vào cuối file (trong `{% block content %}` hoặc `<script>` cuối):

```javascript
// ── NL Tồn per-station (tab fuel) ──
(function() {
    const cells = document.querySelectorAll('.fuel-ton-cell');
    if (!cells.length) return;  // Not on fuel tab
    
    fetch('/api/fuel-stock-all')
        .then(r => r.json())
        .then(data => {
            cells.forEach(cell => {
                const sid = cell.dataset.station;
                if (!sid) return;
                const info = data[sid];
                if (!info) {
                    cell.innerHTML = '<span class="text-muted">N/A</span>';
                    return;
                }
                const ton = info.ton_real || 0;
                let cls = 'text-muted';
                if (ton > 50) cls = 'text-success fw-bold';
                else if (ton > 20) cls = 'text-warning fw-bold';
                else if (ton > 0) cls = 'text-danger fw-bold';
                
                cell.innerHTML = `<span class="${cls}">${ton.toFixed(1)}L</span>`;
            });
        })
        .catch(err => console.warn('Fuel stock fetch error:', err));
})();
```

### Step 5: Responsive
- Header `<th>`: thêm class `d-none d-md-table-cell` (ẩn trên mobile)
- Body `<td>`: thêm class `d-none d-md-table-cell` (ẩn trên mobile)
- Cột sẽ tự ẩn trên màn hình < 768px

## Color Coding Rules
| NL tồn | Màu | Class |
|--------|-----|-------|
| > 50L | 🟢 Xanh | `text-success fw-bold` |
| 20-50L | 🟡 Vàng | `text-warning fw-bold` |
| 0-20L | 🔴 Đỏ | `text-danger fw-bold` |
| 0 hoặc N/A | Xám | `text-muted` |

## Files to Modify
| File | Changes |
|------|---------|
| `templates/generator.html` | Thêm th + td + JS fetch |

## Test Criteria
- [ ] Tab Nhiên Liệu hiện cột "NL tồn" sau cột Trạm
- [ ] Dòng có id_tram hiện NL tồn (số + đơn vị L)
- [ ] Dòng STOCK_IN (không có trạm) hiện "—"
- [ ] Trạm không tìm thấy hiện "N/A"
- [ ] Color coding đúng: xanh > 50, vàng 20-50, đỏ < 20
- [ ] Cột ẩn trên mobile (< 768px)
- [ ] Không ảnh hưởng các tab khác (schedule, expense, payment)

## Notes
- API `/api/fuel-stock-all` trả NL tồn **hiện tại** (tính dựa trên tất cả giao dịch đến nay)
- Tất cả dòng trong bảng cùng 1 trạm sẽ hiện **cùng 1 giá trị** NL tồn (vì là tồn hiện tại, không phải tồn tại thời điểm giao dịch)
- Điều này khác với running balance (đã bỏ) — running balance tính tồn tại thời điểm mỗi giao dịch

---
Previous Phase: [phase-01-approve-reject-ui.md](./phase-01-approve-reject-ui.md)
