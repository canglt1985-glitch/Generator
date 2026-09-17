# Phase 05: Testing, Verification & Regression Check
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02, Phase 03, Phase 04

## Objective
Kiểm thử toàn diện, đảm bảo:
1. Danh sách thiếu log ngày 16/09 không còn 3 trạm `DNIXLO01`, `DNIXLO10`, `DNIXLO16`.
2. Trạm ERA có `alarmInfo: Generator running` được tự động chuyển thành log chạy máy.
3. Báo cáo MLL hiển thị đúng trạng thái hoàn thành khi SmartW báo "Chưa đủ nguyên nhân: 0".

## Test Checklist
- [ ] Chạy kiểm tra bảng `generator_logs` qua `.venv/bin/python`.
- [ ] Chạy `get_missing_logs_recommendations()` kiểm tra danh sách thiếu log ngày 16/09.
- [ ] Chạy test `_resolve_base_site_and_tech()` với các biến thể hậu tố trạm ERA.
- [ ] Chạy test hàm `_send_mll_cause_viber_report` với `missing_count = 0`.
- [ ] Kiểm tra không làm gián đoạn các luồng cào khác (VHKT, PAKH).

---
Finish Plan
