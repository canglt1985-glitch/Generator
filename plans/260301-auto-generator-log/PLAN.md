# 📝 PLAN: Auto Import Thời Gian Chạy Máy Phát Điện

**Ngày:** 2026-03-01  
**Tham chiếu:** [BRIEF.md](./BRIEF.md)  
**Trạng thái:** ⏳ Chờ thực hiện

---

## Tổng quan

Tự động scrape dữ liệu chạy máy phát điện từ SmartW Reports API → lọc → tính toán → import vào GeneratorLog.
Dữ liệu bất thường đánh dấu `pending` để admin review/approve.

---

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | Database Schema | ⬜ | `models.py` |
| 02 | Scraper MFĐ Reports | ⬜ | `smartw/scraper.py` |
| 03 | Import Logic | ⬜ | `generator/mfd_import.py` (MỚI) |
| 04 | Worker + Scheduler | ⬜ | `smartw/worker.py`, `app.py` |
| 05 | UI Approve/Reject | ⬜ | `templates/generator.html`, `generator/routes.py` |
| 06 | Test | ⬜ | Manual test |

---

## Phase 01: Database Schema

### Mục tiêu
Thêm 3 fields vào `GeneratorLog` để hỗ trợ auto-import + approval workflow.

### Thay đổi

**File:** `web-app/models.py`

```python
class GeneratorLog(db.Model):
    # ... existing fields ...
    
    # NEW: Auto-import support
    status = db.Column(db.String(20), default='approved')  # approved / pending / rejected
    source = db.Column(db.String(20), default='manual')    # manual / smartw
    smartw_alarm_id = db.Column(db.String(100))            # Unique alarm ID (chống duplicate)
```

### Migration
- Thêm columns với default values → hiện tại dùng `db.create_all()` nên tự migrate.
- Records cũ sẽ có `status=NULL` → coi như `approved`.

### Lưu ý
- Query hiện có cần update: khi hiển thị bảng chạy máy, filter `status != 'rejected'`
- Records manual (nhập tay) giữ `source='manual'`, `status='approved'`

---

## Phase 02: Scraper MFĐ Reports

### Mục tiêu
Thêm method `scrape_mfd_reports()` vào SmartWScraper để lấy data từ `alarm/site/data.htm?type=MFD`.

### Thay đổi

**File:** `web-app/smartw/scraper.py`

```python
async def scrape_mfd_reports(self, date_str: str = None) -> list[dict]:
    """Scrape MFĐ Reports — alarm/site/data.htm endpoint.
    Returns completed generator events with start + end times.
    
    Args:
        date_str: Date to scrape (format: DD/MM/YYYY). Default: yesterday.
    """
    await self._ensure_login()
    url = self._build_mfd_report_url(date_str)
    
    # Fetch JSON via browser (keeps SSO cookies)
    result = await self._page.evaluate('''
        async (url) => {
            const res = await fetch(url, { credentials: "include" });
            return await res.text();
        }
    ''', url)
    
    # Parse SmartW JSON format: [{TotalRows}, {strWhere}, {sort...}, {Rows: [...]}]
    parsed = json.loads(result)
    rows = []
    for item in parsed:
        if isinstance(item, dict) and 'Rows' in item:
            rows = item['Rows']
            break
    
    # Filter: only generator alarms
    data = [r for r in rows 
            if 'generat' in (r.get('alarmName') or '').lower()]
    
    self._save_json(data, 'mfd_reports.json')
    return data


def _build_mfd_report_url(self, date_str: str = None) -> str:
    """Build alarm/site/data.htm URL for MFĐ reports."""
    if not date_str:
        from datetime import datetime, timedelta
        yesterday = datetime.now() - timedelta(days=1)
        date_str = yesterday.strftime('%d/%m/%Y')
    
    params = {
        'type': 'MFD', 'level': 'SITE',
        'region': '', 'dept': '',
        'team': TEAM_ALARM,
        'province': '', 'district': '',
        'minuteNumber': '', 'ipAddress': '',
        'sdate': f'{date_str} 00:00',
        'edate': f'{date_str} 23:59',
        'siteid': '',
        'filterscount': '0', 'groupscount': '0',
        'pagenum': '0', 'pagesize': '300',
        'recordstartindex': '0', 'recordendindex': '300',
    }
    return f'{BASE_URL}/smartw/alarm/site/data.htm?' + urlencode(params)
```

### Date format parsing
SmartW `sdate` trả: `"Feb 28, 2026 4:31:44 PM"` → cần parse:
```python
from datetime import datetime
dt = datetime.strptime(sdate, '%b %d, %Y %I:%M:%S %p')
```

---

## Phase 03: Import Logic

### Mục tiêu
Module xử lý: parse SmartW data → classify → calculate → insert GeneratorLog.

### File mới: `web-app/generator/mfd_import.py`

```python
def import_mfd_data(raw_data: list[dict]) -> dict:
    """
    Process raw SmartW MFĐ records → insert into GeneratorLog.
    
    Returns: {imported: int, pending: int, skipped: int, duplicates: int}
    """
    
    # For each record:
    # 1. Parse sdate/edate
    # 2. Check duration (skip < 10min)
    # 3. Classify: normal vs abnormal  
    # 4. Check duplicate (smartw_alarm_id)
    # 5. Lookup GeneralInfo (dinh_muc, loai_nhien_lieu, may_phat_dien)
    # 6. Calculate: nhien_lieu_tieu_hao, don_gia (PVOil ÷ 1.08), thanh_tien
    # 7. Insert GeneratorLog
```

### Classify logic (from BRIEF):
```python
def classify_event(start_hour, end_hour, duration_min):
    if duration_min < 10:
        return 'skip'
    # Overnight OK: start >= 21h AND end <= 7h AND duration <= 600min
    if start_hour >= 21 and end_hour <= 7 and duration_min <= 600:
        return 'approved'
    if duration_min <= 720:  # <= 12h
        return 'approved'
    return 'pending'
```

