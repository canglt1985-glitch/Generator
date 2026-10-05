# Phase 04: Kiểm Thử Nghiệp Vụ, Build & Deploy Production
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Kiểm thử toàn diện luồng nghiệp vụ trên trình duyệt, build gói production và deploy lên Vercel.

## Implementation Steps
1. [ ] Kiểm thử tạo mới đề xuất Mua mới Ắc quy đề tại 1 trạm (ví dụ `DNTN10`, loại `12V - 70Ah`).
2. [ ] Kiểm thử tạo mới đề xuất Sửa chữa Ban 4 tại 1 trạm (ví dụ `DNXL20`, hạng mục `Đại tu động cơ`).
3. [ ] Kiểm thử xuất 2 file Excel và mở kiểm tra nội dung dữ liệu.
4. [ ] Chạy `npm run build` xác nhận không lỗi compile.
5. [ ] Commit Git & Deploy Production lên Vercel (`https://tvt3.vercel.app`).

## Test Criteria
- Build Vite thành công code 0.
- Vercel deployment live `HTTP 200`.
- Thao tác trên mobile và desktop mượt mà, phân loại chính xác 100%.
