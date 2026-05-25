# Changelog

## [2026-05-19] - UI/UX Polish & Branding MobiFone 5G

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
