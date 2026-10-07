# Phase 01: Thiết Kế & Cài Đặt Engine FSM (`backend/smartw/alarm_fsm.py`)
Status: ✅ Complete
Dependencies: None

## Objective
Xây dựng một module State Machine độc lập và hoàn toàn tách biệt nghiệp vụ, chịu trách nhiệm quản lý vòng đời và trạng thái cảnh báo của từng thực thể `(table_type, site_id, tech)`.

## Requirements
### Functional
1. **Khóa nhận diện trạng thái (State Key):**
   - Định dạng: `f"{table_type}_{base_site_id}_{tech}"` (ví dụ: `mll_DNIPLA06_4G`, `md_DNDQ01_ALL`).
2. **4 Trạng thái vận hành:**
   - `NORMAL`: Trạm sạch lỗi hoàn toàn.
   - `ACTIVE`: Trạm có lỗi đơn lẻ (chưa chạm ngưỡng rung lắc).
   - `PENDING_CLEAR`: SmartW không còn alarm, nhưng đang trong thời gian chờ xác minh ổn định (Hysteresis 15-30 phút).
   - `FLAPPING`: Trạm bị rớt lại $\ge 2$ lần trong vòng 2 giờ.
3. **Quy tắc chuyển dịch (Transitions) & Quyết định phát tin:**
   - `transition(current_scraped_alarms, timestamp)`:
     - Nhận vào danh sách alarms vừa cào được trong chu kỳ hiện tại.
     - So khớp với trạng thái hiện hành trong bộ nhớ.
     - Phân loại kết quả thành 3 nhóm phát tin:
       - `new_active_events`: Cần phát `🚨 *ACTIVE*`.
       - `flapping_events`: Cần phát `⚠️ *Chập chờn*` (kèm số lần rớt, ví dụ: `Chập chờn 2 lần/2h`).
       - `cleared_events`: Cần phát `✅ *CLEARED*` (sau khi đã duy trì ổn định $\ge 30-45$ phút).
4. **Bộ nhớ bền vững (Persistence):**
   - Tự động load/save tại `backend/data/alarm_state_machine.json`.
   - Tự động purge các mục không có biến động sau 24 giờ.

### Files to Modify / Create
- Tạo mới: `backend/smartw/alarm_fsm.py`

## Test Criteria
- [ ] Chạy unit test độc lập cho `alarm_fsm.py` kiểm tra đầy đủ 4 trạng thái.
- [ ] Đảm bảo không ném ngoại lệ khi file json rỗng hoặc bị corrupt.

---
Next Phase: [phase-02-integration-smartw-pipeline.md](./phase-02-integration-smartw-pipeline.md)
