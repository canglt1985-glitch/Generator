# Changelog

## [2026-10-05] - Tối Ưu Phân Luồng Tồn Tại, Chuẩn Hóa Mã VT/TS B4 & Dọn Rác Toàn Diện

### Added
- **Xuất File B4 Chuyên Môn Bằng ExcelJS (`b4RepairExporter.js`):** Nâng cấp sang thư viện ExcelJS với định dạng font Times New Roman 11pt, header phối màu chuẩn nhận diện, badge đợt vàng đỏ nổi bật, row height chuẩn hóa (68pt header, 22pt dữ liệu, 30pt footer).
- **Thanh Điều Khiển Phân Đợt Hàng Loạt (`DailyWork.jsx`):** Cho phép chọn nhiều ca tồn tại cùng lúc để duyệt gán Đợt (1, 2, 3...) hoặc Hủy duyệt đợt chỉ với 1 click.
- **Phân Luồng 3 Luồng Tồn Tại Rõ Ràng:** Tách biệt thành các tab chuyên môn: Sửa chữa B4 (ĐHKK & MPĐ), Vật tư UCTT (Accu đề, dây nguồn...), Hạ tầng CSHT địa bàn và Tất cả.

### Changed
- **Giao Diện DailyWork:** Đơn giản hóa hiển thị, loại bỏ các badge trạng thái rườm rà; thay thế bằng badge `Đợt X (MPĐ)` / `Đợt X (ĐHKK)` trang nhã, trực quan.
- **Cấu hình ESLint (`eslint.config.js`):** Bổ sung `.vercel` vào `globalIgnores` tránh quét sâu vào thư mục build bundle tĩnh.
- **Bộ lọc Git (`.gitignore`):** Bổ sung `backend/data/smartw/*.lock`, `.vercel/`, `tvt3_v2/.vercel/`.

### Removed
- **Dead Code:** Xóa file chết nguyên mẫu [`Dashboard.jsx`](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Dashboard.jsx) (-363 dòng) không còn sử dụng.
- **Dead Function:** Xóa hàm cũ `handleBulkUnapproveB4` (-29 dòng) trong `DailyWork.jsx`.

---


### Added
- Logo avatar tròn 5G MobiFone Đồng Nai (`public/logo-mobifone-5g.png`) - generated, stored locally
- User profile section trên Header (avatar gradient + tên "admin / Quản trị")
- Mobile slide-over menu dark theme đồng bộ header
- Blue "HỒ SƠ TRẠM" header card trong tab Thông tin chung
- Grid tabs 2 cột trên mobile cho DatasiteDetailFullscreen

### Changed
- Header: white/glass → dark theme (#1e2736), pill-group navigation
- Brand text: "TVT3 V2" → "Tổ VT3 - PVT" + "Hệ thống quản lý"
- Datasites: Tabs + Search merged thành single card
- DatasiteDetailFullscreen General tab: card-based compact layout
- Font chữ đồng đều text-[13px] across components

### Fixed
- Mobile menu bị clip do backdrop-blur stacking context
- Logo SVG Wikipedia bị mờ → dùng PNG local
- Trang /datasites trắng do thiếu import Database icon
- Ẩn nút Thêm/Xuất/FAB trên mobile toàn dự án

### Removed
- Floating Action Button (FAB) trên ContractDashboard mobile
- Export Word section trên ContractDetailPanel mobile
- Glass/blur effect trên header (thay bằng solid dark)

---

## [2026-05-19] - Contract Payment Schedule Integration

### Added
- `src/utils/contractCalculations.js` - Payment logic ported from Python
- `src/components/datasites/PaymentSchedulePanel.jsx` - Payment schedule UI
- `src/components/datasites/ContractExportButton.jsx` - Word export with docxtemplater

### Changed
- DatasiteDetailFullscreen: Embedded payment schedule in Legal tab
- 50k rounding logic strictly matches Python backend output

---

## [2026-05-14] - Contract Dashboard & Data Migration

### Added
- `src/pages/ContractDashboard.jsx` - Contract management dashboard
- `src/components/contracts/ContractDetailPanel.jsx` - Contract detail view
- Database migration: contracts table with JSONB payment_info
- Excel → Supabase data pipeline for contract data

---

## [2026-05-13] - Initial TVT3_v2 Setup

### Added
- Vite + React 19 + Tailwind v4 project scaffold
- Supabase integration (datasites table, 395 records)
- Dashboard page with stats cards
- Datasites page with search & filter
- DatasiteDetailFullscreen with 5-tab layout
