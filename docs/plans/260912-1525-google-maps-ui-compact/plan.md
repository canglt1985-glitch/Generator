# Plan: Tối Ưu Bảng Điều Khiển NetworkMap Theo Giao Diện Google Maps

Created: 2026-09-12T15:25:00+07:00  
Status: 🟡 In Progress  
Reference Brief: [BRIEF_NETWORK_MAP_UX.md](file:///Users/cang_it/Antigravity/TVT3/docs/BRIEF_NETWORK_MAP_UX.md)

---

## 1. Overview
Chuyển đổi toàn diện giao diện trang Bản đồ hạ tầng mạng (`NetworkMap.jsx`) từ bố cục 2 cột truyền thống (bảng điều khiển chiếm 33% cố định) sang mô hình **Bản đồ tràn viền 100% (Map-First)** chuẩn Google Maps:
- **Desktop:** Thẻ tìm kiếm nổi góc trên trái + Dải Filter Chips ngang + Thẻ trạm lân cận trượt mở/thu gọn (`‹`/`›`) + FABs góc phải.
- **Mobile:** Thanh tìm kiếm bo tròn đỉnh màn hình + Filter Chips cuộn ngang + Bottom Sheet 3 trạng thái (Thu gọn / Nửa màn hình / Toàn màn hình) kéo trượt êm ái.

---

## 2. Tech Stack & Dependencies
- **Core:** React 19, Tailwind CSS v4, Lucide React icons
- **GIS / Mapping:** Leaflet 1.9.4, React Leaflet 5.0, OSRM Routing API, Google Satellite Tiles
- **State Management:** React local hooks (`useState`, `useMemo`, `useCallback`, `useRef`, `useEffect`)

---

## 3. Implementation Phases

| Phase | Name | Scope | Status |
| :--- | :--- | :--- | :--- |
| **01** | **Layout Restructuring & Map-First Canvas** | Chuyển layout từ `grid-cols-3` sang Full-Bleed Map Canvas 100% chiều cao màn hình | ✅ Complete |
| **02** | **Floating Search & Horizontal Filter Chips** | Tạo Floating Search Box và dải Filter Chips ngang (5G, 4G ERA, CSHT, Last Mile) | ✅ Complete |
| **03** | **Desktop Collapsible Side Panel** | Thiết kế thẻ trượt trái cho Desktop (chứa trạm lân cận, kéo cáp) có nút ẩn/hiện `‹`/`›` | ✅ Complete |
| **04** | **Mobile Interactive Bottom Sheet** | Thiết kế Bottom Sheet đa tầng cho Mobile (Peek 65px / Half 45% / Full 85%) | ✅ Complete |
| **05** | **FABs & Floating Cable Route Banner** | Bộ nút FAB (GPS, Layers, Fullscreen) và Banner thông số cáp nổi giữa đáy màn hình | ✅ Complete |
| **06** | **Build, Verification & Deployment** | Kiểm thử giao diện trên Mobile & Desktop, build production, deploy Vercel và chụp screenshot | ✅ Complete |

---

## 4. Quick Commands
- Bắt đầu triển khai: `/code`
- Kiểm tra tiến độ: `/next`
- Lưu bộ nhớ: `/save-brain`
