# Phase 01 – Bóc tách giá chốt

**File mới:** `tvt3_v2/src/utils/negotiation/priceBreakdown.js`

## Việc cần làm
- [ ] `calculateBreakdown({ mb, pm, mfd, cot, vhkt, giamTruRate=-0.2, giaChot, siteType })`
- [ ] Nhánh vượt khung / dưới khung / cột về 0 (cảnh báo) / trạm mặt bằng.
- [ ] Không làm tròn 50k; trả về `{mb, pm, mfd, cotGiamTruKhung, cotChot, vhkt, tong, tyLe{mb,cot,tong}, warnings[]}`.
- [ ] `GIAM_TRU` luôn là giá trị khung; `COT_CHOT` = giá thuê cột sau chia.

## Test
- DNTP31 các ví dụ trong plan.md (4.350.000, 4.600.000, 4.356.000).
- Cột về 0, không có cột, trạm mặt bằng.
- Parity với `pricing_utils.py` (bỏ floor 50k).

## Tiêu chí xong
Test xanh; hàm thuần, không phụ thuộc UI.
