# Phase 01: Smart Template Mapping
Status: ⬜ Pending

## Objective
Tự động hóa việc phân loại template Hợp Đồng dựa trên hình thức đầu tư của trạm.

## Requirements
### Functional
- [ ] Trong `ContractExportButton.jsx`, bổ sung logic kiểm tra `site.classification.hinh_thuc_dau_tu` (hoặc thông tin tương đương).
- [ ] Nếu là trạm "Mobifone" -> Tự động ưu tiên/chọn template "Hợp đồng mới Mặt Bằng".
- [ ] Nếu khác "Mobifone" -> Chọn template "Hợp đồng mới CSHT".
- [ ] Giao diện hiện Nút "In Hợp Đồng" có gợi ý luôn mẫu phù hợp nhất ở trên cùng.

## Implementation Steps
1. [ ] Đọc cấu trúc JSON của `classification` để viết logic if-else chính xác.
2. [ ] Refactor `ContractExportButton` để nhận diện Default Template thay vì bắt user chọn trong list.

---
Next Phase: phase-02-batch-export-ui.md
