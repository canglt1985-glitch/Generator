# Phase 01: Data Model & Planning Matrix (Chuẩn 5G-A)
Status: ⬜ Pending
Dependencies: None

## Objective
Chuẩn hóa logic nhận diện và phân loại công nghệ trạm theo Quy Hoạch Vô Tuyến (`SRAN / 5G-A`, `SRAN / 5G`, `SRAN`, `3G/4G/5G`, `3G/4G`, `4G`, `3G`) thay vì tiến độ thi công thực tế. Đồng bộ toàn bộ khái niệm 5G 2 lớp thành **5G-A** (5G-Advanced).

## Requirements
### Functional
- [ ] Phân biệt trạm nằm trong quy hoạch SRAN (có trong file thiết kế `ERA_RF_ALL`) vs trạm ngoài quy hoạch SRAN (Nokia 4G như `DNDQ37`, trạm hiện hữu).
- [ ] Phân loại chính xác 7 nhóm công nghệ theo quy hoạch vô tuyến & chuẩn 5G-A:
  1. `SRAN / 5G-A` (Tím `#a855f7`): Quy hoạch SRAN + 5G-Advanced (NR2600 + NR3800)
  2. `SRAN / 5G` (Đỏ `#ef4444`): Quy hoạch SRAN + 5G (NR2600)
  3. `SRAN` (Cyan `#06b6d4`): Quy hoạch SRAN (3G/4G)
  4. `3G/4G/5G` (Cam `#f97316`): Trạm ngoài SRAN nhưng có phát 5G
  5. `3G/4G` (Xanh dương `#3b82f6`): Trạm ngoài SRAN (Nokia 4G + Ericsson 3G như `DNDQ37`)
  6. `4G` (Xanh dương `#3b82f6`): Đơn công nghệ 4G LTE
  7. `3G` (Xanh lá `#22c55e`): Đơn công nghệ 3G
- [ ] Thống kê số lượng trạm theo từng loại công nghệ trong Quick Toolbar và Drawer.

## Implementation Steps
1. [ ] Cập nhật hàm `getSiteRadioInfo(site)` trong `NetworkMap.jsx` để chuẩn hóa các key: `5g_a` (thay cho `5g_dual`), `5g_l1`, `sran_3g4g`, `legacy_3g4g`, `4g_only`, `3g_only`.
2. [ ] Điều chỉnh `activeSiteRadioCounts` và các bộ lọc bản đồ đồng bộ theo các nhóm quy hoạch.

## Files to Create/Modify
- `tvt3_v2/src/pages/NetworkMap.jsx`

## Test Criteria
- [ ] Trạm `DNLK07`: Hiển thị `SRAN / 5G-A` (Màu tím, nhãn 5G-A).
- [ ] Trạm `DNDQ31`: Hiển thị `SRAN / 5G` (Màu đỏ).
- [ ] Trạm `DNDQ37`: Hiển thị `3G/4G` (Màu xanh dương, không có chữ SRAN).
