# Phase 06: MLL Validation Logic
**Status:** ⬜ Pending
**Dependencies:** Phase 04, Phase 05

## Objective
Kiểm tra tính đầy đủ và nhất quán của nguyên nhân MLL giữa các mạng (3G/4G/5G).

## Logic Chi Tiết

### Rule 1: Thiếu nguyên nhân
- Mỗi dòng MLL phải có `nguyen_nhan_1`, `nguyen_nhan_2`, `nguyen_nhan_3`
- Nếu bất kỳ cấp nào trống → flag `missing_cause = true`

### Rule 2: Mâu thuẫn giữa mạng
- Nhóm các dòng MLL theo: `site_id` + khoảng thời gian gần nhau (±15 phút)
- Trong cùng nhóm, so sánh `nguyen_nhan_1`, `nguyen_nhan_2`, `nguyen_nhan_3`
- Nếu khác nhau ở bất kỳ cấp nào → flag `inconsistent_cause = true`

### Thuật toán nhóm:
```python
# 1. Sort MLL theo site_id + bat_dau
# 2. Group: cùng site_id, bat_dau cách nhau <= 15 phút → 1 nhóm
# 3. Trong nhóm: so sánh cấp 1/2/3 của tất cả dòng
# 4. Nếu có > 1 giá trị distinct (bỏ qua empty) → inconsistent
```

## Implementation Steps

1. [ ] Tạo hàm `validate_mll_causes(mll_data)` trong `helpers.py`
   - Input: list of MLL records
   - Output: list of records, mỗi record có thêm `flags: {missing_cause, inconsistent_cause, inconsistent_detail}`
2. [ ] Hàm `_group_mll_by_incident(mll_data, threshold_minutes=15)` — nhóm MLL
3. [ ] Tích hợp vào API `/api/smartw/mll` — chạy validation trước khi trả về
4. [ ] Frontend: đọc flags → highlight UI:
   - `missing_cause` → ô trống nền vàng + icon ⚠️
   - `inconsistent_cause` → row nền cam + tooltip chi tiết
5. [ ] Summary count: đếm số dòng có flags → hiện trên dashboard

## Files to Create/Modify
- `web-app/helpers.py` — thêm `validate_mll_causes()`, `_group_mll_by_incident()`
- `web-app/app.py` — update API `/api/smartw/mll` gọi validation
- `web-app/templates/vhkt.html` — update MLL tab highlight logic

## Test Criteria
- [ ] Dòng thiếu Cấp 2 → highlight vàng
- [ ] Cùng site + thời gian gần, 3G="Truyền dẫn" vs 4G="Nguồn" → highlight cam
- [ ] Cùng site + thời gian gần, nguyên nhân giống → không highlight
- [ ] Summary đếm đúng số lỗi

---
Next Phase: [Phase 07 — Testing & Polish](phase-07-testing.md)
