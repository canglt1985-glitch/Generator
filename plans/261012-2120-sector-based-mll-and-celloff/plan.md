# Plan: Chuẩn Hóa Cơ Chế MLL Trạm & CELL OFF Theo Tập Sector

Created: 2026-10-12 21:20 (Asia/Ho_Chi_Minh)
Status: ✅ Complete
Folder: `plans/261012-2120-sector-based-mll-and-celloff/`

## 1. Overview & Objective
Hiện tại, hệ thống đếm số cell thô (cell count) để phân biệt giữa MLL Trạm và CELL OFF. Điều này dẫn đến sai lệch lớn:
- Một sector có nhiều cell khác band (L1800, L2100, L900) để tăng dung lượng. Đếm tổng cell sẽ không bao giờ đạt ngưỡng khi chỉ rớt theo sector.
- Các trạm có hậu tố `L`, `UL`, `N` trên SmartW bị lệch mã khi tra cứu file đếm cell.
- Worker tự động ép ngược cảnh báo MLL Trạm về `mll_cell` nếu record gốc có `objectReference` của cell.
- Trên thực tế, DNCM25 rớt toàn bộ 3 sector nhưng chỉ hiện 1 cell ở CELL OFF (do SmartW gửi thiếu và hệ thống chưa có cơ chế gom theo sector chuẩn).

**Mục tiêu đã hoàn thành:**
Chuyển đổi hoàn toàn cơ chế phân định sang **TẬP CÁC SECTOR KHÁC NHAU (DISTINCT SECTORS)** dựa trên dữ liệu bảng `datacells`:
- Nếu toàn bộ các sector cấu hình của công nghệ đó (`A, B, C` hoặc `A, B, C, D, E`) đồng thời bị off $\rightarrow$ Thăng hạng thành **MLL Trạm**.
- Cấu trúc tin nhắn giữ nguyên form chuẩn gọn gàng hiện tại của TVT3, không thêm text dài dòng.
- Bổ sung thao tác 1 chạm trên UI (`+MLL`) để kỹ thuật viên chủ động thăng hạng lên MLL Trạm khi SmartW chỉ mới báo 1 sector.

## 2. Tech Stack & Affected Components
- **Backend:** Python 3.14 (`backend/smartw/scraper.py`, `backend/smartw_worker.py`).
- **Database:** Supabase PostgreSQL (`datacells`, `smartw_alarms`, `datasites`).
- **Frontend:** React + Tailwind CSS + Lucide Icons (`tvt3_v2/src/pages/VhktRan.jsx`).
- **Data Cache:** `backend/data/site_sectors.json` & `tvt3_v2/src/data/site_sectors.json`.

## 3. Implementation Phases

| Phase | Name | Description | Status | Progress |
|-------|------|-------------|--------|----------|
| 01 | Sector Reference Mapping | Trích xuất từ `datacells` tạo `site_sectors.json` (map site_id & site_id_old sang danh sách sector chuẩn) | ✅ Complete | 100% |
| 02 | Backend Scraper & Worker | Sửa `scraper.py` (bỏ hậu tố, gom distinct sectors) & `smartw_worker.py` (chống ép ngược `mll_cell`) | ✅ Complete | 100% |
| 03 | Frontend VhktRan Upgrade | Cập nhật logic gom sector tự động sang MLL, giữ form tin nhắn chuẩn, thêm Quick Action | ✅ Complete | 100% |
| 04 | Testing & Verification | Kiểm thử kịch bản giả lập các trạm 3 sector, 4-5 sector, đa band và build Vite | ✅ Complete | 100% |
| 05 | Flapping & Immediate Clear | Khôi phục trạm ngay lập tức (stabilize_cycles=1) & đếm số lần MLL trong ngày: `• DNCM25 [4G] - 12/10 17:23 (Lần 2)` | ✅ Complete | 100% |

## 4. Message Format Contract
- **Lần 1 (chuẩn cũ, không hậu tố thừa):**
  `• DNCM25 [4G] - 12/10 17:23`
- **Lần ≥ 2 (chập chờn trong ngày, bổ sung số lần ở cuối dòng):**
  `• DNCM25 [4G] - 12/10 17:23 (Lần 2)`
  `• DNCM25 [4G] - 12/10 17:23 (Lần 3)`
- **Immediate Recovery:** Khi trạm lên lại (hết alarm trên SmartW), trạm được xóa ngay khỏi danh sách MLL đang active (không bị giữ lại gây hiểu lầm trạm chưa lên).
