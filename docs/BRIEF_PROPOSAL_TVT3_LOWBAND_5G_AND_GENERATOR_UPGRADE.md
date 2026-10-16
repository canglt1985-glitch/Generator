# 💡 BRIEF: PHÂN TÍCH ĐỐI CHIẾU ĐỀ XUẤT RAN 2026 CÁC TỔ VT1,2,4,5 VÀ QUY HOẠCH NÂNG CẤP MÁY PHÁT ĐIỆN CHO TRẠM MAIN & 5G ĐỊA BÀN TVT3

**Ngày tạo:** 15/10/2026  
**Chủ trì thực hiện:** Đội ngũ VHKT & Antigravity TVT3  
**Căn cứ tài liệu:**
1. File Excel TCT: `T_TCT_Báo cáo đề xuất vị trí lắp đặt thiết bị băng tần thấp thuộc các dự án RAN 2026 MBF.ĐNa.xlsx`
2. Cơ sở dữ liệu VHKT TVT3: `tvt3_sites_snapshot.json` (412 trạm)
3. Danh mục thông số MPĐ cố định & lưu động: `Dung_Tich_Dau_May_Phat_Dien_Co_Dinh.xlsx` & `B4. Biểu mẫu chuyên môn sua DHKK & MPD`

---

## 1. BỐI CẢNH & VẤN ĐỀ CẦN GIẢI QUYẾT

1. **Về phân bổ 5G Lowband Dự án RAN 2026:**
   - Trong file đề xuất gốc của TCT, danh sách 218 trạm (Sheet2) có sự nhầm lẫn lớn khi gộp 150 trạm Nokia của Bình Phước vào Đồng Nai.
   - Thực tế tỉnh Đồng Nai chỉ có **68 trạm Ericsson** (TVT3 chiếm áp đảo với **56 trạm = 82.4%**).
   - Tuy nhiên, thuật toán lọc của TCT chỉ dựa trên VLR 5G và Data 4G, gây hiện tượng **dồn cục 5–6 trạm/xã** tại các vùng nông thôn (Xuân Đông, Tà Lài, Thanh Sơn) gây lãng phí sóng Lowband và can nhiễu đồng tần, trong khi **3 tuyến cao tốc lớn** chạy qua TVT3 (Dầu Giây – Tân Phú, Dầu Giây – Phan Thiết, Long Thành – Dầu Giây) lại chưa có trạm đón đầu.

2. **Về thực trạng nguồn điện dự phòng (Máy Phát Điện - MPĐ):**
   - Khi triển khai 5G Lowband (hoặc 5G Midband), tải tiêu thụ điện tăng vọt thêm 1.5 – 3.0 kW/trạm.
   - Toàn địa bàn TVT3 hiện có **117 trạm đang dùng máy nổ XĂNG mini lưu động (5.5kVA – 7kVA)** đặt tạm tại trạm, nguy cơ cháy nổ cao, không có ATS tự động, bình xăng nhỏ (15–30L) và công suất không đủ gánh tải khi lắp thêm thiết bị 5G.
   - Thậm chí, **ngay trong 56 trạm đề xuất 5G Lowband của TVT3, có tới 21 trạm (37.5%) đang dùng máy xăng hoặc máy dầu công suất nhỏ $\le 7$kVA**, dẫn đến nguy cơ sập nguồn / nhảy aptomat máy phát khi mất điện lưới kéo dài.
   - Các trạm **Main HUB truyền dẫn** gom từ 4 đến 7 trạm con nhưng một số vị trí máy phát điện chỉ có 6kVA – 8.5kVA với bồn dầu quá nhỏ, nguy cơ rớt MLL dây chuyền diện rộng.

---

## 2. PHÂN TÍCH ĐỐI CHIẾU ĐỀ XUẤT CỦA CÁC TỔ VT1, VT2, VT4, VT5

