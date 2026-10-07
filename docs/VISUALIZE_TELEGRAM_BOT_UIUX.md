# 🖼️ VISUALIZE: Thiết Kế UI/UX & Giao Diện Thẻ Tin Nhắn Telegram Bot TVT3

**Ngày tạo:** 07/10/2026  
**Chủ đề:** Mockup giao diện, cấu trúc bàn phím Inline Keyboard, hệ thống Icon & Emoji cho Bot DataSite & Hợp đồng  
**Tác giả:** Antigravity UX Director & Cang_IT  
**Trạng thái:** Complete Visual Specifications  

---

## 1. NGUYÊN TẮC THIẾT KẾ VISUAL TELEGRAM (TELEGRAM UI/UX GUIDELINES)

Trên Telegram không có file CSS tùy biến, nhưng trải nghiệm người dùng phụ thuộc vào **nghệ thuật định dạng tin nhắn**:
1. **Phân cấp thị giác bằng Emoji (Visual Hierarchy):** Mỗi dòng thông tin có một icon đại diện rõ ràng giúp mắt KTV quét thông tin trong 1 giây mà không cần đọc hết chữ.
2. **Chạm để Copy (Click-to-Copy Monospace):** Các thông số quan trọng (Mã trạm, Mã PE điện lực, Số tài khoản ngân hàng, Mật khẩu khóa số) luôn được bọc trong cú pháp `code` để KTV chỉ cần chạm ngón tay vào là tự động copy vào clipboard điện thoại.
3. **Nút bấm 2 cột cân đối (Two-Column Keyboard Grid):** Bàn phím Inline Keyboard được sắp xếp thành hàng đôi cân đối, vừa vặn trên mọi kích thước màn hình smartphone từ iPhone mini đến màn hình lớn.
4. **Không Spam Tin Nhắn (In-Place Message Edit):** Khi bấm nút chuyển tab, bot chỉnh sửa nội dung của chính tin nhắn hiện tại (`edit_message_text`), không gửi tin nhắn mới làm trôi màn hình chat.

---

## 2. HỆ THỐNG MÃ HÓA MÀU SẮC & EMOJI (VISUAL TOKENS)

| Emoji | Ý nghĩa trực quan | Vị trí sử dụng |
|:---:|---|---|
| 📍 | Nhận diện vị trí / Tọa độ trạm | Tiêu đề trạm, Link Google Maps |
| 🟢 | Hoạt động bình thường / Hợp đồng còn hạn | Trạng thái phát sóng, Badge hợp đồng |
| 🟡 | Cảnh báo / Sắp hết hạn trong 30 ngày | Hợp đồng sắp hết hạn, công nợ cần thanh toán |
| 🔴 | Nguy hiểm / Đã hết hạn / MLL | Hợp đồng quá hạn, sự cố trạm |
| ⚡ | Điện lực / Hạ tầng / MPD / Ắc quy | Nút bấm & tab Hạ tầng Nguồn |
| 📜 | Hợp đồng thuê mặt bằng / Pháp lý | Nút bấm & tab Hợp đồng |
| 💰 | Tài chính / Giá thuê / Tiền điện khoán | Khối đơn giá tiền thuê |
| 🏦 | Tài khoản ngân hàng / Thanh toán | Khối ngân hàng chủ đất |
| 🔑 | Chìa khóa / Mật mã ổ khóa số | Khối mật khẩu vào cổng |
| 📞 | Số điện thoại gọi ngay | SĐT chủ nhà, SĐT quản lý trạm |
| 🚜 | Máy phát điện (MPD) | Khối thông số máy phát |
| 🔋 | Hệ thống Ắc quy phòng máy | Khối dung lượng ắc quy & loại bình |

---

## 3. BỘ WIREFRAME & MOCKUP CHI TIẾT CÁC MÀN HÌNH

---

### 📱 MÀN HÌNH 1: LỜI CHÀO & HƯỚNG DẪN TÁC NGHIỆP (`/start`, `/help`)

