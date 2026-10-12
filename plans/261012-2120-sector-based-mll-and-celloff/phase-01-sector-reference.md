# Phase 01: Sector Reference Mapping from Datacells

Status: ✅ Complete
Dependencies: None

## Objective
Trích xuất toàn bộ dữ liệu từ bảng `datacells` và ánh xạ với `datasites` để tạo ra file tham chiếu tập sector chuẩn:
- Lưu tại `backend/data/site_sectors.json` và `tvt3_v2/src/data/site_sectors.json`.
- Hỗ trợ tra cứu bằng cả `site_id` (mã mới: `DNICMY09`) và `site_id_old` (mã cũ: `DNCM25`), cũng như mã gốc sau khi bỏ hậu tố công nghệ (`L`, `UL`, `N`).
- Lưu trữ danh sách sector cấu hình thực tế cho từng công nghệ (`3G`, `4G`, `5G`).

## Requirements
### Functional
- [ ] Viết script `scripts/export_site_sectors.py` để kéo toàn bộ `datacells` từ Supabase.
- [ ] Ánh xạ theo cả mã trạm mới (`site_id`) và mã trạm cũ (`site_id_old`).
- [ ] Lưu tập sector dưới dạng mảng sorted, ví dụ:
  ```json
  "DNICMY09": {
    "4G": ["A", "B", "C"],
    "3G": ["A", "B", "C"]
  },
  "DNCM25": {
    "4G": ["A", "B", "C"],
    "3G": ["A", "B", "C"]
  },
  "DNILKH00": {
    "4G": ["A", "B", "C", "D", "E"]
  }
  ```
- [ ] Đảm bảo ghi đồng bộ vào 2 vị trí:
  - `backend/data/site_sectors.json`
  - `tvt3_v2/src/data/site_sectors.json`

## Implementation Steps
1. [ ] Tạo file script `scripts/export_site_sectors.py`.
2. [ ] Chạy script tạo dữ liệu JSON và kiểm tra tính toàn vẹn (đủ ~300+ trạm TVT3).
3. [ ] Tích hợp cập nhật `site_sectors.json` vào luồng import/sync định kỳ nếu có cập nhật cell mới.

## Files to Create/Modify
- `scripts/export_site_sectors.py` - Script trích xuất và sinh JSON
- `backend/data/site_sectors.json` - File dữ liệu cho Python backend
- `tvt3_v2/src/data/site_sectors.json` - File dữ liệu cho React frontend

## Test Criteria
- [ ] Chạy script không báo lỗi.
- [ ] Kiểm tra các trạm tiêu biểu:
  - `DNICMY09` / `DNCM25` có đủ 4G: `['A', 'B', 'C']`, 3G: `['A', 'B', 'C']`.
  - `DNILKH00` có đủ 4G: `['A', 'B', 'C', 'D', 'E']`.
  - `DNIXDI00` có đủ 4G: `['A', 'B', 'C', 'D']`.
