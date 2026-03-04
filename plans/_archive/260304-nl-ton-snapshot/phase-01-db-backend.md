# Phase 01: Database + Backend
Status: ⬜ Pending
Dependencies: None

## Objective
Thêm column `ton_sau_gd` vào FuelLedger, auto-calc khi tạo giao dịch.

## Implementation Steps

### Step 1: Thêm column vào Model
**File:** `web-app/models.py` (class FuelLedger, line ~80)

```python
# Thêm sau dòng ghi_chu:
ton_sau_gd = db.Column(db.Float, nullable=True)  # NL tồn snapshot sau giao dịch
```

### Step 2: ALTER TABLE trên database
**Script tạm** hoặc chạy trực tiếp:

```sql
ALTER TABLE fuel_ledger ADD COLUMN IF NOT EXISTS ton_sau_gd FLOAT;
```

### Step 3: Auto-calc `ton_sau_gd` khi tạo giao dịch mới
**File:** `web-app/generator/routes_fuel.py` (function `add_fuel_ledger`, line ~68)

Logic tính:
```
Nếu type = STOCK_IN (nhập kho):
  → ton_sau_gd = NULL (không liên quan đến trạm cụ thể)

Nếu type = DIRECT_BUY hoặc STATION_OUT (đổ cho trạm):
  → Lấy ton_sau_gd gần nhất của id_tram đó
  → Nếu có: ton_sau_gd = ton_truoc + so_luong
  → Nếu không có: tính từ get_audit_data() → ton_real + so_luong

Nếu type = ADJUSTMENT:
  → ton_sau_gd = ton_truoc + so_luong (so_luong có thể âm)
```

Thêm helper function:
```python
def calc_ton_sau_gd(id_tram, so_luong, trans_type):
    """Calculate fuel stock after transaction for a station."""
    if not id_tram or trans_type == 'STOCK_IN':
        return None
    
    # Tìm ton_sau_gd gần nhất của trạm này
    latest = db.session.query(FuelLedger.ton_sau_gd).filter(
        FuelLedger.id_tram == id_tram,
        FuelLedger.ton_sau_gd.isnot(None)
    ).order_by(FuelLedger.ngay.desc(), FuelLedger.id.desc()).first()
    
    if latest and latest[0] is not None:
        ton_truoc = latest[0]
    else:
        # Fallback: tính từ running balance hiện tại
        audit = get_audit_data()
        row = next((r for r in audit if r['id_tram'] == id_tram), None)
        ton_truoc = row['ton_real'] if row else 0
    
    return round(ton_truoc + so_luong, 2)
```

Sửa `add_fuel_ledger()`:
```python
# Sau dòng tạo new_trans, trước db.session.add:
new_trans.ton_sau_gd = calc_ton_sau_gd(id_tram, so_luong, trans_type)

# Nếu user truyền ton_sau_gd từ form (hiệu chỉnh):
user_ton = request.form.get('ton_sau_gd')
if user_ton:
    new_trans.ton_sau_gd = float(user_ton)
```

### Step 4: Backfill data cũ
**Script 1 lần:** Tính ton_sau_gd cho tất cả records cũ (theo thứ tự ngày, per-station).

```python
# Lấy tất cả records có id_tram, sắp xếp theo ngày + id
records = FuelLedger.query.filter(
    FuelLedger.id_tram != '', FuelLedger.id_tram.isnot(None)
).order_by(FuelLedger.ngay.asc(), FuelLedger.id.asc()).all()

# Running balance per station
balance = {}
for r in records:
    sid = r.id_tram
    if sid not in balance:
        balance[sid] = 0
    balance[sid] += (r.so_luong or 0)
    r.ton_sau_gd = round(max(0, balance[sid]), 2)
db.session.commit()
```

## Test Criteria
- [ ] Column `ton_sau_gd` tồn tại trong DB
- [ ] Tạo giao dịch mới → `ton_sau_gd` auto-calc đúng
- [ ] Tạo giao dịch STOCK_IN → `ton_sau_gd` = NULL
- [ ] User override `ton_sau_gd` → lưu đúng
- [ ] Backfill data cũ → tất cả records có `ton_sau_gd`

---
Next Phase: phase-02-frontend-ui.md
