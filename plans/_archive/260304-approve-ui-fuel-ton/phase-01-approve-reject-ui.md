# Phase 01: UI Approve/Reject — Bảng Chạy Máy
Status: ⬜ Pending
Dependencies: None (backend routes đã có sẵn)

## Objective
Admin nhìn vào tab "Chạy Máy" thấy ngay record nào pending (từ SmartW auto-import), có thể approve/reject/edit giờ ngay trên bảng.

## Backend đã có (KHÔNG cần sửa)
- `generator/routes.py#568`: `POST /generator/approve/<id>` → set status=approved
- `generator/routes.py#580`: `POST /generator/reject/<id>` → set status=rejected
- `generator/routes.py#592`: `POST /generator/update-log/<id>` → edit giờ BĐ/KT, recalculate NL+tiền, auto-approve
- `core/routes.py#303`: query GeneratorLog theo tháng, trả `gen_logs` → template `logs` variable

## Implementation Steps

### Step 1: Thêm pending count card
File: `templates/admin_mpd.html` — sau dòng `</div>` của summary cards (line ~340)

Thêm card "Chờ duyệt" vào row summary cards (chỉ hiện khi có pending):
```html
{% set pending_logs = logs|selectattr('status','equalto','pending')|list %}
{% if pending_logs %}
<div class="col-auto">
    <div class="card card-sm bg-warning-lt border border-warning">
        <div class="card-body py-2 px-3">
            <div class="text-muted small">⏳ Chờ duyệt</div>
            <div class="fw-bold text-warning">{{ pending_logs|length }}</div>
        </div>
    </div>
</div>
{% endif %}
```

### Step 2: Thêm cột header "Nguồn" + "Status"
File: `templates/admin_mpd.html` — lines 344-357 (thead)

Sửa header bảng logsTable:
```
Trạm | Nguồn | Ngày VH | Site | CS Máy | Giờ BĐ | Giờ KT | Thời Gian | NL Hao | Đơn Giá | Thành Tiền | Ghi Chú | Status | Thao Tác
```

Thêm sau `<th>Trạm</th>`:
```html
<th>Nguồn</th>
```

Đổi `<th>Ghi Chú</th>` thành:
```html
<th>Ghi Chú</th>
<th>Status</th>
```

Đổi `<th class="text-end">#</th>` thành:
```html
<th class="text-end" style="min-width:100px">Thao Tác</th>
```

Filter row: cập nhật colspan tương ứng.

### Step 3: Row highlight + badge source + badge status
File: `templates/admin_mpd.html` — lines 367-389 (tbody)

Sửa `<tr>` thành:
```html
<tr class="{{ 'table-warning' if log.status == 'pending' else ('opacity-50' if log.status == 'rejected' else '') }}">
```

Sau `<td class="fw-bold">{{ log.id_tram }}</td>` thêm cột Nguồn:
```html
<td>
    {% if log.source == 'smartw' %}
    <span class="badge bg-cyan-lt">🤖 SmartW</span>
    {% else %}
    <span class="badge bg-secondary-lt">✏️ Thủ công</span>
    {% endif %}
</td>
```

Sau cột Ghi Chú, thêm cột Status:
```html
<td>
    {% if log.status == 'pending' %}
    <span class="badge bg-warning-lt fw-bold">⏳ Chờ duyệt</span>
    {% elif log.status == 'rejected' %}
    <span class="badge bg-danger-lt">❌ Từ chối</span>
    {% else %}
    <span class="badge bg-success-lt">✅</span>
    {% endif %}
</td>
```

### Step 4: Action buttons (approve/edit/reject + delete)
File: `templates/admin_mpd.html` — thay thế cột `#` cuối cùng