| Đơn vị | Địa bàn phụ trách | Số trạm 5G Lowband đề xuất | Chiến lược phân bổ & Nguồn điện | Bài học kinh nghiệm rút ra cho TVT3 |
|:---|:---|:---:|:---|:---|
| **Tổ VT1** | TP. Biên Hòa, Vĩnh Cửu | **2 trạm** (`DNBH`, `DNVC`) | Vùng đô thị mật độ cao: Không ưu tiên Lowband (dành tài nguyên triển khai 5G Midband NR26/35 để giải phóng dung lượng). Nguồn điện lưới rất ổn định; MPĐ đa số $\ge 12.5\text{ kVA}$. | TVT3 tại các đô thị tập trung (TT. Long Khánh, TT. Gia Ray, TT. Định Quán) đã có 5G Midband thì **không nên nhồi thêm Lowband**, tránh can nhiễu. |
| **Tổ VT2** | Long Thành, Nhơn Trạch | **2 trạm** (`DNLT`, `DNNT`) + 1 trạm quy hoạch QH Sân bay | Tập trung bao quanh đại công trường Sân bay Quốc tế Long Thành và KCN. Đề xuất nguồn điện yêu cầu 100% MPĐ cố định có vỏ cách âm, ATS tự động. | TVT3 cần bám sát nút giao cao tốc Long Thành – Dầu Giây & Vành đai 4 (`DNCM27`, `DNCM38`) để kết nối đồng bộ hướng tuyến với Tổ VT2. |
| **Tổ VT4** | Trảng Bom | **8 trạm** (`DNTB16`, `DNTB23`, `DNTB31`, `DNTB57`...) | Bán đô thị ven QL1A và vùng đồi cao su: Dùng 5G Lowband để phủ sóng dải rộng các xã thưa trạm (Bàu Hàm, Hưng Thịnh). | Cách làm của VT4 rất chuẩn xác cho địa hình đồi dốc/cao su: tận dụng góc phủ xa của Lowband để xóa vùng lõm diện rộng. |
| **Tổ VT5** | Bình Phước (Khối quản lý liên tỉnh) | **150 trạm** (Nokia) | Địa bàn đồi núi, rừng cao su bạt ngàn, cự ly trạm 5–10 km: Đề xuất 100% 5G Lowband phủ diện rộng. Do di chuyển ứng cứu mất 2–4h, họ yêu cầu **100% MPĐ cố định $\ge 10\text{--}12.5\text{ kVA}$ có ATS và bồn dầu chạy $> 24\text{h}$**. | **Đây là kim chỉ nam cho TVT3:** Địa bàn Định Quán, Tân Phú, Xuân Lộc, Cẩm Mỹ địa hình trải rộng tương tự, việc ứng cứu máy lưu động rất chậm trễ, bắt buộc phải nâng cấp MPĐ cố định cho các trạm 5G và trạm HUB! |

---

## 3. THỰC TRẠNG CHI TIẾT MÁY PHÁT ĐIỆN TẠI ĐỊA BÀN TVT3 (412 TRẠM)

### 3.1. Phân loại hình thức nguồn dự phòng toàn mạng TVT3
- **Máy phát DẦU DIESEL cố định (chuyên dụng, vỏ cách âm, ATS):** **273 trạm (66.3%)**
- **Máy nổ XĂNG lưu động mini (5.5 kVA – 7 kVA, đề tay/giật nổ):** **117 trạm (28.4%)**
- **Hoàn toàn CHƯA CÓ MPĐ (Trắng nguồn dự phòng):** **22 trạm (5.3%)**
  - *14 trạm MORAN dùng chung cột (Vina/Viettel):* `DNICMYM1..M4`, `DNIDQUM1..M2`, `DNILKHM1..M2`, `DNITPHM1..M2`, `DNIXLOM0..M3`.
  - *8 trạm 3G/4G độc lập:* `DNICMYAP`, `DNIDGI31`, `DNILKH15`, `DNITNH11`, `DNIXHO19`, `DNIXLO32`, `DNIXLO33`, `DNIXTCAP`.

### 3.2. Rà soát Máy phát điện tại các trạm Main HUB truyền dẫn
Trạm HUB nếu sập nguồn sẽ làm mất liên lạc dây chuyền toàn bộ các trạm remote con:
- **HUB `DNLT22` (DNIXDU06 - Cẩm Đường):** Gom 4 trạm remote, đã có 5G, nhưng MPĐ chỉ là **KiBii 6.0 kVA** ➔ **CỰC KỲ NGUY HIỂM, CẦN NÂNG CẤP NGAY LÊN 15 kVA**.
- **HUB `DNTP37` (DNITLA07 - Phú Lập):** Gom tới **7 trạm remote**, nhưng MPĐ chỉ là SBM 8.5 kVA, bồn dầu đáy chỉ **45 lít** (chạy tối đa 17 giờ là cạn) ➔ Cần nâng cấp lên **12.5 kVA – 15 kVA**, trang bị bồn dầu phụ $\ge 100$ lít.
- **HUB `DNLK24` (DNIBLC05 - Bình Lộc):** Gom 4 trạm remote, đã có 5G, MPĐ Vietgen 8.5 kVA, bồn dầu 45L ➔ Cần nâng cấp lên **12.5 kVA**.
- **HUB `DNTN31` (DNIDGI17 - Hưng Lộc):** Gom 3 trạm remote, đã có 5G, MPĐ Vietgen 8.5 kVA, bồn dầu 45L ➔ Cần nâng cấp lên **12.5 kVA**.

