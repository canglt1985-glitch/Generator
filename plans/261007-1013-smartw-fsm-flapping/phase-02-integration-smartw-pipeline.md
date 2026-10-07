# Phase 02: Tích Hợp FSM Vào Pipeline `smartw_worker.py`
Status: ✅ Complete
Dependencies: phase-01-fsm-engine.md

## Objective
Tích hợp `AlarmStateMachine` vào luồng xử lý định kỳ của `smartw_worker.py`, thay thế cơ chế `_detect_new` & `_detect_cleared` thủ công, và triển khai định dạng tin nhắn ngắn gọn theo yêu cầu.

## Requirements
### Functional
1. **Thay thế luồng phát hiện lỗi trong `run_alarm_poll()`:**
   - Thay vì chỉ so sánh `active_file` vs `previous_file`, chuyển danh sách alarms vừa cào qua `AlarmStateMachine.process_alarms(scraped_dict)`.
2. **Định dạng tin nhắn chuẩn hóa:**
   - Khi có `flapping_events`:
     ```text
     ⚠️ *Chập chờn*
     • DNIPLA06 [4G] - Chập chờn 2 lần/2h
     ```
   - Khi có `new_active_events`: giữ định dạng `🚨 *ACTIVE*` quen thuộc.
   - Khi có `cleared_events`: giữ định dạng `✅ *CLEARED*` quen thuộc.
3. **Cơ chế im lặng (Noise Suppression):**
   - Trong suốt thời gian trạm ở trạng thái `FLAPPING`, không bắn thêm tin `ACTIVE` hay `CLEARED` lẻ tẻ.
4. **Bảo tồn các chức năng hiện có:**
   - Giữ nguyên luồng đồng bộ Supabase `smartw_alarms` (đồng bộ trạng thái thực tế lên DB).
   - Giữ nguyên các báo cáo định kỳ (2-hour report, daily flapping report).

### Files to Modify
- `backend/smartw_worker.py`

## Test Criteria
- [ ] Chạy lệnh `python smartw_worker.py --job alarm` (hoặc mock scrape) không gặp lỗi cú pháp hay runtime.
- [ ] Log ghi nhận rõ ràng việc chuyển đổi trạng thái của FSM.

---
Next Phase: [phase-03-validation-simulation.md](./phase-03-validation-simulation.md)
