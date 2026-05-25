# Phase 01: Core Logic (JS Utilities)
Status: ✅ Complete

## Objective
"Dịch" các hàm tính toán lịch thanh toán, chia kỳ, tính khấu trừ từ Python (`finance_service.py` và `batch_processor.py`) sang JavaScript thuần để xử lý ngay trên trình duyệt.

## Requirements
### Functional
- [x] Hàm tính số tháng trả lố (`calculateDeduction`) dựa trên mốc 01/10/2025.
- [x] Hàm tạo lịch thanh toán 6 tháng/kỳ (`get_site_schedule`), ép tròn kỳ cuối.
- [x] Hàm chẻ giá cũ/mới dựa trên mốc thời gian 01/10/2025.

## Implementation Steps
1. [x] Tạo file `src/utils/contractCalculations.js`
2. [x] Viết hàm `calculateDeduction(oldPrice, newPrice, paidUntilDate)`
3. [x] Viết hàm `generatePaymentSchedule(startDate, endDate, oldPrice, newPrice, deduction)`
4. [x] Export các hàm để dùng trong các file Component.

## Files to Create/Modify
- `src/utils/contractCalculations.js` - Chứa toàn bộ logic tính toán tài chính.

## Notes
Sử dụng class `Date` của JS hoặc thư viện `date-fns` (nếu đã cài sẵn trong TVT3_v2) để xử lý việc cộng/trừ ngày tháng. Cần lưu ý xử lý múi giờ và ngày cuối tháng để không bị lệch so với Python.

---
Next Phase: [Phase 02](phase-02-frontend.md)