### 3.3. Rà soát Máy phát điện tại 56 trạm đề xuất 5G Lowband
- **Trạm dùng máy nổ XĂNG mini (5.5 – 6 kVA):** **15 trạm** (`DNXL72`, `DNCM42`, `DNXL54`, `DNCM41`, `DNTN47`, `DNCM39`, `DNXL73`, `DNCM50`, `DNDQ42`, `DNDQ22`...)
- **Trạm dùng máy DẦU công suất nhỏ ($\le 7$ kVA):** **6 trạm**
- **Trạm dùng máy DẦU chuẩn ($\ge 8.5$ kVA):** 35 trạm
- ➔ **Tỷ lệ trạm 5G Lowband chưa đạt chuẩn nguồn điện dự phòng: 21 / 56 trạm (37.5%)!**

---

## 4. PHƯƠNG ÁN ĐỀ XUẤT ĐỘT PHÁ CHO TVT3

### 4.1. Về Quy hoạch Vị trí 5G Lowband (13 Cặp Điều Chuyển)
- Giữ nguyên chỉ tiêu **56 trạm** nội bộ TVT3.
- Rút bớt các trạm dồn cục dày (Xuân Đông 6 trạm ➔ 3 trạm; Tà Lài 6 trạm ➔ 2 trạm; Thanh Sơn 5 trạm ➔ 2 trạm; Xuân Hòa 4 trạm ➔ 1 trạm).
- Điều chuyển tăng cường bao phủ liên tục:
  - **Cao tốc Dầu Giây – Tân Phú (6 trạm):** `DNTN15`, `DNDQ32`, `DNDQ26`, `DNTP30`, `DNTP35`, `DNTP14`, `DNTP02`.
  - **Cao tốc Long Thành – Dầu Giây (2 trạm):** `DNCM27`, `DNCM38`.
  - **Cao tốc Dầu Giây – Phan Thiết (2 trạm):** `DNLK71`, `DNXL62`.
  - **Vùng kinh tế & Du lịch (3 trạm):** Sầu riêng Lâm San `DNCM23`, KDL Núi Chứa Chan `DNXL01`, dải dân cư Phú Bình `DNTP35`.

### 4.2. Về Quy hoạch & Đề xuất Nâng cấp Máy Phát Điện
1. **Gói 1: Nâng cấp khẩn cấp cho 4 trạm Main HUB xung yếu:**
   - Thay thế máy phát hiện hữu bằng **MPĐ Diesel 12.5 kVA – 15 kVA 3 pha**, bồn dầu đáy dung tích lớn chạy liên tục $\ge 30$ giờ, trang bị tủ ATS tự động 100%.
2. **Gói 2: Thay thế máy nổ xăng cho 21 trạm 5G Lowband có nguy cơ quá tải:**
   - Đề xuất trang bị **MPĐ Diesel cố định 8.5 kVA – 10 kVA** có vỏ cách âm ngoài trời, loại bỏ hoàn toàn máy nổ xăng trong phòng máy để đảm bảo an toàn PCCC và độ ổn định điện áp khi phát sóng 5G.
   - Thu hồi 15 máy nổ xăng về kho Tổ làm phương tiện dự phòng cơ động khi có bão lũ / thiên tai.
3. **Gói 3: Xử lý 22 trạm chưa có MPĐ:**
   - *14 trạm MORAN:* Ký phụ lục thỏa thuận sử dụng chung nguồn MPĐ với Vina/Viettel, thanh toán bù trừ nhiên liệu thực tế.
   - *8 trạm độc lập:* Đề xuất cấp mới 4 MPĐ cố định 8.5 kVA cho các trạm xa trung tâm; 4 trạm gần đường lớn duy trì cơ chế ứng cứu máy lưu động trong vòng 45 phút.
4. **Gói 4: Tách luồng bảo trì & mua sắm:**
   - Áp dụng triệt để quy trình tách luồng: **Hỏng ắc quy đề ➔ Đề xuất mua sắm tập trung nội bộ tỉnh (12V-70Ah/100Ah)**; **Hỏng động cơ/đầu phát/ATS ➔ Lập biểu mẫu TVT3-B4 trình Ban 4 TCT phê duyệt sửa chữa**.

---

## 5. BƯỚC TIẾP THEO (NEXT STEPS)

- 1️⃣ **Chuyển sang `/plan`**: Lập kế hoạch chi tiết, bảng dự toán kinh phí và phân kỳ đầu tư cho 4 gói nâng cấp MPĐ và điều chuyển 5G.
- 2️⃣ **Gắn dữ liệu vào Excel**: Bổ sung thêm Sheet tổng hợp hiện trạng & đề xuất MPĐ trực tiếp vào file Excel trên Desktop để gửi Lãnh đạo Trung tâm / TCT.
- 3️⃣ **Điều chỉnh theo ý kiến KTV**: Hiệu chỉnh lại danh sách trạm HUB hoặc mức công suất theo yêu cầu riêng.