```
👋 Chào Kỹ sư Nguyễn Văn A!
Chào mừng bạn đến với TVT3 DataSite & Contract Assistant.

⚡ BẠN CÓ THỂ TRA CỨU NHANH BẰNG CÁCH:
1️⃣ Gõ mã trạm: `DNLK00`, `26DNa_LK00`, hoặc `LK00`
2️⃣ Gõ tên trạm: `Long Khánh`, `Bảo Vinh`, `Gia Ray`
3️⃣ Gõ tên chủ đất: `Nguyễn Văn A`
4️⃣ Gõ số hợp đồng: `HĐ_123`
5️⃣ Hoặc bấm nút 📎 gửi Vị trí Hiện tại (GPS) để định vị trạm quanh bạn!

────────────────────────────
💡 MẸO HIỆN TRƯỜNG:
• Bấm vào các đoạn chữ `màu xám` để copy nhanh.
• Bấm trực tiếp vào các nút bên dưới tin nhắn để đổi tab xem.

[ 🔍 Tra cứu mẫu: DNLK00 ]   [ 📡 Trạm gần tôi nhất ]
[ 📋 Xem danh bạ QLT ]      [ ❓ Trợ giúp & Cú pháp ]
```

---

### 📱 MÀN HÌNH 2: THẺ TÓM TẮT TRẠM (Site Summary Card)
*Kích hoạt khi: Gõ mã trạm hoặc chọn từ danh sách tìm kiếm.*

```
📍 TRẠM: 26DNa_LK00  •  Mã cũ: `DNLK00`
🏢 Tên trạm: Long Khánh 00  [🟢 Đang phát sóng]
────────────────────────────
📌 Địa chỉ: P. Xuân An, TP. Long Khánh, Đồng Nai
👤 QLT phụ trách: Trần Văn B • 0903.123.456
🗼 Cột: Tự đứng (42m) • Nhà: Shelter kiên cố
⚡ Nguồn: MPD cố định 15kVA • Ắc quy Lithium
📜 Hợp đồng: 🟢 Còn hạn (đến 15/12/2027)
🔑 Vào trạm: Khóa số cổng • Quán nước giữ chìa

────────────────────────────
👇 Chọn thông tin chi tiết bạn muốn xem:
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────┬───────────────────────────┐
│   ⚡ Hạ tầng & Nguồn      │    📜 Hợp đồng & Tiền     │
├───────────────────────────┼───────────────────────────┤
│   🔑 Vào trạm & Chủ đất   │    🗺️ Mở Google Maps     │
├───────────────────────────┴───────────────────────────┤
│                 🔍 Tìm trạm khác                      │
└───────────────────────────────────────────────────────┘
```

---

### 📱 MÀN HÌNH 3: TRƯỜNG HẠ TẦNG KỸ THUẬT & NGUỒN ĐIỆN (`/csht`, `/tb`)
*Kích hoạt khi: Bấm nút `[⚡ Hạ tầng & Nguồn]` hoặc gõ lệnh `/csht DNLK00`.*

```
⚡ HẠ TẦNG & NGUỒN ĐIỆN: 26DNa_LK00
🏢 Long Khánh 00  •  Mã cũ: `DNLK00`
────────────────────────────
🔌 ĐIỆN LƯỚI & EVN:
• Mã khách hàng PE: `PB04010098765`  (Chạm để copy)
• Trạm biến áp: TBA Long Khánh 3 - Pha PTM 4

🚜 MÁY PHÁT ĐIỆN (MPD):
• Loại máy: MPD Cố định (KIBII 15 kVA)
• Định mức tiêu hao: 3.2 lít/giờ
• Tồn dầu ước tính: ~45 lít
• Mã TSCD: `TSCD_MPD_0981`

🔋 HỆ THỐNG ẮC QUY:
• Chủng loại: 🟢 Lithium Smart Power
• Dung lượng tổng: 100 Ah (1 tổ)
• Thời gian xả ước tính: ~4.5 giờ

🗼 HẠ TẦNG CỘT & NHÀ TRẠM:
• Loại cột: Cột tự đứng (Cao 42m)
• Nhà trạm: Shelter kiên cố • Chủ CSHT: MobiFone

🌐 HƯỚNG TRUYỀN DẪN NGUỒN:
• Tuyến chính: 26DNa_LK01 (Ring Metro 04)
• Tuyến dự phòng: DNLK02 (Quang rẽ nhánh)
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────┬───────────────────────────┐
│   📜 Xem Hợp đồng         │   🔑 Vào trạm & Khóa      │
├───────────────────────────┼───────────────────────────┤
│   🔙 Quay lại tóm tắt     │   🔍 Tìm trạm khác        │
└───────────────────────────┴───────────────────────────┘
```

