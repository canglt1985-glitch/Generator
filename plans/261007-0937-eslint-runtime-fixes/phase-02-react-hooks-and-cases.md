# Phase 02: Chuẩn Hóa React 19 Hooks & Switch Cases
Status: ✅ Complete
Dependencies: phase-01-runtime-undef-fixes.md

## Objective
Xử lý các vi phạm kiến trúc React 19 và chuẩn hóa cấu trúc Javascript trong toàn bộ các trang lớn:
- Loại bỏ các hành vi mutate trực tiếp props/state (`react-hooks/immutability`).
- Thêm block scope `{}` cho các switch case (`no-case-declarations`).
- Tối ưu các hook `useEffect` gọi `setState` đồng bộ (`react-hooks/set-state-in-effect`).

## Requirements
### Functional
- [x] Bọc `{}` cho toàn bộ 20 vị trí khai báo `let`/`const` trong `switch...case` ở các reducers/handlers để tránh rò rỉ biến sang case khác (TDZ hazard).
- [x] Thay thế các đoạn code sửa trực tiếp props (như `contract.status = ...`, `site.technical_info = ...`) bằng immutable clone / local state để tương thích với cơ chế memoization của React 19.
- [x] Chuyển vị trí khai báo hàm `fetchContracts` và `showToast` lên trước `useEffect` và `useCallback`.
- [x] Dọn sạch 14 vị trí gán biến vô ích (`no-useless-assignment`).

### Files to Modify
- `src/components/contracts/ContractDetailPanel.jsx`
- `src/components/datasites/DatasiteDetailFullscreen.jsx`
- `src/pages/ContractDashboard.jsx`
- `src/pages/NetworkMap.jsx`
- `src/pages/DailyWork.jsx`
- `src/pages/Generator.jsx`
- `src/pages/InfrastructureDevelopment.jsx`
- `src/utils/cellSectorGeometry.js`
- `src/utils/contractLogic.js`
- `src/utils/mfdStatementExporter.js`

## Test Criteria
- [x] Các màn hình chi tiết hợp đồng, chi tiết trạm và VHKT hoạt động bình thường, phản ứng mượt mà.
- [x] Giảm toàn bộ 41 lỗi thuộc nhóm React immutability, switch-case và useless assignments.
- [x] Build thành công trong 765ms.

---
Next Phase: [phase-03-eslint-config-and-unused-vars.md](./phase-03-eslint-config-and-unused-vars.md)
