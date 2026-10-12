# Phase 04: Testing & Verification

Status: ✅ Complete
Dependencies: Phases 01, 02, 03

## Objective
Kiểm thử toàn diện luồng dữ liệu từ backend đến frontend với các ca kiểm thử thực tế và biên giới hạn (edge cases).

## Test Cases
1. **Case 1: Trạm chuẩn 3 sector rớt cả 3 sector (VD: DNCM25)**
   - Đầu vào: 3 cảnh báo cell off `CM4CA`, `CM4CB`, `CM4CC`.
   - Kết quả mong muốn:
     - Cột MLL: `• DNCM25 [4G] - [Giờ]`.
     - Cột CELL OFF: 0 cell của DNCM25.
2. **Case 2: Trạm 3 sector rớt 1 hoặc 2 sector (VD: DNCM04)**
   - Đầu vào: 1 cảnh báo cell off `CM4CA` (hoặc `CM4CA` + `CM4CC`).
   - Kết quả mong muốn:
     - Cột MLL: Không có DNCM04 4G.
     - Cột CELL OFF: `• DNCM04: CM4CA [4G] - [Giờ]`.
3. **Case 3: Trạm có nhiều cell cùng sector (Carrier Aggregation / Multi-band)**
   - Đầu vào: 4 cảnh báo cell off gồm `CM4CA`, `CM4EA` (cùng sector A khác band) + `CM4CB` + `CM4CC`.
   - Kết quả mong muốn: Nhận diện đủ 3 sector A, B, C $\rightarrow$ Thăng hạng lên MLL Trạm.
4. **Case 4: Trạm 4 sector cấu hình (VD: DNIXDI00)**
   - Đầu vào 1: Rớt 3 sector `CA`, `CB`, `CC` (thiếu `CD`) $\rightarrow$ Vẫn ở CELL OFF vì trạm có 4 sector.
   - Đầu vào 2: Rớt đủ cả 4 sector `CA`, `CB`, `CC`, `CD` $\rightarrow$ Thăng hạng lên MLL Trạm.
5. **Case 5: Quick Action "Lên MLL trạm"**
   - Click nút "Lên MLL" cho 1 cell off lẻ $\rightarrow$ Trạm lập tức chuyển sang cột MLL, copy text đúng format.
6. **Case 6: Vite Frontend Build**
   - Chạy `npm run build` trong `tvt3_v2/` để đảm bảo không lỗi cú pháp hoặc TypeScript/ESLint.

## Execution Steps
1. [ ] Chạy unit test script Python cho backend logic.
2. [ ] Chạy frontend dev server / build test.
3. [ ] Chụp màn hình hoặc verify render kết quả.
