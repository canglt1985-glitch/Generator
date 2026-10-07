# Phase 03: Tinh Chỉnh ESLint Config & Dọn Unused Vars
Status: ✅ Complete
Dependencies: phase-02-react-hooks-and-cases.md

## Objective
Chuẩn hóa file cấu hình `eslint.config.js` cho hệ sinh thái React 19 + Vite và tự động dọn sạch 179 cảnh báo unused imports/vars.

## Requirements
### Functional
- [x] Cập nhật `tvt3_v2/eslint.config.js`:
  - Quy định `no-unused-vars`: cho phép bỏ qua các tham số hoặc biến bắt đầu bằng ký tự gạch dưới `_` (`argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`).
  - Tắt cảnh báo thừa `React` (vì React 19 dùng new JSX transform tự động).
  - Cấu hình `react-hooks/set-state-in-effect: 'warn'`.
- [x] Dọn dẹp an toàn các import icon từ `lucide-react` không còn được sử dụng trong các components/pages.
- [x] Dọn các biến cục bộ không được đọc trong hàm.

### Files to Modify
- `tvt3_v2/eslint.config.js`
- Các components và pages có import icon dư thừa (`InfrastructureDevelopment.jsx`, `DailyWork.jsx`, `Generator.jsx`, `Datasites.jsx`, v.v.)

## Test Criteria
- [x] Chạy `npm run lint` thấy số lượng cảnh báo giảm mạnh (> 85% - 95%). (Từ 306 xuống 38, giảm 87.6%).
- [x] Không có file nào bị xóa nhầm import đang cần thiết.

---
Next Phase: [phase-04-verification-and-audit.md](./phase-04-verification-and-audit.md)

