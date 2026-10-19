# KẾ HOẠCH: CHUẨN HÓA BẢNG KHỐI LƯỢNG KÉO CÁP CAMERA XUÂN HÒA (BOQ ONLY)

**Mã kế hoạch:** `plans/261019-0905-xuanhoa-fiber-boq-refactor`  
**Ngày lập:** 19/10/2026  
**Người yêu cầu:** Anh Cương (`cang_it`)  
**Mục tiêu chính:** 
1. Tập trung 100% vào **KHỐI LƯỢNG KỸ THUẬT (BOQ)**, xóa bỏ hoàn toàn ước lượng đơn giá, chi phí tiền nong.
2. Triệt tiêu triệt để lỗi **Double Counting** (đoạn chung bị nhân đôi chiều dài cáp và nhân công rải cáp).
3. Làm rõ để người đọc dễ hiểu nhất: Cam 16 và Cam 22 đi chung tuyến R12 dài tổng cộng bao nhiêu mét (3,750 m cáp 8FO), phân đoạn thi công từng camera bao nhiêu mét, giải trình minh bạch hệ số dự phòng so với cự ly đo phẳng trên Google Maps.

---

## 1. VẤN ĐỀ VÀ PHÂN TÍCH HIỆN TRẠNG

* **Hiện trạng cũ:** 
  - File Excel và CSV đang gán trọn gói chiều dài từ trạm về từng cam độc lập. 
  - Tại tuyến R12 (DNXL18): Cam 16 ghi 2,000 m (8FO), Cam 22 ghi 3,750 m (8FO) $\rightarrow$ Người đọc cộng dồn thành 5,750 m, làm đội khống thêm 2.0 km cáp 8FO và nhân công kéo cáp.
  - Trên toàn bộ 54 camera, 11 tuyến đi chung bị đúp tổng cộng **15,589 m** cáp!
  - File đang chứa các cột chi phí ước tính (triệu đồng), đơn giá vật tư, nhân công... gây loãng và không phù hợp với hồ sơ bóc tách khối lượng kỹ thuật thuần túy.
  - Cự ly hiển thị bị cao hơn đo đi bộ trên Google Maps do nhân hệ số chùng cáp `SLACK = 1.12` (+12%) và làm tròn bội số 50m mà không có cột đối chiếu tim đường phẳng.

---

## 2. PHÂN CHIA GIAI ĐOẠN THỰC HIỆN (PHASES)

### Phase 1: Chuẩn hóa logic dữ liệu trong `optimize_shared_fiber_routes.py`
- [ ] Xóa bỏ toàn bộ các biến và trường đơn giá/chi phí (`CABLE_PRICE`, `INSTALL_PER_M`, `FOSC_COST`, `NEW_LSW_COST`, `cost`, `cur_cost`, `best_cost`).
- [ ] Tính toán cấu trúc dữ liệu mới cho từng camera `per_cam`:
  * `route_total_m`: Tổng chiều dài cáp toàn tuyến (ví dụ Cam 16 & 22 đều là 3,750 m).
  * `incremental_m`: Chiều dài phân đoạn rải thêm của cam đó trên cây cáp (Cam 16: 2,000 m; Cam 22: 1,750 m; tổng = 3,750 m).
  * `map_road_m`: Cự ly đo phẳng tim đường trên bản đồ (Zero-slack) để đối chiếu khớp Google Maps.
  * `path_to_hub_m`: Chiều dài sợi quang từ trạm về camera (phục vụ đo kiểm suy hao dBm).
  * `fosc`: Số lượng măng xông FOSC lắp tại camera đó (Cam 16: 1 FOSC; Cam 22: 0).
- [ ] Đảm bảo: Tổng `incremental_m` của mọi camera trong một route PHẢI CHÍNH XÁC BẰNG `route_total_m`.

