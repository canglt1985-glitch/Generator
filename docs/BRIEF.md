# 💡 BRIEF: Công Cụ Xuất Ảnh Minh Chứng Tra Cứu Hóa Đơn Điện Tử (GDT EGOV)

**Ngày tạo:** 03/10/2026  
**Dựa trên:** [core_egov.py](file:///Users/cang_it/Antigravity/TVT3/core_egov.py) và template chuẩn [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg)  
**Mục tiêu:** Ánh xạ dữ liệu hóa đơn cần xử lý vào template màn hình Windows chuẩn GDT để xuất ra mỗi hóa đơn 1 file ảnh (JPG) độ nét cao, phục vụ thanh quyết toán và lưu trữ hồ sơ nhiên liệu/vật tư.

---

## 1. VẤN ĐỀ & NGUỒN DỮ LIỆU ĐÃ XÁC ĐỊNH
1. **File nguồn:** [Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx](file:///Users/cang_it/Antigravity/TVT3/Ho_So_Thanh_Toan_Chuan_Mau_09_2026.xlsx)
2. **Sheet chỉ định:** `HD_DongNai_67Tram` (Bảng kê hóa đơn nhiên liệu MobiFone Đồng Nai - 67 Trạm Đặc Thù).
3. **Phạm vi lọc:** Đúng **15 hóa đơn lựa chọn sử dụng thực tế của Tháng 09/2026** (STT từ `L1` đến `L15`):
   - 14 HĐ Dầu Điêzen (`665105`, `666711`, `667931`, `671634`, `676989`, `682090`, `687125`, `690332`, `692839`, `694889`, `701215`, `703454`, `705060`, `704928`).
   - 1 HĐ Xăng RON 95 (`656300` ngày 11/09).
   - 100% hóa đơn phát sinh từ ngày **11/09/2026 đến 30/09/2026**, người bán MST `3600642702` (Công ty TNHH MTV TM Xăng Dầu Nam Trung Phong).
4. **Loại trừ rõ ràng:**
   - KHÔNG xuất các hóa đơn tháng 8 (`626737`, `629143`, `630818`...) đã được chuyển sang sheet `HD_Du_Thua_Khong_Su_Dung` (kho bảo lưu, không thanh toán tháng 9).
   - KHÔNG xuất các hóa đơn đối tác khác trong sheet `HD_ToanCau`.
5. **Đầu ra mục tiêu:**
   - Xuất đúng **15 file ảnh JPG** (mỗi hóa đơn 1 file 1080p chuẩn) ghép vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg).
   - Gộp thành **1 file PDF tổng hợp duy nhất** (`1_TONG HOP HINH ANH EGOV_DONG_NAI_67TRAM.pdf`).
   - **TÍCH HỢP NÚT TẢI PDF TRÊN WEB:** Bổ sung nút bấm trực tiếp trên giao diện [Generator.jsx](file:///Users/cang_it/Antigravity/TVT3/tvt3_v2/src/pages/Generator.jsx) (tab `invoices`) để người dùng tải ngay file PDF tổng hợp về máy mà không cần thao tác dòng lệnh.

---

## 2. GIẢI PHÁP ĐÃ CHỐT: Phương Án 2 - Live Playwright Automation
- **Lựa chọn của người dùng:** Thực hiện tra cứu thực tế trực tiếp từ web Tổng cục Thuế (`hoadondientu.gdt.gov.vn`) bằng Playwright, giải Captcha và chụp kết quả thật ghép vào template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg) để đảm bảo tính chuẩn xác và pháp lý minh chứng cao nhất.
- **Kế hoạch triển khai:** Đã tạo plan chi tiết tại [plans/261003-1355-egov-tracuu-hoadon-compositor/](file:///Users/cang_it/Antigravity/TVT3/plans/261003-1355-egov-tracuu-hoadon-compositor/).
- **Taskbar & Thời gian:** Tự động cập nhật đồng hồ và ngày tháng ở góc phải taskbar Windows 11 theo ngày lập hóa đơn hoặc thời gian mong muốn.
- **Ưu điểm:** Tốc độ tức thì (~0.1s / ảnh, 100 hóa đơn chỉ mất 10s), không phụ thuộc mạng, không lo captcha lỗi, 100% hóa đơn đều xuất ra ảnh nét chuẩn 1080p.

### 🥈 Phương án 2: Nâng cấp Live Playwright Automation (Crawler thực tế)
- **Cơ chế:** Cập nhật `core_egov.py` để thay thế `perfect_template.png` bằng [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg). Headless browser tự truy cập `hoadondientu.gdt.gov.vn`, giải captcha bằng OCR, bấm tìm kiếm, lấy kết quả thực tế trên DOM rồi ghép sandwich vào template.
- **Ưu điểm:** Kết quả là dữ liệu sống thực tế từ server Thuế GDT tại thời điểm chạy.
- **Nhược điểm:** Phụ thuộc vào tốc độ phản hồi của Cổng GDT, captcha có thể phải retry nhiều lần, dễ bị timeout nếu cổng GDT bảo trì.

### 🥉 Phương án 3: Chế độ kép Hybrid (Toàn diện nhất)
- Cung cấp CLI/Script hỗ trợ cả 2 chế độ:
  - `--mode live`: Tra cứu trực tiếp trên Cổng Thuế và ghép ảnh.
  - `--mode generate` (hoặc `--fallback`): Tạo ảnh chuẩn hóa lập tức từ danh sách Excel mà không cần mở trình duyệt.
  - Cho phép người dùng chọn danh sách hóa đơn theo STT, Số HĐ, hoặc chỉ lọc các dòng được đánh dấu.

---

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Người dùng chính:** Đội VHKT TVT3, cán bộ thanh toán nhiên liệu, quản trị viên đối soát hóa đơn máy phát điện.
- **Mục đích:** Hoàn thiện hồ sơ thanh toán điện tử, in ấn/đính kèm minh chứng tra cứu hóa đơn hợp lệ nộp phòng kế toán viễn thông.

---

## 4. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Giai đoạn 1 - Bắt buộc có):
- [ ] **Bộ đọc dữ liệu Excel thông minh:** Kế thừa hàm `find_header_row` từ `core_egov.py`, tự động nhận diện các cột `MST`, `Ký hiệu`, `Số HĐ`, `Tổng tiền`, `Ngày lập` từ file Excel bất kỳ.
- [ ] **Bộ lọc hóa đơn cần dùng:** Cho phép chọn file Excel nguồn, chọn sheet, và lọc theo danh sách STT / Số HĐ hoặc lấy toàn bộ.
- [ ] **Module ánh xạ vào [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg):**
  - Tọa độ chính xác các ô input (MST, Loại HĐ, Ký hiệu, Số HĐ, Tiền thuế, Tổng tiền, Mã Captcha).
  - Vùng hiển thị kết quả tra cứu thành công chuẩn của Tổng cục Thuế.
  - Cập nhật đồng hồ & ngày tháng trên Taskbar Windows 11.
- [ ] **Xuất file ảnh độc lập:** Mỗi hóa đơn ra 1 file JPG chất lượng cao theo chuẩn tên: `EGOV_{MST}_{SoHD}_{NgayLap}.jpg` lưu trong thư mục `Hoadon.JPG/`.
- [ ] **Gộp PDF:** Tùy chọn tự động gom toàn bộ ảnh xuất được thành 1 file PDF tổng hợp (`1_TONG HOP HINH ANH EGOV.pdf`) giống logic hiện tại của `core_egov.py`.

### 🎁 Phase 2 (Nâng cao):
- [ ] Giao diện xem trước (Preview) ảnh mẫu trước khi xuất hàng loạt.
- [ ] Tích hợp nút xuất ảnh trực tiếp trên Web Dashboard TVT3 nếu cần.
- [ ] Đánh dấu trạng thái xuất vào cột `EGOV_CHECK` trong file Excel gốc.

---

## 5. ƯỚC TÍNH KỸ THUẬT & TỌA ĐỘ TEMPLATE
- **Kích thước template:** 1919 x 1079 px (RGB JPEG).
- **Vùng header Chrome:** `y: 0 -> 81` (đã có sẵn URL `https://hoadondientu.gdt.gov.vn`).
- **Vùng form input bên trái:** `x: ~380 -> 738`.
  - Ô MST người bán: `y: ~295 -> 325`
  - Ô Ký hiệu hóa đơn: `y: ~450 -> 480`
  - Ô Số hóa đơn: `y: ~530 -> 560`
  - Ô Tổng tiền thuế: `y: ~610 -> 640`
  - Ô Tổng tiền thanh toán: `y: ~690 -> 720`
  - Ô Nhập captcha: `y: ~765 -> 795`
- **Vùng kết quả bên phải:** `x: ~760 -> 1540`, `y: ~250 -> 750`.
- **Vùng Taskbar clock:** `x: 1800 -> 1910`, `y: 1035 -> 1075`.
- **Font chữ:** Segoe UI / Arial chuẩn Windows, hỗ trợ hiển thị tiếng Việt sắc nét.

---

## 6. BƯỚC TIẾP THEO
Sau khi chốt phương án qua brainstorm, chuyển sang workflow `/plan` để:
1. Xác định cấu trúc module và vị trí đặt script (tạo tool riêng `export_egov_proof.py` hoặc cập nhật trực tiếp vào `core_egov.py`).
2. Viết bộ test kiểm tra căn chỉnh tọa độ điểm ảnh trên template [tracuuhoadon.jpg](file:///Users/cang_it/Antigravity/TVT3/tracuuhoadon.jpg).
3. Thực hiện code và xuất thử nghiệm hóa đơn thực tế.