---

### 📱 MÀN HÌNH 4: TRƯỜNG HỢP ĐỒNG & TÀI CHÍNH (`/hd`, `/hopdong`)
*Kích hoạt khi: Bấm nút `[📜 Hợp đồng & Tiền]` hoặc gõ lệnh `/hd DNLK00`.*

```
📜 HỢP ĐỒNG THUÊ MẶT BẰNG: 26DNa_LK00
🏢 Long Khánh 00  •  Mã cũ: `DNLK00`
────────────────────────────
📋 THÔNG TIN HỢP ĐỒNG:
• Số HĐ: `HĐ_2022_MBF_LK00`
• Chủ thể ký: Ông Nguyễn Văn A
• Thời hạn: 15/12/2022 ➔ 15/12/2027
• Trạng thái: 🟢 Còn hạn (còn 432 ngày)

💰 TÀI CHÍNH & ĐƠN GIÁ:
• Giá thuê (có VAT): 5.500.000 đ/tháng
• Giá không VAT: 5.000.000 đ/tháng
• Điện khoán: 1.200.000 đ/tháng
• Chu kỳ thanh toán: 6 tháng / lần

💳 TÌNH TRẠNG THANH TOÁN:
• Đã thanh toán đến: 30/06/2026 (🟡 Cần lập kỳ mới)

🏦 TÀI KHOẢN CHỦ NHÀ:
• Ngân hàng: Vietcombank (CN Long Khánh)
• Số tài khoản: `012345678910`  (Chạm để copy)
• Chủ tài khoản: NGUYEN VAN A
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────┬───────────────────────────┐
│   ⚡ Xem Hạ tầng          │   🔑 Vào trạm & Chủ đất   │
├───────────────────────────┼───────────────────────────┤
│   🔙 Quay lại tóm tắt     │   🔍 Tìm trạm khác        │
└───────────────────────────┴───────────────────────────┘
```

---

### 📱 MÀN HÌNH 5: TRƯỜNG VÀO TRẠM & CHỦ ĐẤT (`/chu`, `/khoa`)
*Kích hoạt khi: Bấm nút `[🔑 Vào trạm & Chủ đất]` hoặc gõ lệnh `/chu DNLK00`.*

```
🔑 VÀO TRẠM & THÔNG TIN CHỦ ĐẤT: 26DNa_LK00
🏢 Long Khánh 00  •  Mã cũ: `DNLK00`
────────────────────────────
👤 CHỦ ĐẤT / CHỦ NHÀ:
• Họ tên: Ông Nguyễn Văn A
• Điện thoại: 0918.456.789 ➔ [📞 Bấm gọi chủ nhà]
• Địa chỉ: Số 12 Đường Hùng Vương, P. Xuân An

🔐 Ổ KHÓA & CHÌA KHÓA:
• Cổng rào: Khóa số 4 số ➔ Mật mã: `*1985#` (Chạm để copy)
• Phòng máy Shelter: Dùng chìa khóa cơ
• Người giữ chìa phụ: Quán nước cô Ba đối diện (SĐT: 0988.111.222)

