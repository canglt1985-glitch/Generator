# Changelog - Project VT3-VHKT

## [2026-04-20]
### Added
- **Brainstorm: VHKT Enterprise (VEE):** Hoàn thành buổi thảo luận chiến lược về dự án thế hệ mới.
- **Tài liệu:** Tạo file `docs/VHKT_ENTERPRISE_PLAN.md` quy hoạch chi tiết về MCP, Database (quy mô CB điện/Cáp quang) và tích hợp SmartW.
### Changed
- **Quy hoạch:** Thống nhất lộ trình "đập đi xây mới" để chuẩn hóa cho nhiều Tổ Viễn Thông.

## [2026-04-19]
### Fixed
- **Bảo mật (Security):** Vá lỗi thiếu CSRF Token cho toàn bộ Form trong trang Công Việc Hàng Ngày (bao gồm cả các tab phụ: Tồn tại, Thiết bị, Lịch cúp điện). Fix triệt để lỗi "Bad Request: CSRF token missing".
### Changed
- **Refactor:** Tách core logic xử lý DataSite từ `app.py` sang `datasite_service.py` để tối ưu hóa mã nguồn.
- **Git:** Commit và Push 8 file quan trọng (templates, service mới, tài liệu recap) lên GitHub `main`.

## [2026-04-18]
### Added
- **Site ID Mapping:** Triển khai cơ chế Mapping 2 chiều (ID cũ ↔ ID mới) trên toàn hệ thống.
- **UI Improvements:** Tạo macro `site_id_badge` hiển thị song song 2 ID với màu sắc phân biệt (xanh đậm cho ID chính, xám cho ID phụ) giúp kỹ thuật dễ tra cứu.
- **Logic:** Thêm `site_map_reverse` vào context toàn cục để xử lý dữ liệu từ SmartW API (vốn sử dụng ID mới).

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
