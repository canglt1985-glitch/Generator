# Phase 04 – Nối UI + lưu trạng thái

**Sửa:** `ContractDetailPanel.jsx`, `components/datasites/ContractExportButton.jsx`, `components/datasites/PaymentSchedulePanel.jsx`

## Việc cần làm
- [ ] Panel đàm phán: ô giá chốt, bóc tách (MB/PM/MFĐ/Cột/VHKT/Giảm trừ), cảnh báo vàng, **không có nút làm tròn 50k**.
- [ ] Bảng chu kỳ từ engine mới; chọn kịch bản.
- [ ] `ContractExportButton`: build tag từ `runNegotiation` (`GIAM_TRU` = khung, `COT_CHOT` = giá thuê cột, `TL_COT`).
- [ ] Giữ `generatePaymentSchedule` / `generatePaymentCycles` cũ để không phá consumer; migrate dần.
- [ ] Lưu `datasites.contract_info.negotiation` (JSONB: giá chốt, bóc tách, kịch bản, trạng thái).
- [ ] Giữ nguyên template Word (cách A).
