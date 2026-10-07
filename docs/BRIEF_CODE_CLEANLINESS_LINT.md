# 💡 BRIEF: Tối Ưu Độ Sạch Mã Nguồn & Triệt Tiêu Lỗi Runtime Tiềm Ẩn (ESLint Cleanup)

**Ngày tạo:** 2026-10-07  
**Dự án:** TVT3 v2 (`tvt3_v2`)  
**Người khởi xướng:** cang_it & AI Antigravity  

---

## 1. BẢN CHẤT VẤN ĐỀ (SỰ THẬT ĐẰNG SAU CON SỐ 306 LINT)

Trước đó, báo cáo `/audit` ghi nhận:
> *"Độ sạch mã nguồn (Lint) | 306 vấn đề | Chỉ còn cảnh báo unused vars | Các biến thừa không ảnh hưởng runtime | 🟡 Khá"*

Tuy nhiên, qua khảo sát chuyên sâu (Deep AST & ESLint Diagnostic), **con số 306 không đơn thuần chỉ là "biến thừa vô hại"**. Thực tế có sự phân hóa nghiêm trọng:

### 📊 Bảng phân bố 298 - 306 vấn đề ESLint:
| Quy tắc (Rule) | Số lượng | Tính chất | Mức độ nguy hiểm |
|---|---|---|---|
| **`no-undef`** | **32** | Gọi biến / hàm chưa từng khai báo hoặc quên import | 🔴 **CỰC KỲ NGUY HIỂM** (Gây crash app `ReferenceError` khi user bấm vào nút) |
| **`no-dupe-keys`** | **2** | Khai báo trùng key trong cùng 1 object | 🟠 **NGUY HIỂM** (Ghi đè thuộc tính ngầm, sai lệch logic) |
| **`react-hooks/immutability`** | **7** | Trực tiếp mutate prop/state (vd: `contract.status = ...`) | 🟠 **NGUY HIỂM** (Phá vỡ tính phản ứng của React 19, UI không render lại) |
| **`react-hooks/set-state-in-effect`** | **14** | `setState` đồng bộ ngay trong `useEffect` | 🟡 **TRUNG BÌNH** (Gây re-render kép hoặc giật lag) |
| **`no-case-declarations`** | **20** | Khai báo `let`/`const` trong `switch` không có scope `{}` | 🟡 **TRUNG BÌNH** (Dễ dính lỗi TDZ hoặc xung đột tên biến) |
| **`react-hooks/exhaustive-deps`** | **14** | Thiếu dependency trong `useMemo`/`useEffect` | 🟡 **TRUNG BÌNH** (Có thể dùng dữ liệu cũ) |
| **`no-useless-assignment`** | **14** | Biến gán giá trị xong bị ghi đè ngay lập tức | 🟢 **THẤP** (Code thừa, không ảnh hưởng runtime) |
| **`no-unused-vars`** | **179** | Import icon/React/biến chưa dùng tới | 🟢 **VÔ HẠI RUNTIME** (Vite tree-shaking tự loại bỏ khi build) |
| **Khác** (`no-useless-escape`, `no-empty`, `react-refresh`) | **16** | Formatting nhỏ, comment, empty block | 🟢 **THẤP** |

---

## 2. NHỮNG "BẪY RUNTIME" THỰC TẾ ĐÃ ĐƯỢC PHÁT HIỆN QUA `no-undef`

Nếu không kiểm tra chi tiết, các đoạn mã sau sẽ **làm sập ứng dụng (Crash)** ngay khi người dùng thao tác:

1. **`DailyWork.jsx:985 & 1041` - Báo hỏng / Báo sửa xong MPĐ:**
   - Mã nguồn gọi: `await logActivity('BÁO HỎNG MPĐ LƯU ĐỘNG', ...)`
   - **Thực tế:** Hàm `logActivity` **hoàn toàn chưa được import hoặc định nghĩa** trong file `DailyWork.jsx`.
   - **Hậu quả:** Khi kỹ thuật viên bấm "Lưu báo hỏng" hoặc "Xác nhận sửa xong", app sẽ ném lỗi `ReferenceError: logActivity is not defined`.

2. **`DailyWork.jsx:1084 & 1115` - Phân đợt sửa chữa B4:**
   - Mã nguồn gọi: `fetchDefectsLogs()` sau khi cập nhật phân đợt.
   - **Thực tế:** Trong file tên hàm thực tế là `fetchData()`, không có hàm nào tên `fetchDefectsLogs()`.
   - **Hậu quả:** Báo lỗi `Lỗi khi cập nhật đợt B4: fetchDefectsLogs is not defined`.

3. **`Datasites.jsx:903, 919, 1181...` & `InfrastructureDevelopment.jsx:1465` - Xuất/Nhập dữ liệu Excel:**
   - Gọi trực tiếp: `XLSX.read(...)`, `XLSX.utils.sheet_to_json(...)`.
   - **Thực tế:** Cả 2 file này **chưa có dòng `import * as XLSX from 'xlsx'`**.
   - **Hậu quả:** Khi người dùng bấm nút Xuất/Nhập Excel trạm dữ liệu hoặc CSHT, màn hình báo lỗi sập.

