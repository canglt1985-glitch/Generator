# Changelog - Project VT3-VHKT

## [2026-04-29]
### Added
- **Tính năng:** Triển khai Hệ thống quản lý Quỹ tạm ứng cho anh Thái (Fund Management).
- **Cấu trúc:** Bổ sung trường `tong_tien_nhan` vào `payment_groups.json` để theo dõi tiền tạm ứng lũy kế.
- **Giao diện:** Thêm các Card hiển thị Số dư quỹ, Lũy kế phát sinh và Phát sinh mới trên cả trang Chi phí và Báo cáo.
- **Tính toán:** Tự động hóa việc tính toán Số dư = (Tiền tạm ứng - Tiền đã thanh toán toàn thời gian).

### Fixed
- **Lỗi hệ thống:** Sửa lỗi `UnboundLocalError` và `NameError` khi truy cập trang Chi phí bằng cách khởi tạo biến toàn cục.
- **UI/UX:** Đồng bộ hóa giao diện Card thanh toán giữa trang Chi phí và trang Tổng hợp.
- **Label:** Cập nhật các nhãn hiển thị sang "Tổng tiền đã tạm ứng" theo yêu cầu người dùng.

### Changed
- **Logic:** Chuyển mốc tính toán Lũy kế về ngày 01/01/2025 để đảm bảo tính lịch sử.

## [2026-04-23]
### Added
- Thêm kế hoạch nâng cấp [VHKT_ENTERPRISE_PLAN.md](file:///d:/download/VH%20may%20phat%20dien/docs/VHKT_ENTERPRISE_PLAN.md).
- Giao diện Admin mới: `_modals_admin.html`.
- Tài liệu `read_excel.txt`.

### Changed
- Cập nhật giao diện quản lý máy phát điện Admin (`admin_mpd.html`).
- Cấu hình Cloudflared chạy dưới dạng tiến trình ẩn (Manual Process) để đảm bảo ổn định.

### Fixed
- Lỗi kết nối Tunnel do thiếu file cấu hình trong System Profile (xử lý bằng cách chạy thủ công với config của user).

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