### Phase 2: Thiết kế lại toàn bộ Bảng tính Excel & CSV trong `export_fiber_plan.py`
- [ ] **Sheet 1: `1. Khoi Luong Tuyen (BOQ)`** (Bảng trọng tâm):
  * Danh sách 40 tuyến cáp (R01 $\rightarrow$ R40).
  * Các cột: Tuyến, Trạm gốc, Các camera phục vụ, Loại cáp trục, Cáp 2FO (m), Cáp 4FO (m), Cáp 8FO (m), Cáp 12FO (m), **Tổng cáp rải trên cột (m)**, **Măng xông FOSC (cái)**, Thiết bị & Port tại trạm, Thuyết minh tuyến thi công.
  * Dòng TỔNG CỘNG: **53,361 m cáp**, **11 măng xông FOSC**, 54 camera.
- [ ] **Sheet 2: `2. Chi Tiet Camera (Cot H-L)`** (Bảng danh mục 54 camera):
  * Cột H, I, K, L theo mẫu chuẩn viễn thông.
  * Cột **`Tổng cáp cả tuyến (m)`**: Ghi 3,750 m cho cả Cam 16 & Cam 22.
  * Cột **`Cáp phân đoạn rải thêm (m)`**: Cam 16 ghi 2,000 m; Cam 22 ghi 1,750 m $\rightarrow$ Khi `=SUM()` ra đúng 3,750 m.
  * Cột **`Đo tim đường Maps (m)`**: Ghi nhận số đo phẳng không có hệ số dự phòng để đối chiếu Google Maps.
  * Cột **`Măng xông FOSC tại điểm`**: Cam 16 ghi 1 FOSC; Cam 22 ghi 0.
  * Cột **`Ghi chú thi công`**: Thuyết minh ngắn gọn, dễ hiểu: *"Tuyến R12: Đoạn 1 trạm $\rightarrow$ Cam 16 (2,000m), lắp FOSC trích cáp; Đoạn 2 kéo nối tiếp từ FOSC đến Cam 22 (1,750m)"*.
- [ ] **Sheet 3: `3. Thiet Bi & Port Tram`**: Thống kê số lượng port CSG và LSW cần dùng tại từng trạm.
- [ ] **File CSV `Cot_H_den_L_De_Copy_Paste.csv`**: Cập nhật đồng bộ các cột chuẩn hóa.
- [ ] Thêm dòng giải trình kỹ thuật định mức: *"Chiều dài cáp dự toán = Chiều dài đo tim đường trên bản đồ $\times 1.12$ (dự phòng võng cáp, lên cột và quấn dự phòng măng xông)"*.

### Phase 3: Chạy tái tạo dữ liệu, kiểm thử tự động & Cập nhật Google Drive
- [ ] Chạy pipeline tạo dữ liệu: `optimize_shared_fiber_routes.py` $\rightarrow$ `export_fiber_plan.py`.
- [ ] Chạy script kiểm thử tự động (Unit Test / Audit Check):
  * Kiểm tra `SUM(Cáp phân đoạn)` = `SUM(Tổng cáp 40 tuyến)` = 53,361 m (lệch = 0).
  * Kiểm tra Tuyến R12: Tổng = 3,750 m; Cam 16 = 2,000 m; Cam 22 = 1,750 m; FOSC = 1.
  * Kiểm tra toàn bộ 11 tuyến đi chung không có tuyến nào bị đúp.
  * Kiểm tra tuyệt đối không còn bất kỳ cột tiền/đơn giá nào trong toàn bộ file Excel/CSV.
- [ ] Kiểm tra file trên Google Drive đã sync thành công.

---

## 3. TIÊU CHÍ HOÀN THÀNH (ACCEPTANCE CRITERIA)
1. ✅ Tổng chiều dài cáp của toàn bộ dự án khi cộng dồn từ bảng camera KHÔNG ĐƯỢC VƯỢT QUÁ tổng chiều dài thực tế các tuyến cáp rải trên cột (53,361 m).
2. ✅ Người đọc nhìn vào Cam 16 và Cam 22 thấy ngay tổng tuyến là 3,750 m cáp 8FO, không bị rối rắm hay hiểu nhầm thành 5,750 m.
3. ✅ Bảng tính 100% là khối lượng kỹ thuật viễn thông (Mét cáp, Quy cách FO, Măng xông, Port trạm), không có giá tiền tạm tính.
4. ✅ Có số liệu đo phẳng trên Google Maps để đối chiếu thực địa khi đi bộ kiểm tra.
