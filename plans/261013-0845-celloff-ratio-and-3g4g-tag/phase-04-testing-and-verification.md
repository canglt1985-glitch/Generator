# Phase 04: Testing & Verification

Status: ⬜ Pending  
Target Files: `backend/tests/test_celloff_ratio.py`, `tvt3_v2/`

---

## 🎯 Mục tiêu
Đảm bảo toàn bộ 4 kịch bản vận hành thực tế đều đạt chuẩn 100%:
1. Trạm 1 carrier rớt 1 cell $\rightarrow$ `(1/3)`.
2. Trạm 2 carrier rớt 2 cell $\rightarrow$ `(2/6)`.
3. Trạm SRAN rớt cả 3G và 4G $\rightarrow$ nhãn `[3G4G]` và `(2/6)`.
4. Trạm rớt hết $x = y$ (`3/3`, `6/6`) $\rightarrow$ Tự động thăng hạng MLL Trạm.
5. Frontend Vite build thành công không có lỗi lint hoặc runtime.

---

## 📋 Chi tiết các bước thực hiện
1. **Viết test suite `backend/tests/test_celloff_ratio.py`**:
   - Kiểm tra logic tính toán `(x/y)`.
   - Kiểm tra nhãn `[3G4G]`.
   - Kiểm tra thăng hạng $x = y$.
2. **Chạy toàn bộ backend unit tests**:
   - `python3 -m unittest discover -s backend/tests`
3. **Chạy frontend build**:
   - `cd tvt3_v2 && npm run build`