4. **`Generator.jsx:1817` - Nút "MPĐ Lưu Động" trên thanh công cụ:**
   - Mã nguồn: `<button onClick={handleExportMobileEquipment}>`.
   - **Thực tế:** Nút này được giữ lại từ bản cũ, nhưng hàm `handleExportMobileEquipment` đã bị xóa/chuyển đi nơi khác. Bấm vào là crash.

5. **`InfrastructureDevelopment.jsx:1714, 1764, 1891` - Xuất hợp đồng / biên bản khảo sát CSHT:**
   - Sử dụng biến `addressNewText` trong object xuất file Word.
   - **Thực tế:** Quên khai báo `const addressNewText = ...`.
   - **Hậu quả:** Xuất hợp đồng thuê trạm mới sẽ văng lỗi.

6. **`NetworkMap.jsx:1395` - Tìm kiếm trạm nâng cao:**
   - Gọi `categorizedActiveSites.filter(...)` nhưng biến đúng trong state là `activeSites`.

7. **`SranSiteModal.jsx:39, 173` - Mở xem chi tiết trạm SRAN:**
   - Kiểm tra `rawSwapSol.includes('3G4G')` nhưng chưa định nghĩa `rawSwapSol` từ `site.swap_solution`.

---

## 3. ĐỀ XUẤT GIẢI PHÁP CHIẾN LƯỢC

Thay vì dọn dẹp mù quáng 179 biến `no-unused-vars`, chúng ta tiếp cận theo **3 tầng ưu tiên chuẩn kỹ thuật**:

### 🎯 Tầng 1: CỨU HỘ RUNTIME (Bắt buộc & Ưu tiên số 1)
- Vá dứt điểm **32 vị trí `no-undef`**:
  - Thêm `import * as XLSX from 'xlsx'` vào `Datasites.jsx` và `InfrastructureDevelopment.jsx`.
  - Thay `fetchDefectsLogs()` thành `fetchData()` trong `DailyWork.jsx`.
  - Tạo hàm ghi log hoặc loại bỏ cuộc gọi lỗi `logActivity` trong `DailyWork.jsx`.
  - Bổ sung `const addressNewText = ...` trong hàm xuất Word của `InfrastructureDevelopment.jsx`.
  - Đổi `categorizedActiveSites` thành `activeSites` trong `NetworkMap.jsx`.
  - Khai báo `rawSwapSol` trong `SranSiteModal.jsx`.
  - Xóa hoặc gắn đúng handler cho nút `MPĐ Lưu Động` ở `Generator.jsx`.
- Sửa **2 lỗi `no-dupe-keys`** để tránh ghi đè logic ngầm.

### 🧹 Tầng 2: CẤU HÌNH ESLINT THÔNG MINH (`eslint.config.js`)
- Cấu hình bỏ qua biến unused nếu bắt đầu bằng dấu gạch dưới `_` (`argsIgnorePattern: "^_"`, `varsIgnorePattern: "^_"`). Điều này chuẩn hóa việc giữ các callback tham số như `(e, _idx)` hoặc `(_, r)`.
- Cấu hình môi trường React 19 để không bắt buộc cảnh báo khi không có `import React from 'react'`.

### 🚀 Tầng 3: TỰ ĐỘNG DỌN DẸP IMPORT & BIẾN THỪA (Tự động 100%)
- Với 179 cảnh báo `no-unused-vars`: đa số là các icon Lucide (`Search`, `Filter`, `CheckCircle`...) được import sẵn khi code nhưng giao diện sau đó thay đổi không dùng tới.
- Áp dụng plugin tự động dọn import hoặc script an toàn để loại bỏ các import thừa mà không tác động logic xử lý.

---

## 4. ĐÁNH GIÁ ĐỘ PHỨC TẠP & RỦI RO
- **Độ phức tạp:** Trung bình (Khoảng 30-45 phút thực hiện).
- **Rủi ro hồi quy:** Cực thấp vì:
  - Tầng 1 sửa các bug chắc chắn gây crash.
  - Tầng 2 chỉ đổi config.
  - Tầng 3 loại bỏ code chết.
- **Lợi ích mang lại:**
  - Ứng dụng TVT3 v2 loại bỏ triệt để các lỗi tiềm ẩn khi người dùng xuất Excel, xuất Word, xem modal trạm và báo hỏng.
  - Mã nguồn sạch sẽ, nhẹ nhàng, đạt chuẩn kiểm định cao nhất (từ 306 vấn đề xuống gần 0 vấn đề).

---

## 5. BƯỚC TIẾP THEO
Chuyển sang workflow `/plan` để lập kế hoạch chi tiết từng file cần can thiệp và tiến hành sửa chữa theo đúng quy trình chuẩn AWF.
