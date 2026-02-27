# Phase 01: Scraper Backend (MĐ + MPĐ + MLL + CellOff)
Status: ⬜ Pending
Dependencies: None
Updated: 27/02/2026 15:41 — Thêm MPĐ (center=TTML, filter "gener")

## Objective
Chuyển toàn bộ `scrape_md()`, `scrape_mpd()`, `scrape_mll()` sang endpoint `alarmLog-new/data.htm`.
Thêm `scrape_mll_cell()` cho CellOff.

## Endpoint mới (chung cho tất cả)
```
Base:    /smartw/alarmLog-new/data.htm
Method:  GET (AJAX → jqxGrid render)
Auth:    SSO session cookie
```

## So sánh params theo loại alarm:

| Param | MĐ | MPĐ | MLL Trạm | MLL Cell |
|-------|-----|-----|----------|----------|
| `center` | **POWER** | **TTML** | **MLL** | **MLL** |
| `isDownSite` | *(trống)* | *(trống)* | **Y** | **N** |
| `function` | active | active | active | active |
| **Post-filter** | — | ⚠️ `canh_bao` chứa **"gener"** | — | — |

> 💡 MPĐ: `center=TTML` trả về TẤT CẢ alarm truyền dẫn/thiết bị. 
> Cần **filter sau khi scrape**: chỉ giữ records có cột "Cảnh báo" chứa từ "gener" (generator).

## Implementation Steps

### 1. [ ] Thêm constants mới vào `scraper.py`
```python
# Line ~53, thêm/sửa
GROUP_ALARM = 'PVT Đồng Nai'
TRUNG_TAM = 'MobiFone Đồng Nai'
ALARM_PAGESIZE = 300
MPD_FILTER_KEYWORD = 'gener'   # Filter cảnh báo MPĐ từ center=TTML
```

### 2. [ ] Thêm `_date_range_full()` helper
```python
@staticmethod
def _date_range_full(days_back: int = 30) -> tuple[str, str]:
    """Date range cho alarmLog-new endpoint (format: DD/MM/YYYY HH:mm:ss)."""
    now = datetime.now()
    sdate = (now - timedelta(days=days_back)).strftime('%d/%m/%Y') + ' 00:00:00'
    edate = now.strftime('%d/%m/%Y') + ' 23:59:00'
    return sdate, edate
```

### 3. [ ] Thêm `_build_alarm_url()` — builder chung cho tất cả alarm types
```python
def _build_alarm_url(self, center: str, is_down_site: str = '') -> str:
    """Build alarmLog-new URL.
    Args:
        center: 'POWER' (MĐ), 'TTML' (MPĐ), 'MLL'
        is_down_site: 'Y' (MLL Trạm), 'N' (MLL Cell), '' (MĐ/MPĐ)
    """
    sdate, edate = self._date_range_full(30)
    params = {
        'center': center,
        'sdateF': sdate, 'sdateT': edate,
        'edateF': '', 'edateT': '',
        'bscid': '', 'cellid': '', 'vendor': '', 'district': '',
        'function': 'active',
        'severity': '',
        'network': 'ALL',
        'province': '',
        'team': TEAM_ALARM,
        'group': GROUP_ALARM,
        'alarmType': '', 'statusFinish': '', 'statusView': '',
        'duarationF': '', 'duarationT': '',
        'region': REGION,
        'neType': '', 'ackStatus': '', 'ackUserTk': '',
        'loaiCB': '', 'ip': '', 'active7': '',
        'isDownSite': is_down_site,
        'alarmName': '',
        'isAlarmTicketed': 'N',
        'isAlarmNotTicketed': 'N',
        'tienXuLyFilter': '',
        'trungTamFilter': TRUNG_TAM,
        'filterscount': '0', 'groupscount': '0',
        'pagenum': '0',
        'pagesize': str(ALARM_PAGESIZE),
        'recordstartindex': '0',
        'recordendindex': str(ALARM_PAGESIZE),
    }
    return f'{BASE_URL}/smartw/alarmLog-new/data.htm?' + urlencode(params)
```

### 4. [ ] Viết lại `scrape_md()` — MĐ (center=POWER)
```python
async def scrape_md(self) -> list[dict]:
    """Scrape MĐ (Mất Điện) — alarmLog-new endpoint (center=POWER)."""
    await self._ensure_login()
    url = self._build_alarm_url(center='POWER')
    logger.info(f'SmartW Scrape MĐ: {url}')
    await self._page.goto(url, wait_until='networkidle', timeout=60000)
    await self._handle_session_expired()

    data = await self._parse_table(self._page, MD_COLUMNS)
    self._save_json(data, 'md.json')
    logger.info(f'SmartW Scrape MĐ: ✅ {len(data)} records')
    return data
```

### 5. [ ] Viết lại `scrape_mpd()` — MPĐ (center=TTML + filter "gener")
```python
async def scrape_mpd(self) -> list[dict]:
    """Scrape MPĐ (Máy Phát Điện) — alarmLog-new endpoint (center=TTML).
    Filters: chỉ giữ records có cảnh báo chứa 'gener' (generator).
    """
    await self._ensure_login()
    url = self._build_alarm_url(center='TTML')
    logger.info(f'SmartW Scrape MPĐ: {url}')
    await self._page.goto(url, wait_until='networkidle', timeout=60000)
    await self._handle_session_expired()

    all_data = await self._parse_table(self._page, MPD_COLUMNS)
    
    # Filter: chỉ giữ alarm có cảnh báo chứa "gener" (generator)
    data = [r for r in all_data 
            if MPD_FILTER_KEYWORD in (r.get('canh_bao') or '').lower()]
    
    logger.info(f'SmartW Scrape MPĐ: {len(all_data)} raw → {len(data)} after filter "{MPD_FILTER_KEYWORD}"')
    self._save_json(data, 'mpd.json')
    logger.info(f'SmartW Scrape MPĐ: ✅ {len(data)} records')
    return data
```

