# Phase 01: State Storage Setup
Status: ⬜ Pending
Dependencies: None

## Objective
Tạo cơ chế lưu trữ (cache) đơn giản để lưu lại trạng thái các trạm ở lần quét gần nhất, phục vụ cho vòng lặp 15 phút phía sau đọc lại.

## Requirements
### Functional
- [ ] Xác định được file chứa logic vòng lặp Scrape 15 phút hiện tại.
- [ ] Chèn đoạn code ĐÓNG GÓI dữ liệu trạng thái hiện tại (Mất điện, Chạy máy) vào file ghi tạm (Ví dụ: `viber_alert_cache.json`).
- [ ] Chèn đoạn code ĐỌC dữ liệu từ file này lên bộ nhớ RAM ở đầu vòng quét.

## Implementation Steps
1. [ ] Mở file chạy Scrape chính của dự án.
2. [ ] Thêm hàm `load_previous_state()`
3. [ ] Thêm hàm `save_current_state(data)` ở cuối tiến trình.

---
Next Phase: Phase 02
