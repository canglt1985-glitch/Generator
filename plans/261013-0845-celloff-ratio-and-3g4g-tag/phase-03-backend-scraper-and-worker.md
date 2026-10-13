# Phase 03: Backend Scraper & Worker Upgrade

Status: ⬜ Pending  
Target Files: `backend/smartw/scraper.py`, `backend/smartw_worker.py`

---

## 🎯 Mục tiêu
Đồng bộ backend để:
1. Thăng hạng MLL Trạm khi số cell rớt $x \ge y$ (total cell count).
2. Đổi nhãn `SRAN` $\rightarrow$ `3G4G` trong periodic report và các luồng thông báo tự động.

---

## 📋 Chi tiết các bước thực hiện
1. **Trong `backend/smartw/scraper.py`**:
   - Tải `site_cell_count.json` bên cạnh `site_sectors.json`.
   - Trong `scrape_mll_all`: Bổ sung điều kiện thăng hạng:
     `if len(cells) >= total_cells or is_all_sectors_down:` $\rightarrow$ Promote to MLL Trạm.
   - Khi lưu trữ cảnh báo cell off, đính kèm `off_count` và `total_count`.
2. **Trong `backend/smartw_worker.py`**:
   - Đổi `tech_tag = "3G4G"` thay vì `"SRAN"` khi `len(grp['nets']) > 1`.
   - Cập nhật format dòng cell off trong bản tin định kỳ gửi Viber/Telegram:
     `• {grp['label']}: sector {grp['sector']} [{tech_tag}] ({x}/{y}) - {grp['t']}`
