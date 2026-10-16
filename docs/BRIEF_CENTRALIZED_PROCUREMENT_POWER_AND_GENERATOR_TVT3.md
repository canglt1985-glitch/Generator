# 💡 BRIEF: ĐỀ XUẤT MUA SẮM TẬP TRUNG TỦ NGUỒN, RECTIFIER, ẮC QUY & MÁY PHÁT ĐIỆN CỐ ĐỊNH PHÙ HỢP TẢI 4G/5G ĐỊA BÀN TVT3

**Ngày tạo:** 15/10/2026  
**Chủ trì:** Đội ngũ VHKT & Antigravity TVT3  
**Phạm vi:** Đề xuất Mua sắm Tập trung Nguồn điện Viễn thông (Power & Generators)  
**Căn cứ đối chiếu:**
1. Dữ liệu rà soát tủ nguồn 564 trạm toàn tỉnh Đồng Nai (`Bao_Cao_Ra_Soat_Tu_Nguon_Thang_9_Dong_Nai.xlsx`)
2. Danh mục 154 trạm CRAN ưu tiên nguồn (`Ke_Hoach_Thang_9_Va_Uu_Tien_Nguon_CRAN.xlsx`)
3. Cơ sở dữ liệu VHKT TVT3: `tvt3_sites_snapshot.json` (412 trạm)
4. Danh mục thiết bị MPĐ cố định & lưu động: `Dung_Tich_Dau_May_Phat_Dien_Co_Dinh.xlsx` & `CangIt_Data/tu nguon.xlsx`

---

## 1. MỤC TIÊU & BỐI CẢNH ĐỀ XUẤT

- **Không gắn với dự án vô tuyến 5G Lowband**, mà xuất phát từ nhu cầu sống còn về **an toàn nguồn điện hạ tầng VHKT** phục vụ phát triển mạng 4G/5G và nâng cao chỉ tiêu chất lượng mạng (giảm MLL nguồn).
- **Thực trạng cấp bách:**
  1. Hàng loạt tủ nguồn DC, mô-đun Rectifier và tổ ắc quy (Accu) đưa vào khai thác từ giai đoạn 2007 – 2017 (trên 9 – 15 năm vận hành, hết sạch khấu hao), bị chai phù, suy giảm dung lượng nghiêm trọng.
  2. Nhiều trạm **Main HUB truyền dẫn** và **trạm CRAN ngoài trời** đang gánh tải 4G/5G nhưng **chưa có máy phát điện cố định** (phải dùng máy nổ xăng mini 5.5–7kVA đề tay) hoặc máy dầu cũ công suất quá nhỏ ($\le 6\text{--}8.5\text{ kVA}$) không đủ công suất gánh đồng thời trạm + nạp ắc quy, gây sập nguồn tức thì khi cúp điện.

---

## 2. PHÂN TÍCH ĐỐI CHIẾU CHIẾN LƯỢC MUA SẮM GIỮA CÁC TỔ VT (TỈNH ĐỒNG NAI)

Dựa trên dữ liệu 564 trạm toàn tỉnh:

| Chỉ số so sánh | Tổ VT1 (Biên Hòa, Vĩnh Cửu) | Tổ VT2 (Long Thành, Nhơn Trạch) | Tổ VT4 (Trảng Bom) | Tổ VT3 (TVT3 - 6 Huyện/Thị) | Nhận xét & Đánh giá |
|:---|:---:|:---:|:---:|:---:|:---|
| **Tổng số trạm rà soát** | 228 trạm | 129 trạm | 78 trạm | **119 trạm** | TVT3 chiếm địa bàn rộng nhất (chiếm 60% diện tích tỉnh). |
| **Cơ cấu trạm (CRAN / MACRO)** | 123 CRAN / 105 Macro | 100 CRAN / 29 Macro | 43 CRAN / 35 Macro | **67 CRAN / 52 Macro** | Trạm CRAN ngoài trời chiếm hơn 56% tại TVT3. |
| **Tỷ lệ đề xuất thay mới Tủ nguồn (P8)** | 45.2% (103 trạm) | **58.9% (76 trạm)** | 50.0% (39 trạm) | **35.3% (42 trạm)** | ⚠️ **TVT3 đề xuất quá thấp so với VT2 và VT4!** Cần nâng tỷ lệ thay mới lên $\ge 50\%$. |
| **Xu hướng chọn tủ Treo CRAN** | Treo 6kW: 117 trạm<br>Treo 9kW: 29 trạm | **Treo 9kW: 64 trạm (49.6%)**<br>Treo 6kW: 49 trạm | Treo 6kW: 51 trạm<br>Treo 9kW: 5 trạm | Treo 6kW: 54 trạm<br>**Treo 9kW: 19 trạm (16%)** | Tổ VT2 đi tắt đón đầu khi chọn **Treo 9kW** để đủ công suất cho 5G Massive MIMO; TVT3 cần học tập điểm này. |
| **Chiến lược Máy phát điện** | Đô thị hóa, điện lưới tốt, ưu tiên MPĐ cố định lớn $\ge 12.5\text{ kVA}$ cho Hub. | 100% MPĐ cố định có vỏ cách âm cho cụm Sân bay & KCN. | Cố định hóa MPĐ vùng cao su/đồi dốc. | Còn tồn tại **117 máy nổ xăng mini** và **52 trạm CRAN dùng máy xăng/máy nhỏ**. |