```html
<td class="text-end">
    {% if log.status == 'pending' and session['role'] == 'admin' %}
    <!-- Approve -->
    <form action="{{ url_for('generator.approve_log', id=log.id) }}" method="POST" class="d-inline">
        <button class="btn btn-ghost-success btn-icon btn-sm" title="Duyệt">
            <i class="fas fa-check"></i>
        </button>
    </form>
    <!-- Edit -->
    <button class="btn btn-ghost-primary btn-icon btn-sm" title="Sửa giờ"
        onclick="openEditLogModal({{ log.id }}, '{{ log.id_tram }}', '{{ log.ngay_van_hanh }}', '{{ log.gio_bat_dau or '' }}', '{{ log.gio_ket_thuc or '' }}', '{{ log.thoi_gian_hoat_dong or 0 }}')">
        <i class="fas fa-edit"></i>
    </button>
    <!-- Reject -->
    <form action="{{ url_for('generator.reject_log', id=log.id) }}" method="POST" class="d-inline"
        onsubmit="return confirm('Từ chối record {{ log.id_tram }} ngày {{ log.ngay_van_hanh }}?')">
        <button class="btn btn-ghost-danger btn-icon btn-sm" title="Từ chối">
            <i class="fas fa-times"></i>
        </button>
    </form>
    {% else %}
    <!-- Delete (for approved/manual records) -->
    <form action="{{ url_for('generator.delete_generator_log', id=log.id) }}" method="POST" class="d-inline"
        onsubmit="return confirm('Xóa record này?');">
        <button class="btn btn-ghost-danger btn-icon border-0 btn-sm"><i class="fas fa-trash"></i></button>
    </form>
    {% endif %}
</td>
```

### Step 5: Modal Edit Log
File: `templates/admin_mpd.html` — trước `</script>` cuối file (hoặc sau `{% include "_modals_admin.html" %}`)

```html
<!-- Modal: Edit Generator Log -->
<div class="modal modal-blur fade" id="editLogModal" tabindex="-1">
    <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
            <form id="editLogForm" method="POST">
                <div class="modal-header">
                    <h5 class="modal-title">✏️ Sửa Giờ Chạy Máy</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Trạm</label>
                        <input type="text" class="form-control" id="editLogTram" readonly>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Ngày</label>
                        <input type="text" class="form-control" id="editLogNgay" readonly>
                    </div>
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="form-label">Giờ bắt đầu</label>
                            <input type="time" class="form-control" name="gio_bat_dau" id="editLogGioBD" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label">Giờ kết thúc</label>
                            <input type="time" class="form-control" name="gio_ket_thuc" id="editLogGioKT" required>
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        ℹ️ Lưu sẽ tự tính lại NL tiêu hao + thành tiền và auto duyệt.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-link" data-bs-dismiss="modal">Hủy</button>
                    <button type="submit" class="btn btn-primary">💾 Lưu & Duyệt</button>
                </div>
            </form>
        </div>
    </div>
</div>
```

JS function (thêm vào `<script>`):
```javascript
function openEditLogModal(id, tram, ngay, gioBD, gioKT, hours) {
    document.getElementById('editLogForm').action = '/generator/update-log/' + id;
    document.getElementById('editLogTram').value = tram;
    document.getElementById('editLogNgay').value = ngay;
    document.getElementById('editLogGioBD').value = gioBD;
    document.getElementById('editLogGioKT').value = gioKT;
    const _bs = (typeof bootstrap !== 'undefined') ? bootstrap : (typeof tabler !== 'undefined' ? tabler.bootstrap : null);
    if (_bs) new _bs.Modal(document.getElementById('editLogModal')).show();
}
```

## Files to Modify
| File | Changes |
|------|---------|
| `templates/admin_mpd.html` | Pending card, header, row badges, action buttons, edit modal, JS |

## Test Criteria
- [ ] Bảng chạy máy hiện cột Nguồn (SmartW/Thủ công) 
- [ ] Bảng hiện cột Status (✅/⏳/❌)
- [ ] Row pending highlight vàng
- [ ] Nút Approve → click → record chuyển ✅, row hết vàng
- [ ] Nút Edit → modal mở → sửa giờ → Lưu → auto approve + tính lại tiền
- [ ] Nút Reject → confirm → record chuyển ❌, row mờ
- [ ] Record approved/manual chỉ có nút xóa (không có approve/reject)
- [ ] Card "Chờ duyệt: X" hiện đúng số

---
Next Phase: [phase-02-fuel-stock-column.md](./phase-02-fuel-stock-column.md)
