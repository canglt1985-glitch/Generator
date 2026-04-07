# Changelog

## [2026-04-07]
### Added
- Tính năng tính toán hiển thị gộp độ cao Anten theo RAN cho mức Site (DataSite - Vô tuyến)
- Import hàng loạt thông số thực tế (Tilt, Azimuth, Height) từ file Excel cũ vào DataSite.

### Changed
- Cải thiện thiết kế Minimalist cho tab Vô Tuyến: gỡ bỏ tô màu cột công nghệ RAN.
- Tự động đồng bộ cấu hình sửa đổi độ cao Anten trên trình duyệt cho tất cả các Cell cùng loại RAN của Site.
- Sửa lỗi lệch cột hiển thị thông số PCI/PSC và Độ cao Anten.


## [2026-03-31]
### Added
- **Mobile PWA Upgrade**: Chuyển đổi Web-app thành Progressive Web App (PWA) với đầy đủ `manifest.json`, `sw.js` và bộ icon 5G/Viễn thông mới.
- **Standalone Mode**: Hỗ trợ chạy ứng dụng ở chế độ Standalone (mất thanh địa chỉ browser) khi "Thêm vào màn hình chính", mang lại trải nghiệm như app native.
- **Persistent Sessions**: Cấu hình `PERMANENT_SESSION_LIFETIME = 30 ngày` và tự động duy trì đăng nhập (`session.permanent = True`), khắc phục triệt để lỗi thỉnh thoảng bị văng login trên điện thoại.

## [2026-03-15]
### Added
- **VHKT Data Assistant Brief**: Khởi tạo ý tưởng và BRIEF thiết kế cho trợ lý AI tra cứu SQL bằng ngôn ngữ tự nhiên (MCP Assistant), dự kiến dùng Gemini 1.5 Flash.
- **Handover/Recap System v2**: Tối ưu hóa bộ nhớ AI với cấu trúc `.brain/` tách biệt (brain.json + session.json + handover.md), giúp AI phục hồi ngữ cảnh nhanh và chính xác hơn.

## [2026-03-14]
### Added
- **Overlapping Log Resolution**: Tích hợp logic `resolve_overlapping_logs()` tự động so sánh và chỉ giữ lại bản ghi GeneratorLog có thời gian chạy dài nhất khi phát hiện sự chồng lấn thời gian cho cùng 1 trạm.
- **Duplicate Clean-up Script**: Viết script `web-app/scripts/clean_duplicates.py` để quét và dọn dẹp hàng loạt các bản ghi máy phát bị lặp/chồng lấn của năm 2026.

## [2026-03-13]
### Added
- **DataSite Deep Sync (Phase 3-5)**: Hoàn thành parser Excel dùng Pandas để đồng bộ dữ liệu hạ tầng từ file xuất của DataSite.
- **Daily Work Date Filter**: Thêm bộ lọc khoảng ngày (Từ ngày -> Đến ngày) ngay trên Header trang Công việc hàng ngày, hỗ trợ xem và xuất Excel linh hoạt.
- **Generator Overnight Logic**: Tự động tính toán và đánh dấu các ca chạy máy qua đêm (Overnight), tự cộng 24h vào thời gian hoạt động.

### Fixed
- **Duplicate Button Server-side**: Giải quyết triệt để lỗi lặp nút "Thêm" trên môi trường production bằng logic Jinja2 `if` blocks riêng biệt và `trim`.
- **UI Consistency**: Đồng bộ hiển thị badge ngày tháng chuẩn VN (DD/MM/YYYY) trên header Daily Work và cải thiện hiển thị mobile.

## [2026-03-09]
### Added
- **Daily Work UI Consolidate**: Di chuyển toàn bộ nút hành động chính (+ Thêm) lên Page Header trang Công Việc Hàng Ngày.
- **Staff Equipment Permission**: Sửa lỗi nhân viên không có quyền thêm thiết bị lưu động.

### Changed
- Cải thiện độ ổn định của template: Sử dụng `|trim` cho biến `active_tab` và tách biệt hoàn toàn các khối `if` thay vì `elif` để tránh lỗi cache/logic trên một số trình duyệt.

### Fixed
- Lỗi hiển thị nút Thêm trễ hoặc không đúng Tab do logic conditional render bị lặp.

## [2026-03-08]
### Added
- **DataSite Flexible Sync (Phase 1 & 2)**:
  - Thêm form cấu hình tài khoản DataSite (Username/Password) trong tab Admin.
  - Tính năng **SSO Sync**: Tự động lấy tài khoản từ SmartW sang DataSite.
  - Tính năng **Granular Sync**: Cho phép chọn từng hạng mục tài sản để đồng bộ (Thông tin trạm, Hạ tầng, Phụ trợ, Viễn thông).
  - Bảng `SystemConfig` trong Database để lưu trữ cấu hình hệ thống an toàn.
  
### Changed
- Cấu trúc lại giao diện Admin tab DataSite để hiển thị form config và bảng cảnh báo dữ liệu anomaly.
- Cập nhật JavaScript `triggerDatasiteSync` để gửi danh sách `targets` thay vì quét toàn bộ.

### Fixed
- Lỗi Template không cập nhật do stale flask processes.


