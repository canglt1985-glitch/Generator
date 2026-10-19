# Phase 03 – Kịch bản xuất phụ lục

**File mới:** `negotiation/scenarios.js`, `negotiation/index.js`

## Việc cần làm
- [ ] Map 12 kịch bản → template: giảm giá, gia hạn (+ngắn hạn), giảm giá+gia hạn, thanh lý ký lại, thanh lý ký mới, ký mới, CCT A/CCT.
- [ ] Hậu tố `_MAT_BANG.docx` / `_CSHT.docx` theo loại trạm.
- [ ] Số năm gia hạn mặc định 5 (2 nếu ngắn hạn); ngày bắt đầu giảm giá = ngày hiệu lực hoặc 01/10/2025.
- [ ] `runNegotiation(site, giaChot, kichBan)` trả: breakdown, cycles, deduction, tags Word, template, warnings.
- [ ] Chiều cao cột lấy từ `classification.loai_cot/chieu_cao_cot`; thiếu → "cần bổ sung".
- [ ] Luôn kèm BBLV.

## Lưu ý
Dự án CSHT dùng "ký hợp đồng mới", không đưa kịch bản thanh lý ký lại.
