# Phase 03: Backend API Refactor && Phase 04: Playwright Modularization
Status: ⬜ Pending
Dependencies: phase-02

## Objective
Thay đổi endpoint API `/api/datasite/sync_real` để nhận tham số bộ lọc các bảng tài sản cần đồng bộ. Phân rã luồng chạy của file `datasite_scraper.py` thành các block độc lập dựa trên tham số đầu vào.

## Requirements
### Backend API (Flask)
- [ ] Endpoint `/api/datasite/sync_real` thay vì không nhận payload thì giờ nhận mảng JSON: e.g. `["general_info", "infrastructure", "equipment", "telecom_bts"]`.
- [ ] Truyền mảng này xuống hàm `perform_datasite_sync_real(targets=[...])`.

### Scraper Modularization (Playwright)
- [ ] Hiện tại script chạy một mạch từ `export_khu_vuc_to_csv` -> `export_tai_san_to_csv` (modal CSHT & Phụ trợ) -> BTS.
- [ ] Cần viết lại logic để hàm `run_playwright_sync(page, targets)`:
    - [ ] Mở Session 1 lần. Đăng nhập.
    - [ ] `if "general_info" in targets`: chạy block `export_khu_vuc...`.
    - [ ] `if "infrastructure" in targets` hoặc `if "equipment" in targets`: mở modal Xuất dữ liệu Tài Sản và tải.
    - [ ] `if "telecom_bts" in targets`: Mở lại Menu Nghiệp Vụ -> Tài Sản -> Mở modal Xuất BTS 3G/4G/5G.
- [ ] Tái cấu trúc (refactoring) những khối block dài trong `datasite_scraper.py` thành các hàm `download_general_info(page)`, `download_asset_infra(page)`, `download_asset_bts(page)` nhận vào đối tượng Playwright Page để dễ bảo trì hơn.

## Files to Modify
- `datasite_routes.py` (API handler)
- `datasite_scraper.py` (Main Logic Playwright)

---
Next Phase: `phase-05-integration.md`