## [2026-03-06] - DataSite V3: BTS 5G/3G Support & Metadata Unpacking
### Added
- **BTS 5G & 3G Support**: Complete lifecycle support for 5G and 3G equipment (Import from Excel, Database storage, and Dashboard rendering).
- **Metadata Unpacking**: Backend API `/api/datasite/search` now automatically flattens `extra_data` for Station objects, exposing fields like "Vùng phủ", "Nhóm QL", and "Phân lớp CSHT" to the frontend.
- **Extended Station Fields**: Added "Vùng phủ" (🌍), "Nhóm quản lý" (👥), "Phân lớp CSHT" (⭐), and "Phường/Xã" (🏘️) directly to the main Station Info card.

### Changed
- **Dashboard Layout Rollback**: Reverted the "DataSite Dashboard" from horizontal cards back to a vertical top-card structure for better readability and focus.
- **Field Clean-up**: Removed "Giá thuê trạm" from the top info card to eliminate redundancy with the Contract tab.
- **Import Logic**: Enhanced `import_thong_tin_chung` to capture extended metadata into the `extra_data` JSON field.

### Fixed
- **Missing Metadata Bug**: Fixed an issue where "Vùng phủ" and other extended fields appeared empty because they were nested inside the `extra_data` JSON and not unpacked by the API.


## [2026-03-05] - DataSite Category Search & UI Enhancements
### Added
- **Category Search API**: New endpoint `/api/datasite/assets/by_type?type=` to fetch all assets of a specific type (e.g., Máy Lạnh, Máy Phát) across all stations.
- **Category Tab**: DataSite dashboard now has a split-tab design: "Tra Cứu 1 Trạm" and "Tra Cứu Hạng Mục Toàn Mạng".
- **Compact Data Table**: A dense, Excel-like table for category results showing total counts and broken items.
- **Dynamic Headers**: The "Ghi chú" columns dynamically adapt their headers based on the selected asset type (e.g., "Nhiên Liệu" and "ATS" for Máy Phát, or "Dòng tải" for Tủ Nguồn).
- **Inter-Tab Navigation**: Clicking a `site_id` in the category table instantly switches back to the single-station tab and loads that station's profile.

### Changed
- **Status Display**: Removed pill/badge styling for asset statuses in favor of clean color-coded bold text to save space.
- **Table Headers**: Enhanced with `bg-light` and `fw-bold text-dark` for clear column separation.

## [2026-03-04] - Approve UI + NL Tồn Snapshot + Fuel Stock Display
### Added
- **Approve/Reject UI**: Admin dashboard (`/admin/mpd?tab=logs`) now shows status badges (Chờ duyệt/Đã duyệt), source badges (SmartW/Thủ công), action buttons (Approve/Edit/Reject/Delete), and pending count card.
- **NL Tồn Snapshot** (`ton_sau_gd`): New column in `FuelLedger` stores fuel stock level at time of transaction. Auto-calculated via `calc_ton_sau_gd()`, user can override via "NL tồn thực tế" field in modal.
- **Fuel Stock Display**: API `/api/fuel-stock-all` returns batch fuel stock for all stations. VHKT lịch cúp page color-codes station IDs (green/yellow/red) based on fuel level vs estimated need. Click station ID opens fuel detail modal.
- **NL Tồn Column**: Fuel ledger table shows NL tồn after NCC column, color-coded (green >50L, yellow 20-50L, red <20L), visible on all devices including mobile.

### Fixed
- **Duplicate Prevention**: `mfd_import.py` now uses `db.session.flush()` after each insert to prevent batch duplicates. `routes_info.py` Excel import uses `dup_cols` parameter.
- **Edit NL Tồn**: `edit_fuel_ledger` route now correctly saves `nl_ton_thuc_te` as `ton_sau_gd`.

### Changed
- **Column Order**: Fuel ledger table: Trạm→Ngày→Loại→NL→Lượng→Đơn giá→Thành tiền→NCC→**NL tồn**→Người→Ghi chú.
- **Plans Archived**: 5 completed plan folders moved to `plans/_archive/`.

## [2026-02-27] - Fuel Form Overhaul & Edit Modal Fix
### Added
- **Dropdown Transaction Type**: Replaced tab pills with dropdown select (`⛽ ĐỔ NL`, `📥 NHẬP KHO`, `📤 XUẤT KHO`) for clearer transaction type selection.
- **STATION_OUT Auto Price**: Xuất kho auto-fills đơn giá from latest STOCK_IN/DIRECT_BUY entry. Price field is read-only (grey background). Thành tiền auto-calculates.
- **Dimmed Disabled Fields**: Irrelevant fields now dim to 35% opacity + disabled instead of hiding completely, letting users see all fields at a glance.

### Fixed
- **CRITICAL: Edit Modal Blank**: `editFuel()` function was undefined due to a corrupted `SUGGESTED_PRICE` line in the `<script>` block. Fixed the truncated variable declaration.
- **Tab Switching Broken**: Bootstrap `data-bs-toggle="pill"` referenced non-existent tab-pane elements (`#tab-direct`, `#tab-in`, `#tab-out`). Removed Bootstrap pill toggle entirely; `setFuelType()` now manages all UI state.
- **setFuelType Clearing Values**: Removed value-clearing logic from `setFuelType()` — it now only controls visibility and `required` fields, preserving data during edit.
- **NCC Selector Bug**: Changed `input[name="nha_cung_cap"]` to `select[name="nha_cung_cap"]` in `editFuel()` to match actual HTML.

### Changed
- **Backend STATION_OUT Logic**: No longer zeros out `don_gia`/`thanh_tien`. Instead auto-fills price from latest purchase and calculates cost for station tracking.
- **Consistent Templates**: Applied all fixes to both `generator.html` and `power_schedule.html`.

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
