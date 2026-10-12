# Phase 02: Backend Scraper & Worker Logic Upgrade

Status: ✅ Complete
Dependencies: Phase 01 (`site_sectors.json`)

## Objective
Sửa đổi logic phân loại trong `backend/smartw/scraper.py` và lưu trữ trong `backend/smartw_worker.py`:
1. Chuẩn hóa tên trạm khi tra cứu (bóc tách các hậu tố `L`, `UL`, `N`).
2. Xác định Sector của từng cell bị mất sóng.
3. Gom nhóm theo tập hợp Sector: Nếu tất cả các sector cấu hình của công nghệ đó (`A, B, C` hoặc `A, B, C, D, E`) đều có cảnh báo off $\rightarrow$ Thăng hạng thành 1 bản ghi **MLL Trạm** (`mll_tram`).
4. Khắc phục triệt để lỗi demotion trong `smartw_worker.py` (dòng 1084-1085) để không bị ép ngược về `mll_cell`.

## Requirements
### Functional
- [ ] Trong `scraper.py` (`scrape_mll_all`):
  - Load `site_sectors.json` thay thế hoặc bổ trợ cho `site_cell_count.json`.
  - Viết hàm normalize site ID: cắt bỏ đuôi `L` (nếu bắt đầu bằng 4G), `UL` (SRAN), `N` (5G) để lấy base ID tra cứu.
  - Bóc tách sector từ cell code:
    - Nếu có trong sector map thì map theo `cellid`.
    - Fallback: Lấy ký tự cuối cùng của mã cell sau khi loại bỏ tiền tố trạm (vd: `CM4CA` $\rightarrow$ `A`, `CM4CC` $\rightarrow$ `C`).
  - Gom nhóm các cell theo `(site, net_key)`:
    - Thu thập tập các sector bị off: `off_sectors = { c['_sector'] for c in cells }`.
    - Lấy tập các sector cấu hình: `configured_sectors = set(site_sectors.get(base_site, {}).get(net_key, ['A', 'B', 'C']))`.
    - Nếu `configured_sectors.issubset(off_sectors)`:
      - Tạo bản ghi Trạm MLL (`tram_entry`), gán `cellid = None`, `objectReference = None`, `neType = 'ENODEB'` (cho 4G) hoặc `'NODEB'` (cho 3G) hoặc `'GNODEB'` (cho 5G).
      - Đưa vào danh sách `mll_tram`.
      - Loại bỏ toàn bộ các cell này khỏi danh sách `mll_cell`.
- [ ] Trong `smartw_worker.py` (`sync_alarms_to_supabase`):
  - Khi duyệt danh sách `result.get('mll', [])`:
    - Nếu record được gắn cờ `is_promoted_tram` hoặc không có `cellid` và `ne_type != 'CELL'`, giữ nguyên `actual_t = 'mll'`.
    - Không để hàm regex bóc `cellid` từ `objectReference` cũ ép ngược thành `actual_t = 'mll_cell'`.

## Implementation Steps
1. [ ] Sửa `backend/smartw/scraper.py` tại method `scrape_mll_all`.
2. [ ] Sửa `backend/smartw_worker.py` tại hàm `sync_alarms_to_supabase`.
3. [ ] Chạy test thử hàm gom nhóm với mock data các tình huống:
   - Trạm 3 sector rớt cả 3 (`CA`, `CB`, `CC`) $\rightarrow$ Ra 1 dòng MLL Trạm.
   - Trạm 3 sector nhưng có thêm cell khác band (`CA`, `CB`, `CC`, `EA`) $\rightarrow$ Vẫn nhận diện rớt đủ 3 sector A, B, C $\rightarrow$ Ra 1 dòng MLL Trạm.
   - Trạm 3 sector chỉ rớt 1 sector (`CA`) $\rightarrow$ Ra 1 dòng CELL OFF.
   - Trạm 4 sector rớt 3 sector (`CA`, `CB`, `CC`, thiếu `CD`) $\rightarrow$ Ra 3 dòng CELL OFF (chưa đủ 4 sector).

## Files to Create/Modify
- `backend/smartw/scraper.py`
- `backend/smartw_worker.py`

## Test Criteria
- [ ] Scraper chạy không văng exception.
- [ ] Record được lưu đúng `alarm_type: 'mll'` khi đủ tập sector.