### Price calculation:
```python
from fuel_price import get_fuel_prices

def get_pretax_price(fuel_type):
    """Get PVOil price ÷ 1.08 (trước VAT)."""
    prices = get_fuel_prices()
    if 'Xăng' in (fuel_type or ''):
        return round(prices.get('xang_ron95', 0) / 1.08)
    else:
        return round(prices.get('dau_do', 0) / 1.08)
```

### GeneralInfo lookup:
```python
def get_station_info(id_tram):
    """Lookup GeneralInfo for a station."""
    info = GeneralInfo.query.filter_by(id_tram=id_tram).first()
    if info:
        return {
            'dinh_muc': info.dinh_muc or 0,
            'loai_nhien_lieu': info.loai_nhien_lieu or 'Dầu',
            'may_phat_dien': info.may_phat_dien or '',
            'loai_may': info.loai_may or '',
            'cong_suat_may': '',  # From GeneralInfo if available
        }
    return None  # Station not found → flag as pending
```

### Full calculation per record:
```python
thoi_gian_hours = duration_min / 60
nhien_lieu = thoi_gian_hours * dinh_muc
don_gia = get_pretax_price(loai_nhien_lieu)  # PVOil ÷ 1.08
thanh_tien = round(nhien_lieu * don_gia)
```

---

## Phase 04: Worker + Scheduler

### Mục tiêu
Thêm worker function `run_mfd_import_poll()` và scheduler job 6 AM hàng ngày.

### Thay đổi

**File:** `web-app/smartw/worker.py`

```python
def run_mfd_import_poll():
    """Daily MFĐ reports scrape + auto-import.
    Called by APScheduler at 6:00 AM.
    Scrapes yesterday's data, imports into GeneratorLog.
    """
    # 1. Get scraper (reuse persistent session)
    # 2. Call scraper.scrape_mfd_reports(yesterday)
    # 3. Call import_mfd_data(data) with Flask app context
    # 4. Log results
```

**File:** `web-app/app.py`

```python
# Add scheduler job
scheduler.add_job(
    id='mfd_import_daily',
    func=run_mfd_import_poll,
    trigger='cron', hour=6, minute=0
)
```

### API endpoint cho manual trigger:

**File:** `web-app/generator/routes.py` hoặc `core/routes.py`

```python
@app.route('/api/mfd-import', methods=['POST'])
@login_required
@admin_required
def api_mfd_import():
    """Manually trigger MFĐ import for a specific date."""
    date_str = request.json.get('date')  # DD/MM/YYYY
    # Run import
    # Return results
```

---

## Phase 05: UI Approve/Reject

### Mục tiêu
Hiển thị pending records trong bảng chạy máy, cho phép admin approve/edit/reject.

### Thay đổi

**File:** `web-app/templates/generator.html` (hoặc `admin_mpd.html` sau khi restructure)

1. **Highlight pending rows:** Background vàng/cam cho `status='pending'`
2. **Badge:** Hiển thị 🟡 Pending / ✅ Approved / 🔴 Rejected
3. **Action buttons:** 
   - ✅ Approve (set status=approved)
   - ✏️ Edit (mở modal sửa thời gian → approve)
   - ❌ Reject (set status=rejected, ẩn khỏi view)

**File:** `web-app/generator/routes.py`

```python
@generator_bp.route('/generator/approve/<int:id>', methods=['POST'])
@login_required
@admin_required
def approve_log(id):
    log = GeneratorLog.query.get_or_404(id)
    log.status = 'approved'
    # Recalculate if times were edited
    db.session.commit()
    
@generator_bp.route('/generator/reject/<int:id>', methods=['POST'])  
@login_required
@admin_required
def reject_log(id):
    log = GeneratorLog.query.get_or_404(id)
    log.status = 'rejected'
    db.session.commit()
```

### Query update:
```python
# Existing queries for GeneratorLog need:
.filter(GeneratorLog.status != 'rejected')  # or is NULL (legacy records)
```

---

## Phase 06: Test

- [ ] Scrape MFĐ reports cho ngày 28/02 → 7 records
- [ ] Filter < 10 phút → 3 bị loại, 4 còn lại
- [ ] Classify: tất cả 4 → approved (kể cả DNXL49 qua đêm)
- [ ] Calculate: nhien_lieu, don_gia trước VAT, thanh_tien đúng
- [ ] Duplicate check: chạy lại → 0 new imports
- [ ] Pending record: admin approve/edit/reject hoạt động
- [ ] Scheduler: 6 AM trigger tự động

---

## Thứ tự thực hiện

```
1. Phase 01: Thêm 3 fields vào GeneratorLog model
2. Phase 02: Thêm scrape_mfd_reports() vào scraper
3. Phase 03: Tạo mfd_import.py (core logic)
4. Phase 04: Worker + Scheduler + API trigger  
5. Phase 05: UI approve/reject
6. Phase 06: Test toàn bộ
7. Commit + Deploy
```

---

## Files tổng hợp

| File | Thay đổi |
|------|----------|
| `models.py` | Thêm 3 fields: status, source, smartw_alarm_id |
| `smartw/scraper.py` | Thêm `scrape_mfd_reports()` + `_build_mfd_report_url()` |
| `generator/mfd_import.py` | **MỚI** — Import logic, classify, calculate |
| `smartw/worker.py` | Thêm `run_mfd_import_poll()` |
| `app.py` | Thêm scheduler job 6AM + API endpoint |
| `generator/routes.py` | Thêm approve/reject routes |
| `templates/generator.html` | Highlight pending, action buttons |
