# Phase 02 – Chu kỳ thanh toán + khấu trừ

**File mới:** `negotiation/paymentCycles.js`, `negotiation/deduction.js`, `negotiation/constants.js`

## Việc cần làm
- [ ] `constants.js`: `VB1245_DATE = 2025-10-01` (gom các chỗ gõ cứng).
- [ ] `calculateAlignedCycles`: kỳ 1 canh cuối tháng (ngày lẻ + N tháng), kỳ cuối cắt đúng ngày hết hạn, giá cũ/mới theo `split_date`, ngày lẻ = số ngày thực của tháng, tròn đồng.
- [ ] `deduction.js`: chỉ CSHT, ngày thực thay /30.44, trừ vào kỳ 1, sinh `DEDUCTION_TEXT`.
- [ ] Chặn khi chưa đạt mục tiêu hoặc giá cũ ≤ giá mới.

## Test
Đối chiếu `pricing_utils.py` `calculate_aligned_cycles`; ghi rõ chênh lệch khấu trừ (Python /30).
