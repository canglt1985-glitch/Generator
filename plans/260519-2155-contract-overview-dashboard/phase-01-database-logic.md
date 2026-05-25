# Phase 01: Database & Logic Engine
Status: ⬜ Pending
Dependencies: None

## Objective
Thêm field `status` vào bảng contracts trên Supabase và tạo contract checking engine (utils) để tính toán 6 điều kiện trên client-side.

## Implementation Steps

### 1. Supabase Migration — Thêm cột `status`
- [ ] Thêm cột `status` (text) vào bảng `contracts`
- [ ] Giá trị mặc định: `NULL` (chưa phân loại)
- [ ] Giá trị cho phép: `dong_y_chua_pl` | `dang_dam_phan` | `da_hoan_tat` | `tam_dung`

```sql
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS status text DEFAULT NULL;

COMMENT ON COLUMN contracts.status IS 
  'Trạng thái thủ công: dong_y_chua_pl, dang_dam_phan, da_hoan_tat, tam_dung';
```

### 2. Tạo Contract Checking Engine
- [ ] Tạo file `src/utils/contractChecks.js`
- [ ] Implement 6 hàm check:

```
contractChecks.js
├── checkExpiry(contract)        → { status: 'expired'|'expiring_6m'|'expiring_12m'|'valid', days: N }
├── checkPriceFrame(contract)    → { inFrame: boolean, diff: number, percent: number }
├── checkAccountMatch(contract)  → { matched: boolean, holder: string, contractor: string }
├── checkPaymentStatus(contract) → { paid: boolean, paidUntil: date, overdueDays: N }
├── getContractFlags(contract)   → ['expired', 'out_of_frame', 'account_mismatch', 'unpaid', ...]
└── FILTER_OPTIONS               → Array of { key, label, icon, color, countFn }
```

### 3. Logic chi tiết từng check

**checkExpiry:**
```
ngay_ket_thuc = contract.dates.ngay_ket_thuc_hd
if ngay_ket_thuc < NOW       → 'expired'
if ngay_ket_thuc < NOW + 6m  → 'expiring_6m'  
if ngay_ket_thuc < NOW + 12m → 'expiring_12m'
else                         → 'valid'
```

**checkPriceFrame:**
```
tong_khung = SUM of all cost_details values (skip "-" and null)
gia_thue = contract.financials.gia_thue_co_vat
inFrame = gia_thue <= tong_khung
diff = gia_thue - tong_khung
```

**checkAccountMatch:**
```
holder = TRIM(contract.bank_info.chu_tai_khoan)
contractor = contract.contractor_info.chu_the_hop_dong
matched = contractor.toLowerCase().includes(holder.toLowerCase())
```
> Lưu ý: HĐ đồng sở hữu "Nguyễn Văn A – Trần Thị B", TK chỉ "Nguyễn Văn A" → vẫn matched

**checkPaymentStatus:**
```
da_tt_den = contract.financials.da_thanh_toan_den
paid = da_tt_den >= NOW
overdueDays = daysBetween(da_tt_den, NOW)
```

### 4. Constants — Bảng hạng mục khung giá
- [ ] Tạo file `src/utils/contractConstants.js`
- [ ] Danh sách 21 hạng mục cost_details

```js
export const COST_DETAIL_KEYS = [
  'mat_bang', 'phong_mfd', 'be_dat_mpd',
  'cot_anten_mat_dat_tren_35m', 'cot_anten_mat_dat_duoi_35m',
  'cot_anten_tren_mai', 'phong_may_mat_dat', 'phong_may_tren_mai',
  'be_shelter_co_coc', 'be_shelter_khong_coc',
  'be_mong_tu_outdoor_co_coc', 'be_mong_tu_outdoor_khong_coc',
  'bao_ve_pccc', 'dieu_hoa_2_may',
  'ht_dien_trong_nha', 'ht_dien_ngoai_tren_150m',
  'tiep_dat_chong_set',
  'mpd_6_8_kva', 'mpd_8_10_kva', 'mpd_10_12_kva',
  'giam_tru_dung_chung'
];

export const FILTER_OPTIONS = [
  { key: 'all',              label: 'Tất cả',              icon: '📋', color: 'slate' },
  { key: 'can_gia_han',      label: 'Cần gia hạn',         icon: '⚠️', color: 'amber' },
  { key: 'dong_y_chua_pl',   label: 'Đồng ý, chưa PL',    icon: '👍', color: 'blue' },
  { key: 'da_hoan_tat',      label: 'Đã hoàn tất',         icon: '✅', color: 'emerald' },
  { key: 'ngoai_khung_gia',  label: 'Ngoài khung giá',     icon: '💰', color: 'orange' },
  { key: 'lech_tai_khoan',   label: 'Lệch tài khoản',     icon: '🏦', color: 'purple' },
  { key: 'chua_thanh_toan',  label: 'Chưa thanh toán',     icon: '💳', color: 'red' },
];
```

### 5. Cập nhật fetch query
- [ ] Bổ sung select `status` trong `fetchContracts()` của ContractDashboard.jsx
- [ ] Đảm bảo lấy đủ: `cost_details`, `bank_info`, `contractor_info`

### 6. Unit test logic (manual verify)
- [ ] Verify checkExpiry với DNIDGI29 (hết 02/2027)
- [ ] Verify checkPriceFrame với DNISRA00 (5M vs 4.356M → ngoài khung)
- [ ] Verify checkAccountMatch với DNICMY02 (đồng sở hữu → lệch)

## Files to Create/Modify
- `src/utils/contractChecks.js` — **NEW** Core logic engine
- `src/utils/contractConstants.js` — **NEW** Constants & filter options
- `src/pages/ContractDashboard.jsx` — MODIFY fetch query

## Test Criteria
- [ ] `getContractFlags(contract)` trả về đúng mảng flags
- [ ] 303/359 trạm ngoài khung giá (match SQL query)
- [ ] 40/359 trạm lệch tài khoản (match SQL query)
- [ ] 46/359 trạm hết hạn (match SQL query)

---
Next Phase: → [phase-02-alert-cards-filters.md](./phase-02-alert-cards-filters.md)
