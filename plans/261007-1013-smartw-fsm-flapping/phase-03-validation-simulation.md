# Phase 03: Viết Test Kịch Bản Giả Lập & Kiểm Chứng Thực Tế
Status: ✅ Complete
Dependencies: phase-02-integration-smartw-pipeline.md

## Objective
Xây dựng kịch bản kiểm thử giả lập (simulation test) mô phỏng chính xác trường hợp trạm `DNIPLA06` bị rung lắc link truyền dẫn liên tiếp trong 2-3 tiếng để kiểm chứng số lượng tin nhắn gửi ra.

## Requirements
### Functional
1. **Kịch bản kiểm thử giả lập (Simulation Script):**
   - **T0 (09:00):** Trạm `DNIPLA06 [4G]` bị rớt ➔ Kỳ vọng: Gửi `🚨 *ACTIVE*`.
   - **T1 (09:15):** Trạm tạm hết lỗi trên SmartW ➔ Kỳ vọng: `PENDING_CLEAR`, **KHÔNG gửi `CLEARED`**.
   - **T2 (09:30):** Trạm rớt lại lần 2 ➔ Kỳ vọng: Chuyển sang `FLAPPING`, Gửi `⚠️ *Chập chờn* • DNIPLA06 [4G] - Chập chờn 2 lần/2h`.
   - **T3 (09:45):** Trạm lên lại ➔ Kỳ vọng: `FLAPPING_STABILIZING`, **KHÔNG gửi `CLEARED`**.
   - **T4 (10:00):** Trạm rớt lại lần 3 ➔ Kỳ vọng: Vẫn trong `FLAPPING`, **KHÔNG gửi gì (Dập tin thành công)**.
   - **T5 (10:15):** Trạm lên lại (bắt đầu chu kỳ sạch 1).
   - **T6 (10:30):** Trạm tiếp tục sạch (chu kỳ sạch 2).
   - **T7 (10:45):** Trạm sạch liên tục 3 chu kỳ (45 phút) ➔ Kỳ vọng: Gửi `✅ *CLEARED* • DNIPLA06 [4G] - 10:45`.
2. **Đối chiếu số lượng tin nhắn:**
   - Trước khi có FSM: ~8 tin nhắn liên tục.
   - Sau khi có FSM: Đúng **3 tin nhắn** (1 Active ban đầu, 1 Chập chờn, 1 Cleared kết thúc).
   - Mức giảm spam: **> 62% - 75%**!

### Files to Modify / Create
- `tests/test_alarm_fsm_simulation.py` (hoặc `backend/tests/test_alarm_fsm.py`)

## Test Criteria
- [ ] Chạy script test pass 100% tất cả các assertion về số lượng và nội dung tin nhắn.
- [ ] Không có side-effect lên dữ liệu thật của các trạm khác.
