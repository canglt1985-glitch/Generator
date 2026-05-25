# Phase 03: Word Template Integration
Status: ✅ Complete
Dependencies: Phase 01, Phase 02

## Objective
Đẩy kết quả của bảng Lịch Thanh Toán (đã tính ở Phase 01) vào thẻ `{{PAY_ROW}}` và `{{DEDUCTION_TEXT}}` của Word Template (`PHU_LUC_GIAM_GIA_CSHT.docx`).

## Requirements
### Functional
- [x] Render các mảng `periods` thành một chuỗi văn bản (có dấu xuống dòng) phù hợp với định dạng Word.
- [x] Gắn chuỗi này vào field `PAY_ROW` trong `masterData`.
- [x] Gắn chuỗi giải thích khấu trừ vào `DEDUCTION_TEXT` trong `masterData`.

## Implementation Steps
1. [x] Sửa file `src/components/datasites/ContractExportButton.jsx`.
2. [x] Gọi hàm `generatePaymentSchedule` (từ Phase 01) để lấy kết quả lịch thanh toán.
3. [x] Map mảng `periods` thành chuỗi văn bản với bullet point dạng "+ Kỳ 1: từ ngày... đến ngày... Số tiền là: ...".
4. [x] Truyền chuỗi này vào cấu trúc `masterData`.

## Files to Create/Modify
- `src/components/datasites/ContractExportButton.jsx`

## Notes
Vì thẻ `{{PAY_ROW}}` đang nằm trong một bảng ở file Word, mình có thể chỉ cần chèn văn bản thuần túy có xuống dòng (bằng `\n`). `docxtemplater` sẽ tự động hiển thị trên nhiều dòng.

---
Next Phase: Hoàn thành!
