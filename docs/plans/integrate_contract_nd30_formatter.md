# 📋 KẾ HOẠCH TRIỂN KHAI: TÍCH HỢP XUẤT PHỤ LỤC & TỰ ĐỘNG CHUẨN HÓA THỂ THỨC (NĐ 30/2020/NĐ-CP)

## 🎯 1. Mục tiêu (Objective)
Tích hợp trọn vẹn bộ tạo phụ lục hợp đồng từ repo `canglt1985-glitch/hop-dong-nha-tram-TVT3` vào module Quản lý Hợp đồng của web `TVT3` (`tvt3_v2`), đồng thời bổ sung tính năng **AI / Smart Formatter** tự động rà soát, dọn dẹp và chuẩn hóa văn bản Word theo **Nghị định 30/2020/NĐ-CP** (chống dư dấu `-`, chống thụt thò văn bản, chống lệch bảng, font Times New Roman chuẩn).

---

## 🏗️ 2. Phạm vi & Kiến trúc Kỹ thuật

```
[TVT3 Web Client (React)]
       │
       ├── 1. Chọn Trạm (Database Supabase: datasites)
       │
       ├── 2. Chọn Kịch bản & Mẫu văn bản (Phụ lục, Gia hạn, Thanh lý, BBLV...)
       │
       ├── 3. Engine Tính toán Chu kỳ (Aligned Cycles: Kỳ 1 lẻ ngày, ngày cuối tháng)
       │
       ├── 4. BỘ LỌC CHUẨN HÓA DỮ LIỆU & THỂ THỨC NĐ 30 (Smart Formatter)
       │       ├── Loại bỏ chuỗi rác: `-`, `--`, `0 đ`, trailing dots `.....`
       │       ├── Kiểm định logic: Tiền số vs Tiền chữ, Timeline liền mạch
       │       └── Ép chuẩn Word: Margin 20-30-20-15mm, Times New Roman, Indent 1.27cm
       │
       └── 5. Render & Download trực tiếp Word / Zip (docxtemplater + pizzip)
```

---

## 📝 3. Kế hoạch Thực hiện Chi tiết (Phân kỳ 4 Giai đoạn)

### Giai đoạn 1: Đồng bộ Templates & Dữ liệu Nghiệp vụ (Data & Templates Sync)
1. **Đồng bộ Template:** Copy toàn bộ 11 biểu mẫu `.docx` đã chuẩn hóa từ repo `scratch/hop-dong-nha-tram-TVT3/templates/` sang `tvt3_v2/public/templates/`:
   - `BBLV.docx` (Biên bản làm việc đồng hành)
   - `PHU_LUC_GIAM_GIA_MAT_BANG.docx` & `PHU_LUC_GIAM_GIA_CSHT.docx`
   - `THANH_LY_KY_LAI_MAT_BANG.docx` & `THANH_LY_KY_LAI_CSHT.docx`
   - `PHU_LUC_CHUYEN_CHU_THE_BEN_A.docx` & `PHU_LUC_CHUYEN_CHU_THE_BEN_B.docx`
   - `HOP_DONG_MOI_MAT_BANG.docx` & `HOP_DONG_MOI_CSHT.docx`
2. **Quy chuẩn Người đại diện ký bên A:**
   - Lê Tân Cảng: *"Tổ trưởng TVT3"* (Mặc định)
   - Lê Thanh Quang: *"chuyên viên TVT3"*
   - Trần Đăng Phan: *"Chuyên viên TVT3"*
3. **Phụ cấp VHKT (600.000đ):** Chống cộng lặp phí bảo vệ nếu dữ liệu trạm đã có trường VHKT độc lập.

---

### Giai đoạn 2: Nâng cấp Thuật toán Tính toán & Dọn chuỗi rác (Core Engine)
1. **Chuyển đổi Thuật toán Chu kỳ thanh toán thông minh (`contractCalculations.ts`):**
   - Xử lý Kỳ 1 lẻ ngày (ví dụ: ngày 09/04 -> Kỳ 1 tròn ngày đến 31/10, các kỳ sau chuẩn từ ngày mùng 1).
   - Ngày kết thúc gia hạn 5 năm tự động chốt vào ngày cuối cùng của tháng (`30/04/2031`).
2. **Xây dựng module `smartContractSanitizer.ts` (Dọn dẹp chuỗi rác):**
   - Loại bỏ triệt để các dấu `-`, `--`, `- -` khi trường dữ liệu rỗng.
   - Chuyển đổi các giá trị `0` của các hạng mục không thuê (máy phát, bệ máy, phòng máy) thành chuỗi rỗng sạch sẽ.
   - Xử lý các dòng chấm lửng `..................` khi trạm đã có hồ sơ pháp lý thực tế.

---

### Giai đoạn 3: Module Kiểm định & Ép chuẩn Thể thức NĐ 30/2020/NĐ-CP
1. **Xây dựng module `nd30WordPostProcessor.ts`:**
   - **Font chữ:** Ép 100% các Run trong XML của file docx về `Times New Roman`.
   - **Căn lề (Page Margins):** Lề trên: `20mm`, Lề dưới: `20mm`, Lề trái: `30mm` (đóng gáy), Lề phải: `15mm`.
   - **Thụt đầu dòng (Indents):** Chuẩn hóa khoảng thụt đầu dòng các đoạn văn bản về `1.27cm` (trừ tiêu đề và điều khoản).
   - **Căn chỉnh Bảng biểu (Table Align):** Ép bảng căn giữa hoặc căn sát lề, phân bổ lại độ rộng cột để tránh rớt chữ/số tiền.
   - **Chữ ký & Nơi nhận:** Đảm bảo bố cục nơi nhận góc trái dưới, khối chữ ký góc phải dưới, chèn ngắt dòng/ngắt trang hợp lý chống chữ ký bị rớt trang mồ côi.

---

### Giai đoạn 4: Tích hợp Giao diện (UI/UX) & Kiểm thử Tự động
1. **Cập nhật Component `ContractExportButton.jsx` & `ContractDetailPanel.jsx`:**
   - Dropdown chọn Người đại diện ký (Anh Cảng / Anh Quang / Anh Phan).
   - Checkbox tuỳ chọn: *"Tự động chuẩn hóa thể thức Nghị định 30/2020/NĐ-CP"* (Mặc định: BẬT).
   - Hỗ trợ xuất đồng thời file Hợp đồng + Biên bản `BBLV.docx` (tải từng file hoặc đóng gói file `.zip`).
2. **Kiểm thử (Verification & Test Cases):**
   - Test xuất trạm MobiFone (`MBF`) -> Mẫu Mặt bằng.
   - Test xuất trạm Xã hội hóa (`CSHT`) -> Mẫu CSHT.
   - Test các trường hợp trạm thiếu thiết bị để kiểm tra việc không bị dư dấu `-`.
   - Mở file xuất ra trên Microsoft Word kiểm tra lề 30-15-20-20mm và font Times New Roman.

---

## ⏱️ 4. Dự kiến Kết quả Đầu ra
* Bản Word xuất ra đẹp không tì vết, đúng chuẩn thể thức hành chính Nghị định 30.
* Không còn lỗi dư dấu gạch ngang, không bị lệch bảng hay thụt đầu dòng nham nhở.
* Tiết kiệm 100% thời gian anh em phải ngồi chỉnh tay lề, font, format trước khi in trình ký.
