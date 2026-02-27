# Changelog

## [2026-02-27] - Payment Tab Enhancement & Modal Fix
### Added
- **Payment Group Cards**: 2 summary cards (Chi Phí Mua Ngoài, Chi Phí CX222) showing cutoff date, paid amount, remaining balance.
- **Payment Group Modal**: Input modal for updating payment info (date, amount, notes). Accessible by ALL logged-in users.
- **Auto-Calc Suggestion**: When selecting a date in the modal, app auto-calculates total expenses and suggests remaining amount. Shows "Đã TT rồi" if date ≤ last paid date.
- **API Endpoint**: `GET /payment-group/calc?group=&den_ngay=` — calculates total CP minus already paid.
- **API Endpoint**: `POST /payment-group/save` — saves payment group data to JSON file.

### Changed
- **Payment Table**: Removed redundant "Đã TT" and "Còn lại" columns (now shown in summary cards).
- **Modal Placement**: All modals moved to `layout.html` (body-level) to avoid container clipping.

### Fixed
- **Jinja2 UndefinedError**: Restored `pr`/`da_tt` variables accidentally removed during column cleanup.
- **Modal Backdrop Freeze**: Modal inside `{% block content %}` was clipped by `container-xl`. Moved to `layout.html`.
- **JS Timing Bug**: Scripts in block content run before layout.html modals parse. Wrapped in `DOMContentLoaded`.
- **Modal Hide Error**: `bootstrap.Modal.getInstance()` null check added before `.hide()`.

## [2026-02-14] - UI Compacting & Generator Performance
### Added
- **Deferred Query Loading**: Generator route only queries admin tabs (Chạy Máy, Thông Tin) when user navigates to them. Saves 2+ DB queries on normal page loads.
- **Hybrid Tab Switching**: Admin tabs redirect with `?tab=` for server data; main tabs switch instantly client-side.

### Changed
- **Zero-Whitespace Layout**: `page-body` padding → 0, `page-header` margin → 0, desktop navbar slimmed across all 3 pages (VHKT, Generator, Daily Work).
- **Generator Header**: Restructured admin tools — removed empty `col-md-6` for non-admin users, reduced row gap.
- **Nav Card Padding**: Reduced to `0.15rem` on both VHKT and Generator pages.
- **Toolbar Spacing**: All `mb-3` between toolbars and tables → `mb-1`.
- **Expense Tab**: "Người Chi" column moved to first position.
- **Payment Tab**: "Cần CK" renamed to "Tổng cộng"/"TC" (mobile).

### Fixed
- **Tab Navigation**: Replaced Bootstrap Tab API with direct DOM manipulation to fix switching bugs on Generator page.

## [2026-02-14] - VHKT UI Restructuring & Navigation Overhaul
### Added
- **5 Nav Cards**: Replaced summary cards + tab bar with 5 clickable nav cards (MĐ, MPĐ, MLL, SLA, Refresh) on a single row.
- **Card-Count Sync**: After table loads, nav card count syncs with actual `rows.length` — no more mismatch.
- **Timestamp Label**: Header badge now shows "Cập nhật lúc HH:MM" for clarity.
- **Color-Coded Tables**: Số phút (green <30, orange 30-59, red ≥60). MLL Mạng badges (Mobi=blue, Vina=red, Viettel=green). Cause badges (azure).

### Changed
- **Card Colors**: MĐ = yellow (warning), MPĐ = green (success), MLL = red (danger).
- **Tab Rename**: VHKT tab → SLA (UI only, backend API unchanged).
- **Refresh Auth**: `/api/smartw/trigger` no longer requires login — always uses admin config credentials.
- **Sidebar**: Removed duplicate 📡 emoji from VHKT SmartW link (kept FontAwesome icon only).

### Removed
- Bootstrap tab bar (replaced by card-based navigation with custom `switchTab()` JS).
- Separate summary cards row (merged into nav cards).

## [2026-02-11] - Reports Redesign & Mobile Optimization
### Added
- **Bảng Thanh Toán**: Gộp thống kê Nhân viên + Nhà cung cấp thành 1 bảng duy nhất hiển thị Mua Lẻ, CX222, VNPT-VTL, Chi phí khác, và **Cần CK** (số tiền cần chuyển khoản cho nhân viên).
- **Bộ lọc Tháng/Năm**: Thay thế bộ lọc ngày cũ bằng dropdown Tháng + Năm cho tab Chạy Máy và Báo Cáo.
- **Mobile Responsive CSS**: Thêm `@media` rules cho bảng nhỏ hơn, cột sticky, form xếp dọc trên điện thoại.

### Changed
- **Sổ Nhiên Liệu (Mobile)**: Ẩn form Xuất Excel trên mobile, chỉ hiện nút Tạo. Ẩn cột NCC, Người mua, Ghi chú trên màn hình nhỏ.
- **Admin Panel (Mobile)**: Font chữ bảng nhỏ hơn, cột ID Trạm cố định khi cuộn ngang, bộ lọc tự xếp dọc.
- **Station Summary**: Chỉ hiển thị trạm có phát sinh chi phí khi lọc theo tháng.

