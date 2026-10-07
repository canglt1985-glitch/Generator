# Technical Specification: ESLint Code Cleanliness & Runtime Fixes

## 1. Executive Summary
Kế hoạch kỹ thuật nhằm xử lý dứt điểm 306 vấn đề ESLint trên ứng dụng TVT3 v2, triệt tiêu 32 lỗi `no-undef` (nhóm lỗi gây crash ứng dụng thực tế), sửa các vi phạm React 19 memoization / immutability, chuẩn hóa ESLint Flat Config và tự động dọn dẹp các import/biến không sử dụng.

## 2. Root Cause Analysis (RCA)
- **`no-undef` (32 lỗi):** Phát sinh do quá trình refactor nhanh các tính năng (tách file B4, đổi tên hàm `fetchDefectsLogs` thành `fetchData`, tách logic xuất thiết bị lưu động nhưng chưa dọn sạch nút bấm cũ, quên import thư viện bên thứ 3 như `xlsx`).
- **`react-hooks/immutability` (7 lỗi):** Gán trực tiếp giá trị vào prop của component con (ví dụ: `contract.status = '...'`) thay vì tạo object copy mới.
- **`no-case-declarations` (20 lỗi):** Khai báo biến `const`/`let` trong mệnh đề `case` mà không dùng `{}` để tạo block scope riêng.
- **`no-unused-vars` (179 cảnh báo):** Import sẵn các icon từ thư viện `lucide-react` và các tham số hàm callback chưa dùng tới.

## 3. Scope of Changes

### 3.1. `src/pages/DailyWork.jsx`
- Thay thế `logActivity` (chưa định nghĩa) bằng logging nội bộ an toàn.
- Sửa `fetchDefectsLogs()` tại dòng 1084 & 1115 thành `fetchData()`.

### 3.2. `src/pages/Datasites.jsx`
- Bổ sung `import * as XLSX from 'xlsx';` tại đầu file để phục vụ các chức năng đọc ghi sheet dữ liệu trạm.

### 3.3. `src/pages/InfrastructureDevelopment.jsx`
- Bổ sung `import * as XLSX from 'xlsx';` tại đầu file.
- Khai báo biến `addressNewText` trong hàm xuất Word (`generateSurveyDocx` / `generateContractDocx`).

### 3.4. `src/pages/Generator.jsx`
- Rà soát nút bấm dòng 1817 (`MPĐ Lưu Động`), liên kết đúng hàm xuất Excel lưu động hiện có hoặc ẩn nút nếu tính năng đã chuyển qua DailyWork.

### 3.5. `src/pages/NetworkMap.jsx`
- Thay thế `categorizedActiveSites` dòng 1395 bằng `activeSites`.

### 3.6. `src/components/sran/SranSiteModal.jsx`
- Bổ sung khai báo `const rawSwapSol = String(site?.swap_solution || '');`.

### 3.7. `tvt3_v2/eslint.config.js`
- Bổ sung quy tắc:
  ```js
  'no-unused-vars': ['warn', { 
    argsIgnorePattern: '^_', 
    varsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_'
  }]
  ```

## 4. Verification & Validation Strategy
1. **Lint Verification:** `npm run lint` giảm về 0 lỗi runtime (`no-undef`, `no-dupe-keys`).
2. **Build Verification:** `npm run build` hoàn thành < 1.2s.
3. **Smoke Test:** Thao tác các tính năng liên quan trên trình duyệt để kiểm tra phản hồi.
