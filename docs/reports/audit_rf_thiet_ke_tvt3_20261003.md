# BÁO CÁO RÀ SOÁT & PHÂN LOẠI THIẾT KẾ RF TOÀN BỘ 412 TRẠM TVT3
**Ngày cập nhật:** 03/10/2026 (Phiên bản chuẩn hóa sau đối soát cùng User)  
**Căn cứ đối soát:** File thiết kế `ERA_RF_ALL_2026.xlsx` & Dữ liệu vận hành hệ thống (`datasites`, `datacells`).

---

## 1. TỔNG QUAN HIỆN TRẠNG 412 TRẠM TVT3

| Nhóm phân loại | Số lượng | Tỷ lệ | Đánh giá & Hướng xử lý |
|---|:---:|:---:|---|
| **1. Trạm CÓ TRONG file ERA_RF_ALL** | **301 trạm** | **73.1%** | **ĐÃ ĐỒNG BỘ 100%**: Toàn bộ 1,294 cell thuộc 301 trạm đã được cập nhật chuẩn xác vào `datacells` và `datasites` (Azimuth, Height, Tilt, Mtilt, Etilt). *(Bao gồm DNTP08, DNXL04, DNXL49...)*. Sai lệch số học = 0. |
| **2. Trạm ngoài ERA nhưng ĐÃ CÓ RF chuẩn** | **69 trạm** | **16.7%** | Trạm Macro ngoài phạm vi Swap đợt này nhưng đã có dữ liệu góc hướng vận hành thực tế chuẩn trong database (ví dụ: DNXL10, DNDQ21, DNDQ65, DNLK70, DNXL47, DNTP52...). |
| **3. Trạm đặc thù không cần góc hướng RF** | **19 trạm** | **4.6%** | Gồm 3 Hub AGG thuần truyền dẫn (không BTS), 14 trạm MORAN Host VNPT (dùng chung trạm VNPT), 2 trạm IBC / Small Cell (DAS trong nhà & Omni 360°). |
| **4. Trạm THỰC SỰ THIẾU THIẾT KẾ RF** | **23 trạm** | **5.6%** | **CẦN GỬI TEAM RF BỔ SUNG**: Gồm **18 trạm** đang phát sóng thực tế (đang bị gán tạm dummy 0°/120°/240° hoặc Azimuth 0°, bao gồm cả `DNLK05`, `DNLK09`, `DNXL07`, `DNDQ22`) + **5 vị trí đặc thù** (CAX, KDL Chứa Chan, Z30A). |
| **TỔNG CỘNG** | **412 trạm** | **100%** | |

---

## 2. KẾT QUẢ ĐỐI SOÁT CỤ THỂ DNLK05 & CÁC TRẠM CRAN

### 2.1. Trạm DNLK05 (Long Khánh - DNILKH00)
- **Kết quả kiểm tra trong `ERA_RF_ALL_2026.xlsx`:** **HOÀN TOÀN KHÔNG CÓ** trong bất kỳ sheet nào của file ERA.
- **Hiện trạng trên hệ thống:** Trạm đang có 16 cells (3G/4G/5G) nhưng các cell đang mang bộ 3 góc giả lập `0°, 120°, 240°` (dummy placeholder).
- **Kết luận:** `DNLK05` **thực sự thiếu thiết kế góc hướng RF vi mô chuẩn** và cần đưa vào danh sách gửi Team Vô tuyến bổ sung.
- Tương tự `DNLK05`, các trạm `DNLK09` (Hàng Gòn 2), `DNXL07` (Xuân Lộc 2) và `DNDQ22` (Thanh Sơn) cũng mang góc dummy `0/120/240` và đã được bổ sung vào danh sách cần lấy thiết kế.

### 2.2. Trạm DNTP08, DNXL04, DNXL49
- **`DNTP08` (`DNIPHO05` - Phú Hòa 5):** Có đầy đủ trong ERA (4G/5G: 115° / 260° / 350°, H=39m/41m, Tilt=3/5/4).
- **`DNXL04` (`DNIXDI02` - Xuân Định 2):** Có đầy đủ trong ERA (4G/5G: 30° / 140° / 260°, H=47m, Tilt=5/4/5).
- **`DNXL49` (`DNIXHO13` - Xuân Hòa 13):** Có đầy đủ trong ERA (4G/5G: 0° / 120° / 230°, H=41m, Tilt=4/5/4).

---

## 3. DANH SÁCH 23 TRẠM THỰC SỰ THIẾU THIẾT KẾ RF CẦN GỬI TEAM BỔ SUNG

### Nhóm 1: 18 Trạm Macro / CRAN Outdoor đang hoạt động thực tế (Ưu tiên số 1)