### Fixed
- **Sổ Nhiên Liệu**: Tăng limit query từ 20 lên 200 để hiển thị đầy đủ dữ liệu tháng 1.

### Removed
- Bảng thống kê Nhân viên, Nhà cung cấp, và Lũy kế Tháng riêng biệt (đã gộp vào Bảng Thanh Toán).

## [2026-02-11] - Date Range Export
### Added
- **Xuất Excel theo khoảng ngày**: Thêm bộ chọn "Từ ngày — Đến ngày" cho nút Xuất Excel ở tab **Nhiên Liệu** và **Chi Phí Khác** (trang Vận Hành Máy Phát Điện). Không chọn ngày = xuất toàn bộ.

## [2026-01-27] - UX Optimization & Station Intelligence
### Added
- **Station Intelligence Modal**: Direct access to station stats (last refill, last generator run, estimated fuel) by clicking Station IDs.
- **Embedded Deletion Workflow**: Row deletion actions moved into the Station Modal for a cleaner, action-oriented interface in "Mua/Đổ Nhiên Liệu" modules.
- **API Endpoint**: `/api/station-info/<station_id>` for unified station data retrieval.

### Changed
- **Semantic Table Layouts**: Optimized column orders for all operational tables (Schedule, Purchase, Refill, Expenses) to prioritize key operational data.
- **Responsive Improvements**: "Bảng Đổ Nhiên Liệu" now intelligently hides non-essential columns on mobile (showing ID, Date, Amount).
- **Event Handling**: Switched to Event Delegation for UI triggers to ensure stability across dynamic content updates.

### Fixed
- **UI Scripting**: Resolved JavaScript syntax errors in `layout.html` that affected global table filtering.
- **Station Link Stability**: Fixed station ID badges not triggering modals on some pages.


## [2026-01-25] - Automation & Multi-OS Support
### Added
- **Auto Power Outage Fetcher**: Module `fetch_outages.py` to crawl data from EVNSPC (supports batching/filtering).
- **Scheduled Tasks**: Integrated `flask-apscheduler` to automatically sync outages at 5:00 AM daily.
- **Supabase Integration**: Added support for PostgreSQL (Supabase) with dynamic configuration via `.env`.
- **Daily Work Module**: New module for tracking maintenance activities (VHKT, CSHT, Persons-in-charge).
- **Migration Tool**: Script `migrate_to_supabase.py` for one-way sync from local SQLite to Cloud Postgres.

### Changed
- **UI Architecture**: Simplified sidebar (removed redundant links), expanded width for labels.
- **Menu Renaming**: "Lịch Cúp Điện" -> "Vận hành máy phát điện".
- **Tool UI**: Grouped fuel tools under "Nhập thông tin" dropdown; renamed buttons for clarity.

### Fixed
- **UI Breakage**: Fixed mismatched HTML tags in the operation page causing layout collapse.
- **Connection Issues**: Resolved PostgreSQL reserved keyword conflict ("user" table) and IPv6 resolution errors.
- **Form Sync**: Fixed "Chi phí khác" date/project field synchronization.

## [2026-01-24] - V2 Update
### Added
- **Global Power Schedule**: Hiển thị lịch cúp điện toàn bộ các trạm cho mọi user.
- **User Fuel Modals**: Tích hợp nhập phiếu Mua/Đổ nhiên liệu ngay trên trang Lịch Cúp Điện (Modal popup).
- **Admin Fuel Tabs**: Thêm tab quản lý "Mua Nhiên Liệu" và "Đổ Nhiên Liệu" trong Admin Panel.
- **Import Guide**: Tài liệu hướng dẫn import Excel `IMPORT_GUIDE.md`.

### Changed
- **UI Uniformity**: Đồng bộ kích thước các ô tìm kiếm/lọc.
- **Import Logic**: Cải thiện thuật toán tìm cột (Fuzzy matching) để hỗ trợ nhiều định dạng file Excel hơn.
- **Export Logic**: Đảm bảo thứ tự cột trong file Excel xuất ra khớp với giao diện web.
- **UX**: Giữ trạng thái Tab trong Admin Panel sau khi reload/submit form.

### Fixed
- Lỗi import không nhận diện được cột "Thời gian chạy" do sai tên header.
- Lỗi User thường nhìn thấy các menu không được phép truy cập.

## [2026-01-24] - Refactor & Fix
### Added
- **Helper Methods**: Tách logic tính toán Dashboard thành các hàm riêng biệt (`get_dashboard_stats`, `detect_fuel_anomalies`...).

### Changed
- **Code Structure**: Làm gọn Route chính (`index`), code dễ đọc và bảo trì hơn.

### Fixed
- **Dashboard Layout Error**: Sửa lỗi "TypeError" không hiển thị trang chủ sau khi dọn dẹp code.