---

## 3. THỰC TRẠNG THIẾT BỊ NGUỒN & MÁY PHÁT ĐIỆN TẠI TVT3 (412 TRẠM)

### 3.1. Thực trạng Ắc quy (Accu) & Tủ nguồn DC
- **Về tuổi thọ Ắc quy:**
  - **439 tổ ắc quy** đưa vào sử dụng từ **năm 2017 trở về trước (tuổi thọ 9 – 19 năm)**!
  - Toàn bộ là ắc quy axit chì (Vision, Fiamm, Posmax, Shoto, C&D, Hoffum...) đã hết vòng đời kỹ thuật ($5\text{--}7\text{ năm}$), bị chai phù, sụt áp nhanh dưới 47V chỉ sau 15–30 phút cúp điện.
- **Về Tủ nguồn & Rectifier:**
  - Có tới **221 tủ Delta**, **203 tủ Emerson**, **99 tủ Eltek**, **24 tủ DongAh**. Trong đó hơn 120 tủ lắp đặt từ thời 2G/3G (2007–2012) dùng rectifier công suất thấp (1500W–2000W), thiếu khe cắm mở rộng, bo điều khiển CSU/SCU không hỗ trợ giám sát SNMP từ xa.

### 3.2. Thực trạng Máy phát điện cho Trạm Main HUB
- **Trạm HUB `DNLT22` (DNIXDU06 - Cẩm Đường):** Gom 4 trạm remote, đang có 5G, nhưng chỉ dùng **MPĐ KiBii 6.0 kVA** (đang hỏng ATS).
- **Trạm HUB `DNTP37` (DNITLA07 - Phú Lập):** Gom tới **7 trạm remote**, nhưng dùng MPĐ SBM 8.5 kVA, bồn dầu đáy chỉ **45 lít** (chạy tối đa 17 giờ là cạn).
- **Trạm HUB `DNLK24` (DNIBLC05 - Bình Lộc):** Gom 4 trạm remote, đang có 5G, MPĐ Vietgen 8.5 kVA, bồn dầu 45L.
- **Trạm HUB `DNTN31` (DNIDGI17 - Hưng Lộc):** Gom 3 trạm remote, đang có 5G, MPĐ Vietgen 8.5 kVA, bồn dầu 45L.

### 3.3. Thực trạng Máy phát điện cho 67 Trạm CRAN ngoài trời
- **38 trạm CRAN** đang dùng **máy nổ XĂNG mini (5.5 – 7 kVA)**: Đề nổ bằng tay, bình xăng 15–25L, hao xăng lớn ($3.15\text{--}4.02\text{ L/h}$), nguy cơ cháy nổ cực cao.
- **14 trạm CRAN** đang dùng **máy DẦU công suất nhỏ ($\le 6\text{--}7\text{ kVA}$)**: Quá tải khi gánh thêm trạm 4G/5G và nạp ắc quy.
- Chỉ có **15 trạm CRAN** có MPĐ Dầu đạt chuẩn $\ge 8.5$ kVA.

---

## 4. DANH MỤC ĐỀ XUẤT MUA SẮM TẬP TRUNG CHO TVT3

### 🔋 HẠNG MỤC 1: HỆ THỐNG NGUỒN DC (TỦ NGUỒN, RECTIFIER, ACCU)

