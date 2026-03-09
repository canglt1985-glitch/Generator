# Changelog - Project VT3-VHKT

## [2026-03-07]
### Added
- Dự án: DataSite Auto-Scraper (Playwright-based).
- Phase 1: Authentication & SSO handling for DataSite (10.0.35.3).
- Phase 2: Station General Info Scraper (`goto_sdm` -> Export Total).
- Phase 3: Asset Scraper (Modal-based Infrastructure/Equipment export) - *In Progress*.
- Script test độc lập cho scraper: `c:\tmp\test_datasite_assets.py`.

### Changed
- Refactor logic login thành công trên DataSite: Chuyển từ check `#container` sang check `text="TRANG CHỦ"` để ổn định hơn.
- Cải tiến logic điều hướng SDM: Sử dụng locator text Tiếng Việt kết hợp JS fallback để vượt lỗi encoding trên Windows.

### Fixed
- Lỗi AngularJS Dropdown: Sử dụng `select_option(value=...)` thay vì gán `.value` giúp trigger `ng-change` trong DataSite modal.
- Lỗi Timeout Modal: Loại bỏ `wait_for_selector('select')` do vướng nhiều element ẩn, chuyển sang poll bằng JS.

---

## [2026-03-06]
### Added
- Support full lifecycle cho BTS 3G và BTS 5G (Import + Display).
- UI: Card Metadata (extra_data) hiển thị Vùng phủ, Nhóm QL, Phân lớp CSHT.

### Changed
- Refactor: Làm phẳng (flatten) `station.extra_data` ngay tại API Backend `/ds_search`.
- UI Layout: Chuyển Dashboard DataSite về dạng Card dọc (Top-Card) để tối ưu không gian hiển thị.