🚧 HƯỚNG DẪN ĐƯỜNG VÀO & LƯU Ý:
• Đi từ ngã ba Cây Gáo vào hẻm bê tông 3m khoảng 200m.
• Xe bán tải vào được tận chân trạm.
• ⚠️ Lưu ý: Nhà bên cạnh nuôi chó béc-giê, cần chú ý khi vào đêm.
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────┬───────────────────────────┐
│   ⚡ Xem Hạ tầng          │   📜 Xem Hợp đồng         │
├───────────────────────────┼───────────────────────────┤
│   🔙 Quay lại tóm tắt     │   🗺️ Chỉ đường Maps       │
└───────────────────────────┴───────────────────────────┘
```

---

### 📱 MÀN HÌNH 6: KHI TÌM THẤY NHIỀU TRẠM (Multi-Match Site Picker)
*Kích hoạt khi: KTV gõ từ khóa chung như `Long Khanh`, `Bao Vinh` hoặc tên chủ nhà phổ biến.*

```
🔍 Tìm thấy 4 trạm khớp với từ khóa "Long Khanh":
Vui lòng chọn trạm bạn muốn xem thông tin:
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────────────────────────────────┐
│ 📍 26DNa_LK00 - Long Khánh 00 (P. Xuân An)            │
├───────────────────────────────────────────────────────┤
│ 📍 26DNa_LK01 - Long Khánh 01 (P. Phú Bình)           │
├───────────────────────────────────────────────────────┤
│ 📍 26DNa_LK02 - TT Long Khánh (P. Xuân Hòa)           │
├───────────────────────────────────────────────────────┤
│ 📍 DNLK05 - Long Khánh 05 (Xã Bình Lộc)               │
├───────────────────────────────────────────────────────┤
│ ❌ Hủy tìm kiếm                                       │
└───────────────────────────────────────────────────────┘
```

---

### 📱 MÀN HÌNH 7: ĐỊNH VỊ BẰNG VỊ TRÍ HIỆN TRƯỜNG (Live GPS Proximity)
*Kích hoạt khi: KTV bấm nút "Gửi vị trí hiện tại" qua Telegram.*

```
🎯 ĐÃ ĐỊNH VỊ VỊ TRÍ CỦA BẠN!
Đang quét cơ sở dữ liệu 412 trạm TVT3...

📍 Trạm gần nhất: 26DNa_LK00 (Long Khánh 00)
📏 Khoảng cách: 45 mét (Bạn đang đứng trước trạm!)
────────────────────────────
👤 QLT: Trần Văn B • 0903.123.456
🔑 Mật khẩu cổng: `*1985#`
📞 SĐT Chủ nhà: 0918.456.789
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────┬───────────────────────────┐
│   ⚡ Xem Hạ tầng trạm     │   📜 Xem Hợp đồng         │
├───────────────────────────┼───────────────────────────┤
│   🔑 Xem chi tiết vào trạm│   🔄 Quét lại vị trí      │
└───────────────────────────┴───────────────────────────┘
```

---

### 📱 MÀN HÌNH 8: KHÔNG TÌM THẤY & GỢI Ý THÔNG MINH (Not Found Fallback)

```
❌ Không tìm thấy trạm nào khớp với từ khóa: "DN9999"

💡 GỢI Ý CHO BẠN:
• Kiểm tra lại mã trạm (Ví dụ: `DNLK00` hoặc `26DNa_LK00`).
• Thử tìm bằng tên trạm (Ví dụ: `Long Khanh`, `Xuan Loc`).
• Thử tìm bằng tên chủ đất hoặc số hợp đồng.
• Hoặc bấm gửi Vị trí Hiện tại (GPS) để bot tự tìm trạm xung quanh bạn.
```

**Bàn phím Inline Keyboard đính kèm:**
```
┌───────────────────────────────────────────────────────┐
│ 📡 Gửi Vị trí GPS hiện tại                            │
├───────────────────────────────────────────────────────┤
│ ❓ Xem danh sách mẫu mã trạm TVT3                     │
└───────────────────────────────────────────────────────┘
```

---

## 4. GIAO THỨC DỮ LIỆU NÚT BẤM (CALLBACK DATA PROTOCOL)

Do Telegram giới hạn độ dài của `callback_data` tối đa **64 bytes**, ta mã hóa payload theo cấu trúc ngắn gọn:

```
[HÀNH ĐỘNG]:[SITE_ID]:[SUB_FIELD]
```

* `T:26DNA_LK00:SUM` ➔ Mở Thẻ Tóm Tắt (Summary)
* `T:26DNA_LK00:INF` ➔ Mở Trường Hạ Tầng (Infra)
* `T:26DNA_LK00:CTR` ➔ Mở Trường Hợp Đồng (Contract)
* `T:26DNA_LK00:ACS` ➔ Mở Trường Vào Trạm & Chủ Đất (Access)
* `S:26DNA_LK00`     ➔ Chọn trạm từ danh sách Multi-Match
* `C:CANCEL`         ➔ Đóng menu / Hủy tìm kiếm

Payload dài tối đa chỉ 18 ký tự (hoàn toàn an toàn trong giới hạn 64 bytes của Telegram).
