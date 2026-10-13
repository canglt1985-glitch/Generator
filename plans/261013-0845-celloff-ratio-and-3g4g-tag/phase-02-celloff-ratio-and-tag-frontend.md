# Phase 02: Frontend VhktRan Upgrade (Ratio `(x/y)` & `[3G4G]` Tag)

Status: ⬜ Pending  
Target File: `tvt3_v2/src/pages/VhktRan.jsx`

---

## 🎯 Mục tiêu
1. Đổi toàn bộ nhãn `[SRAN]` $\rightarrow$ `[3G4G]` trong phần CELL OFF.
2. Tính toán chính xác `x` (active off cells) và `y` (total configured cells) cho từng trạm và nhóm sector.
3. Thăng hạng lên MLL Trạm khi $x \ge y$ hoặc khi rớt toàn bộ các sector.
4. Hiển thị badge `(x/y)` trên Web row và chèn `(x/y)` vào tin nhắn copy.

---

## 📋 Chi tiết các bước thực hiện
1. **Import `site_cell_count.json`**:
   - Tải mapping `siteCellCount` từ `../data/site_cell_count.json`.
2. **Cập nhật `groupCellAlarms`**:
   - Khi `grp.nets.size > 1`: Đặt `techTag = '3G4G'` thay vì `'SRAN'`.
   - Tính tổng số cell `y`:
     - Nếu single net (ví dụ 4G): `y = siteCellCount[siteKey]?.['4G'] || 3`.
     - Nếu multi net `[3G4G]`: `y = (siteCellCount[siteKey]?.['3G'] || 3) + (siteCellCount[siteKey]?.['4G'] || 3)`.
   - Gắn `_offCount` (`x = grp.cells.length`) và `_totalCount` (`y`) vào alarm object.
3. **Cập nhật `formatCellOffLine` (Cách A Cực Gọn)**:
   - Xuất chuỗi: `• ${siteLabel}${oldStr} [${techTag}] (${x}/${y}) - ${dateStr}`
   - Bỏ hoàn toàn chữ `"sector C"`, bỏ dấu hai chấm, đồng nhất cấu trúc với MLL Trạm.
4. **Cập nhật `renderAlarmRow` (Giao diện Web)**:
   - Hiển thị badge `(${x}/${y})` (ví dụ `1/3`, `2/6`, `1/2`) màu tím nhạt bên cạnh dateStr.
   - Hiển thị badge `[3G4G]` thay cho `[SRAN]`.
5. **Cập nhật logic thăng hạng MLL**:
   - Nếu `x >= y` $\rightarrow$ Thăng hạng thành MLL Trạm (như `DNILNA04 3/3`, `DNIXDI10 6/6`).