| STT | Mã cũ | Mã mới | Tên trạm | Huyện | Loại trạm | Vùng phủ | Số Cell | Tình trạng dữ liệu hiện tại | Đề xuất bổ sung |
|:---:|:---:|:---:|---|:---:|:---:|:---:|:---:|---|---|
| 1 | **DNLK05** | `DNILKH00` | Long Khánh | Long Khánh | 3G/4G/5G/CSG | MACRO | 16 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 2 | **DNLK06** | `DNIBLC01` | Bình Lộc 1 | Long Khánh | 3G/4G | CRAN OUT DOOR | 7 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 3 | **DNLK09** | `DNIHGO02` | Hàng Gòn 2 | Long Khánh | 3G/4G/CSG/ILA | MACRO | 10 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 4 | **DNLK10** | `DNILKH03` | Long Khánh 3 | Long Khánh | 3G/4G/CSG | MACRO | 6 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 5 | **DNLK42** | `DNIBVI14` | Bảo Vinh 14 | Long Khánh | 3G/4G | MACRO | 3 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 6 | **DNLK76** | `DNIBVI13` | Bảo Vinh 13 | Long Khánh | 3G/4G | CRAN OUT DOOR | 7 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 7 | **DNTN04** | `DNIDGI04` | Dầu Giây 4 | Thống Nhất | 3G/4G | CRAN OUT DOOR | 9 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 8 | **DNTN44** | `DNIDGI23` | Dầu Giây 23 | Thống Nhất | 3G/4G | CRAN OUT DOOR | 8 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 9 | **DNTN60** | `DNIDGI30` | Dầu Giây 30 | Thống Nhất | 4G | CRAN OUT DOOR | 1 | Azimuth = 0° (Chưa có góc sector) | Xin Azimuth, Height, Tilt thực tế |
| 10 | **DNTP29** | `DNITPU11` | Tân Phú 11 | Tân Phú | 3G/4G | MACRO | 12 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 11 | **DNTP38** | `DNITLA08` | Tà Lài 8 | Tân Phú | 3G/4G | MACRO | 9 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 12 | **DNXL07** | `DNIXLO02` | Xuân Lộc 2 | Xuân Lộc | 3G/4G/AGG | MACRO | 9 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 13 | **DNXL46** | `DNIXBA08` | Xuân Bắc 8 | Xuân Lộc | 3G/4G/AGG | MACRO | 6 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 14 | **DNXL64** | `DNIXPH05` | Xuân Phú 5 | Xuân Lộc | 3G/4G/CSG | MACRO | 6 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 15 | **DNXL75** | `DNIXLO26` | Xuân Lộc 26 | Xuân Lộc | 3G/4G/CSG | MACRO | 7 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 16 | **DNDQ18** | `DNIDQU06` | Định Quán 6 | Định Quán | 3G/4G | CRAN OUT DOOR | 6 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 17 | **DNDQ22** | `DNITNS00` | Thanh Sơn | Định Quán | 3G/4G | MACRO | 8 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |
| 18 | **DNDQ67** | `DNITNH10` | Thống Nhất 10 | Định Quán | 3G/4G | CRAN OUT DOOR | 11 | Đang gán tạm dummy (0°/120°/240°) | Xin Azimuth, Height, Tilt thực tế |

### Nhóm 2: 5 Vị trí trạm đặc thù / Phân trại / KDL Núi Chứa Chan (Ưu tiên số 2)

| STT | Mã trạm cũ/mới | Tên trạm | Khu vực | Loại trạm | Vùng phủ | Tình trạng hiện tại | Đề xuất |
|:---:|:---:|---|:---:|:---:|:---:|---|---|
| 19 | `DNICMYAP` | CAX Xuân Đông | Cẩm Mỹ | 3G/4G | CRAN OUT DOOR | Trạm CAX mới, chưa onair cell vô tuyến | Xin thiết kế quy hoạch khi phát sóng |
| 20 | `DNIXLO32` | KDL Núi Chứa Chan (Macro) | Xuân Lộc | 3G/4G | MACRO | Vị trí núi Chứa Chan, chưa có cell | Cần thiết kế anten định hướng núi |
| 21 | `DNIXLO33` | KDL Núi Chứa Chan (CRAN) | Xuân Lộc | 3G/4G | CRAN OUT DOOR | Vị trí núi Chứa Chan, chưa có cell | Cần thiết kế anten định hướng núi |
| 22 | `DNIXTCAP` | K2-Z30A | Xuân Lộc | 3G/4G | CRAN OUT DOOR | Phân trại giam Z30A (dummy 0/120/240) | Cần góc hướng chính xác theo khuôn viên |
| 23 | `DNIXTCBP` | K3-Z30A | Xuân Lộc | 3G/4G | CRAN OUT DOOR | Phân trại giam Z30A (dummy 0/120/240) | Cần góc hướng chính xác theo khuôn viên |
