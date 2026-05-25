# Phase 02: Alert Cards & Smart Filters UI
Status: ⬜ Pending
Dependencies: Phase 01 (contractChecks.js)

## Objective
Thêm 6 Alert Cards lên đầu trang `/contracts` và nâng cấp bộ lọc từ search đơn giản → smart filter dropdown như ảnh tham khảo.

## UI Design

### Alert Cards Row (Desktop: 6 cards, Mobile: 2x3 grid)

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ ⚠️  46    │ 👍  —     │ ✅  56    │ 💰  303   │ 🏦  40    │ 💳  288   │
│Cần gia hạn│Đồng ý    │Hoàn tất  │Ngoài khung│Lệch TK  │Chưa TT   │
│  [click]  │chưa PL   │          │   giá    │         │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

Click vào card → Tự động filter danh sách bên dưới

### Smart Filter Bar

```
┌────────────────────────────────────────────────────────────┐
│ 🔍 Tìm mã trạm, chủ nhà...  │  Tình trạng: [Tất cả ▼]  │
│                               │  ├─ ⚠️ Cần gia hạn (46)  │
│                               │  ├─ 👍 Đồng ý, chưa PL   │
│                               │  ├─ ✅ Đã hoàn tất (56)   │
│                               │  ├─ 💰 Ngoài khung (303)  │
│                               │  ├─ 🏦 Lệch TK (40)      │
│                               │  └─ 💳 Chưa TT (288)      │
└────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Install recharts (nếu cần chart sau)
- [ ] `npm install recharts` (optional, chỉ cần nếu Phase 04 thêm chart)

### 2. Tạo component AlertCards
- [ ] Tạo `src/components/contracts/ContractAlertCards.jsx`
- [ ] Props: `{ contracts, onFilterSelect, activeFilter }`
- [ ] Tính count cho mỗi filter dùng `getContractFlags()` từ Phase 01
- [ ] Click card → gọi `onFilterSelect(filterKey)`
- [ ] Active card có border highlight

### 3. Tạo component FilterDropdown
- [ ] Tạo `src/components/contracts/ContractFilterDropdown.jsx`
- [ ] Dropdown menu giống ảnh tham khảo (có icon + count)
- [ ] Props: `{ contracts, activeFilter, onFilterChange }`
- [ ] Hiển thị count bên cạnh mỗi option

### 4. Tích hợp vào ContractDashboard.jsx
- [ ] Thêm state: `activeFilter` (default: 'all')
- [ ] Import + render `ContractAlertCards` phía trên search bar
- [ ] Thay thế search bar cũ bằng layout mới (search + filter dropdown)
- [ ] Nối filter logic: `filteredContracts` phải qua cả search + activeFilter

### 5. Filter logic trong ContractDashboard
- [ ] Kết hợp search text + activeFilter:

```js
const filteredContracts = useMemo(() => {
  let result = contracts;
  
  // 1. Filter by activeFilter
  if (activeFilter !== 'all') {
    result = result.filter(c => {
      const flags = getContractFlags(c);
      return flags.includes(activeFilter);
    });
  }
  
  // 2. Filter by search text
  if (searchTerm.trim()) {
    const q = searchTerm.toLowerCase();
    result = result.filter(c => 
      c.site_id?.toLowerCase().includes(q) ||
      c.contractor_info?.chu_the_hop_dong?.toLowerCase().includes(q) ||
      c.datasites?.site_id_old?.toLowerCase().includes(q)
    );
  }
  
  return result;
}, [contracts, activeFilter, searchTerm]);
```

### 6. Responsive Design
- [ ] Desktop: Cards 1 hàng ngang 6 cái
- [ ] Mobile: Grid 2x3 hoặc scroll ngang
- [ ] Mobile: Filter dropdown full-width
- [ ] Mobile: Ẩn nút Import/Export (giữ nguyên pattern từ Datasites)

### 7. Dark theme consistency
- [ ] Cards background: `bg-white` với left border màu tương ứng
- [ ] Active card: `ring-2 ring-{color}-400`
- [ ] Hover effect: `hover:shadow-md transition`

### 8. Accessibility
- [ ] Card có `role="button"` + `tabIndex={0}`
- [ ] Keyboard navigation (Enter/Space to select)

## Files to Create/Modify
- `src/components/contracts/ContractAlertCards.jsx` — **NEW**
- `src/components/contracts/ContractFilterDropdown.jsx` — **NEW**
- `src/pages/ContractDashboard.jsx` — MODIFY (add cards + filter)

## Test Criteria
- [ ] Click "Cần gia hạn" → chỉ hiển thị 46 trạm hết hạn
- [ ] Click "Ngoài khung giá" → hiển thị 303 trạm
- [ ] Kết hợp filter + search: filter "Lệch TK" + search "DNTN" → chỉ trạm DNTN lệch TK
- [ ] Mobile: Cards hiển thị gọn, scroll OK

---
Next Phase: → [phase-03-table-detail.md](./phase-03-table-detail.md)