1. **Mua sắm Tủ nguồn DC Treo Ngoài Trời (Outdoor 9kW) - Số lượng: 35 tủ:**
   - *Mục đích:* Thay thế tủ nguồn cũ và nâng cấp công suất cho 35 trạm CRAN gánh tải 4G+5G (thay vì dùng tủ 6kW như đề xuất cũ, nâng lên chuẩn 9kW giống Tổ VT2 để đảm bảo dự phòng công suất).
2. **Mua sắm Tủ nguồn DC Đặt Trong Nhà (Indoor 12kW) - Số lượng: 25 tủ:**
   - *Mục đích:* Thay thế cho các trạm Macro/trạm HUB có tủ Emerson/Eltek/DongAh đời 2007–2010 đã quá cũ nát, rỉ sét, hỏng bo giám sát.
3. **Mua sắm Mô-đun Rectifier 48V/3000W hiệu suất cao - Số lượng: 80 module:**
   - *Mục đích:* Cắm bổ sung vào các tủ nguồn hiện hữu (Delta, Vertiv, Emerson) còn khe cắm trống (Phương án P4) để nâng công suất cấp dòng DC cho thiết bị vô tuyến mới.
4. **Mua sắm Tổ Ắc quy Lithium LFP (48V - 100Ah / 150Ah) - Số lượng: 120 tổ:**
   - *Mục đích:* Thay thế khẩn cấp đợt 1 cho 120 trạm có ắc quy chì axit cũ (trước 2015) bị chai phù nặng.
   - *Ưu điểm:* Nhỏ gọn, nhẹ bằng 1/3 ắc quy chì, tuổi thọ $> 10$ năm, nạp xả sâu $90\%$, sạc đầy trong 2–3 giờ.

---

### ⚡ HẠNG MỤC 2: MÁY PHÁT ĐIỆN CỐ ĐỊNH CHUYÊN DỤNG (ATS, VỎ CHỐNG ỒN)

1. **MPĐ Diesel Cố định 12.5 kVA – 15 kVA (Cho Trạm Main HUB) - Số lượng: 6 máy:**
   - *Tiêu chuẩn:* Động cơ Diesel 3 pha, vỏ cách âm chống ồn, tủ ATS tự động 100%, bồn dầu đáy mở rộng $\ge 120$ lít (chạy liên tục $\ge 30\text{--}40\text{ giờ}$).
   - *Vị trí lắp:* `DNLT22`, `DNTP37`, `DNLK24`, `DNTN31`, `DNCM12`, `DNDQ34`.
2. **MPĐ Diesel Cố định 8.5 kVA – 10 kVA Ngoài Trời (Cho Trạm CRAN 4G/5G) - Số lượng: 38 máy:**
   - *Tiêu chuẩn:* Vỏ cách âm chống nước ngoài trời (IP55), kích thước nhỏ gọn đặt chân cột, tích hợp ATS tự động đề nổ, bồn dầu đáy $\ge 60$ lít (chạy liên tục $\ge 20$ giờ).
   - *Mục đích:* **Xóa sổ hoàn toàn 38 máy nổ xăng mini** tại các trạm CRAN TVT3, loại bỏ triệt để nguy cơ cháy nổ và chấm dứt tình trạng KTV phải chạy đi giật nổ bằng tay khi cúp điện.
3. **MPĐ Diesel Cố định 10 kVA (Nâng cấp trạm công suất nhỏ $\le 6$kVA) - Số lượng: 14 máy:**
   - *Mục đích:* Thay thế 14 máy dầu 5.5–6kVA cũ (KIBII, SBM, Denyo) đã hết khấu hao tại các trạm CRAN tải nặng.
   - *Điều chuyển:* 14 máy cũ sau khi bảo dưỡng sẽ được chuyển về làm máy dự phòng luân chuyển cho các trạm tải rất nhẹ hoặc trạm tạm.

---

## 5. BƯỚC TIẾP THEO

1. **Lập file Excel Bảng Tổng Hợp Chi Tiết:** Xuất file Excel chuẩn hóa danh sách trạm, mã tài sản cũ, thông số đề xuất mới để trình Phòng Kỹ thuật tỉnh Đồng Nai tổng hợp chung toàn tỉnh.
2. **Triển khai `/plan`:** Phân kỳ thực hiện theo 2 giai đoạn (Giai đoạn 1: Ưu tiên trạm Main HUB và 38 trạm CRAN máy xăng; Giai đoạn 2: Thay thế ắc quy Lithium và tủ nguồn).
