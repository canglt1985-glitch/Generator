# Phase 03: Cell List by Azimuth & Popup UI (Chuẩn 5G-A & TVT2)
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02

## Objective
Tái thiết kế khối Thông tin Vô tuyến trong Popup trạm (Desktop) và Bottom Sheet (Mobile): hiển thị danh sách Cell gom nhóm theo góc hướng Azimuth (chuẩn kiểu DataSite TVT2), hiển thị badge `5G-A` cho trạm 2 lớp băng tần, ẩn cột 5G đối với trạm không có 5G, xử lý trạm thiếu Azimuth (`DNDQ37`), và cấu trúc sẵn khung hiển thị Lưu lượng Data/Voice.

## Requirements
### Functional
1. **Khối Thống Kê Nhanh (Cell Counts):**
   - Nếu trạm có 5G-A / 5G: Hiển thị 3 cột: `[ 3G: X ]` | `[ 4G: Y ]` | `[ 5G: Z ]` (với badge công nghệ `5G-A` hoặc `5G`).
   - Nếu trạm KHÔNG có 5G: Tự động **ẩn cột 5G**, chỉ hiển thị 2 cột `[ 3G: X ]` | `[ 4G: Y ]`.
   - Nếu trạm chỉ có 4G: Chỉ hiển thị 1 cột `[ 4G: Y ]`.
2. **Danh Sách Cell Gom Nhóm Theo Góc Hướng (Chuẩn TVT2):**
   - Gom các cell theo từng góc hướng `azimuth`:
     ```text
     DANH SÁCH CELL (19) - Trạm DNLK07
     Az: 0°    [3G] [4G] [5G-A (3800/2600)]
     Az: 150°  [3G] [4G] [5G-A (3800/2600)]
     Az: 250°  [3G] [4G] [5G-A (3800/2600)]
     ```
   - Huy hiệu công nghệ (Badges):
     - `[3G]`: Xanh lá
     - `[4G]`: Xanh cyan/blue
     - `[5G (2600)]`: Đỏ tươi
     - `[5G-A (3800/2600)]`: Tím (`#a855f7`)
3. **Xử lý trạm thiếu Azimuth (như `DNDQ37`):**
   - Tuyệt đối không hiển thị `null°`.
   - Nếu azimuth là null/undefined, gom cell theo Sector A, B, C, D với nhãn `Sector A (Chờ cập nhật góc hướng)`.
4. **Sẵn sàng hiển thị Lưu lượng (Traffic Ready):**
   - Thiết kế sẵn vị trí hiển thị tổng lưu lượng trạm (`total_traffic_gb`) trên header và lưu lượng từng cell khi người dùng nhấp xem chi tiết.

## Implementation Steps
1. [ ] Viết helper `groupCellsByAzimuth(sectors, cells)` để chuẩn hóa danh sách theo góc hướng.
2. [ ] Cập nhật Popup trong `NetworkMap.jsx` (Desktop) theo layout mới.
3. [ ] Cập nhật Bottom Sheet chi tiết trạm (Mobile) đồng bộ giao diện.

## Files to Create/Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`
- `tvt3_v2/src/components/map/CellSectorWedges.jsx`

## Test Criteria
- [ ] Trạm `DNLK07`: Hiển thị badge `5G-A` và danh sách cell có `[5G-A (3800/2600)]`.
- [ ] Trạm `DNDQ37`: Ẩn cột 5G, hiển thị 3G (4 cell) và 4G (3 cell), danh sách cell hiển thị theo Sector A, B, C, D không có chữ `null°`.
- [ ] Trạm `DNDQ31`: Hiển thị đủ 3G, 4G, 5G và danh sách cell gom nhóm theo góc hướng 80°, 150°, 260°.
