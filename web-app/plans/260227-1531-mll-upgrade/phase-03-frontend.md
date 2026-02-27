# Phase 03: Frontend — CellOff Tab
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Thêm tab "CellOff" mới trên trang VHKT, hiển thị MLL Cell riêng biệt

## UI Design

### Nav Cards (5 cards thay vì 4):
```
| ⚠️ MĐ | 🟢 MPĐ | 🔴 MLL | 📡 CellOff | 📊 SLA |
```

CellOff card:
- Màu: `var(--tblr-purple)` (tím — phân biệt với MLL đỏ)
- Icon: 📡
- Count: số cell đang off

### Bảng CellOff:
Desktop columns:
```
| Site ID | Cell ID | Mạng | Cảnh báo | Bắt đầu | Số phút | Vendor |
```

Mobile columns (hide Cell ID, Vendor):
```
| Site ID | Mạng | Cảnh báo | Bắt đầu | Số phút |
```

## Implementation Steps

### 1. [ ] Thêm nav card CellOff (vhkt.html)
```html
<!-- Sau card MLL, trước card SLA -->
<div class="col">
    <div class="card shadow-sm nav-card" data-table="mll_cell" onclick="switchTab('mll_cell')"
        style="border-left: 3px solid var(--tblr-purple); --arrow-color: var(--tblr-purple);">
        <div class="nav-card-body">
            <div class="nav-card-count text-purple" id="mllCellCount">0</div>
            <div class="nav-card-label">📡 CellOff</div>
        </div>
    </div>
</div>
```

### 2. [ ] Thêm tab-pane CellOff (vhkt.html)
```html
<!-- Tab CellOff — sau tab MLL -->
<div class="tab-pane d-none" id="tab-mll_cell">
    <div class="tab-info-bar" id="infoBarMllCell">
        <span id="badgeMllCell"><span class="badge bg-secondary-lt">⏳ Đang tải...</span></span>
        <span class="text-muted" id="timeMllCell"></span>
    </div>
    <div class="table-responsive">
        <table class="table table-vcenter table-hover card-table small text-nowrap text-center mb-0"
            id="tableMllCell">
            <thead>
                <tr>
                    <th>Site ID</th>
                    <th class="d-none d-md-table-cell">Cell ID</th>
                    <th>Mạng</th>
                    <th>Cảnh báo</th>
                    <th>Bắt đầu</th>
                    <th>Số phút</th>
                    <th class="d-none d-md-table-cell">Vendor</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>
    <div class="empty py-4 d-none" id="emptyMllCell">
        <p class="empty-title">Không có CellOff nào</p>
        <p class="empty-subtitle text-muted">✅ Tất cả cell đang hoạt động bình thường.</p>
    </div>
</div>
```

### 3. [ ] Cập nhật JS state — thêm mll_cell
```javascript
let tabDataLoaded = { md: false, mpd: false, mll: false, mll_cell: false, vhkt: false };
```

### 4. [ ] Thêm `buildMllCellRow()` function
```javascript
function buildMllCellRow(r) {
    const mins = r.so_phut || 0;
    const minsClass = mins >= 60 ? 'text-danger fw-bold' : (mins >= 30 ? 'text-warning' : '');
    const mang = r.mang || '--';
    const mangColor = mang.includes('Mobi') ? 'bg-blue-lt' 
        : (mang.includes('Vina') ? 'bg-red-lt' 
        : (mang.includes('Viettel') ? 'bg-green-lt' : 'bg-azure-lt'));
    return `<td class="fw-bold">${r.site_id || '--'}</td>`
        + `<td class="d-none d-md-table-cell small">${r.cell_id || ''}</td>`
        + `<td><span class="badge ${mangColor}">${mang}</span></td>`
        + `<td class="small text-start">${r.canh_bao || ''}</td>`
        + `<td class="small">${r.bat_dau || ''}</td>`
        + `<td class="${minsClass}">${mins}</td>`
        + `<td class="d-none d-md-table-cell small">${r.vendor || ''}</td>`;
}
```

### 5. [ ] Cập nhật `loadTabData()` — xử lý mll_cell
```javascript
// Thêm trong switch/if chain:
else if (tabName === 'mll_cell') newRows = rows.map(r => ({ html: buildMllCellRow(r), cls: '' }));
```

### 6. [ ] Cập nhật `refreshSummary()` — hiển thị mll_cell_count
```javascript
document.getElementById('mllCellCount').textContent = d.mll_cell_count || 0;

// Thêm mll_cell vào info bar update:
['md', 'mpd', 'mll', 'mll_cell'].forEach(tab => 
    updateTabInfoBar(tab, d.last_poll, d.status, d.last_alarm_error, d.login_paused)
);
```

### 7. [ ] Cập nhật `updateTabInfoBar()` — thêm mll_cell mapping
```javascript
const badgeMap = { md: 'badgeMd', mpd: 'badgeMpd', mll: 'badgeMll', mll_cell: 'badgeMllCell' };
const timeMap = { md: 'timeMd', mpd: 'timeMpd', mll: 'timeMll', mll_cell: 'timeMllCell' };
```

### 8. [ ] Cập nhật `triggerRefresh()` — reset mll_cell
```javascript
tabDataLoaded = { md: false, mpd: false, mll: false, mll_cell: false, vhkt: false };
```

## Files to Create/Modify
- `templates/vhkt.html` — Nav card, tab pane, JS functions

## Test Criteria
- [ ] 5 nav cards hiển thị đúng (MĐ, MPĐ, MLL, CellOff, SLA)
- [ ] Click CellOff card → hiển thị bảng CellOff
- [ ] Bảng CellOff hiển thị đúng columns
- [ ] Card count update real-time
- [ ] Responsive: mobile ẩn Cell ID + Vendor
- [ ] Empty state hiển thị khi 0 records

---
Next Phase: [phase-04-testing.md](phase-04-testing.md)