### 6. [ ] Viết lại `scrape_mll()` — MLL Trạm (center=MLL, isDownSite=Y)
```python
async def scrape_mll(self) -> list[dict]:
    """Scrape MLL Trạm — alarmLog-new endpoint (isDownSite=Y)."""
    await self._ensure_login()
    url = self._build_alarm_url(center='MLL', is_down_site='Y')
    logger.info(f'SmartW Scrape MLL Trạm: {url}')
    await self._page.goto(url, wait_until='networkidle', timeout=60000)
    await self._handle_session_expired()

    data = await self._parse_table(self._page, MLL_NEW_COLUMNS)
    self._save_json(data, 'mll.json')
    logger.info(f'SmartW Scrape MLL Trạm: ✅ {len(data)} records')
    return data
```

### 7. [ ] Thêm `scrape_mll_cell()` — MLL Cell (center=MLL, isDownSite=N)
```python
async def scrape_mll_cell(self) -> list[dict]:
    """Scrape MLL Cell — alarmLog-new endpoint (isDownSite=N)."""
    await self._ensure_login()
    url = self._build_alarm_url(center='MLL', is_down_site='N')
    logger.info(f'SmartW Scrape MLL Cell: {url}')
    await self._page.goto(url, wait_until='networkidle', timeout=60000)
    await self._handle_session_expired()

    data = await self._parse_table(self._page, MLL_CELL_COLUMNS)
    self._save_json(data, 'mll_cell.json')
    logger.info(f'SmartW Scrape MLL Cell: ✅ {len(data)} records')
    return data
```

### 8. [ ] Cập nhật/Thêm Column Maps
> ⚠️ Cần verify sau scrape thử lần đầu — endpoint mới có thể khác columns.

```python
# MĐ columns — GIỮ NGUYÊN MD_COLUMNS hiện tại (verify lại header names)

# MPĐ columns — GIỮ NGUYÊN MPD_COLUMNS hiện tại (verify lại header names)

# MLL Trạm columns (alarmLog-new — center=MLL, isDownSite=Y)
MLL_NEW_COLUMNS = {
    'Site ID': 'site_id',
    'Tên trạm': 'ten_tram',
    'Cảnh báo': 'canh_bao',
    'Bắt đầu': 'bat_dau',
    'Kết thúc': 'ket_thuc',
    'Số phút': 'so_phut',
    'Mạng': 'mang',
    'Cấp 1': 'nguyen_nhan_1',
    'Cấp 2': 'nguyen_nhan_2',
    'Cấp 3': 'nguyen_nhan_3',
    'Tổ viễn thông': 'to_vt',
    'Vendor': 'vendor',
}

# MLL Cell columns (alarmLog-new — center=MLL, isDownSite=N)
MLL_CELL_COLUMNS = {
    'Site ID': 'site_id',
    'Cell ID': 'cell_id',
    'BSC ID': 'bsc_id',
    'Cảnh báo': 'canh_bao',
    'Bắt đầu': 'bat_dau',
    'Kết thúc': 'ket_thuc',
    'Số phút': 'so_phut',
    'Mạng': 'mang',
    'Vendor': 'vendor',
    'Tổ viễn thông': 'to_vt',
}
```

### 9. [ ] Cập nhật `load_cached_data()` filenames
```python
filenames = {
    'md': 'md.json',
    'mpd': 'mpd.json',
    'mll': 'mll.json',
    'mll_cell': 'mll_cell.json',   # NEW
    'vhkt': 'vhkt.json'
}
```

### 10. [ ] Xóa constants cũ không còn dùng
```python
# XÓA: TEAM_MLL = 'MBF_MN_DONG_NAI_PVT_TVT3'  (endpoint rp-site-v2 không còn dùng)
# GIỮ:  PROVINCE = 'Tỉnh Đồng Nai'             (VHKT vẫn dùng)
```

### 11. [ ] Cập nhật `run_scrape_sync()` — thêm 'mll_cell' vào default tables
```python
if tables is None:
    tables = ['md', 'mpd', 'mll', 'mll_cell']

# Thêm xử lý:
if 'mll_cell' in tables:
    results['mll_cell'] = await scraper.scrape_mll_cell()
```

## Files to Create/Modify
- `smartw/scraper.py` — Constants, URL builder, all scrape functions, column maps

## Test Criteria
- [ ] `scrape_md()` dùng endpoint mới (center=POWER), trả data OK
- [ ] `scrape_mpd()` dùng endpoint mới (center=TTML), filter "gener" hoạt động
- [ ] `scrape_mll()` dùng endpoint mới (isDownSite=Y), trả data OK
- [ ] `scrape_mll_cell()` trả data riêng (isDownSite=N)
- [ ] Tất cả JSON files lưu đúng
- [ ] Column maps khớp với headers thực tế từ SmartW

## Notes
- **MPĐ filter cực kỳ quan trọng**: `center=TTML` trả TẤT CẢ alarm thiết bị,
  phải filter `canh_bao.lower()` chứa "gener" → chỉ lấy generator alarms
- Column maps có thể cần adjust — verify ở Phase 04
- `_build_alarm_url()` dùng chung cho tất cả 4 loại alarm

---
Next Phase: [phase-02-api-routes.md](phase-02-api-routes.md)
