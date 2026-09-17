# 💡 BRIEF: Tối Ưu Bảng Điều Khiển Bản Đồ Mạng TVT3 Theo Giao Diện Google Maps

**Ngày tạo:** 12/09/2026  
**Người yêu cầu:** User / Tổ Viễn Thông 3  
**Mục tiêu:** Tối ưu hóa UI/UX trang Bản đồ mạng (`NetworkMap`), loại bỏ bố cục chia cột cồng kềnh, chuyển sang phong cách bản đồ toàn cảnh tràn viền (Immersive Full-Bleed Map) với các thành phần nổi (Floating Controls) và Bottom Sheet chuẩn Google Maps trên cả Mobile và Desktop.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT (Current Pain Points)

1. **Bảng điều khiển bị "phình to" chiếm diện tích:**
   - Hiện tại trên Desktop dùng `grid-cols-3`, trong đó Bảng điều khiển cố định chiếm hẳn 1/3 màn hình (33% chiều ngang). Bản đồ chỉ còn 2/3, khiến không gian quan sát hạ tầng trạm bị hẹp.
   - Bảng chứa quá nhiều khối dọc: Tìm kiếm, GPS toggle, Lớp bản đồ (3 nút), Bộ lọc RAN/5G (3 nút lớn), Bộ lọc CSHT (4 nút lớn), Bảng trạm lân cận... làm người dùng phải cuộn chuột nhiều.
2. **Trải nghiệm trên Mobile còn bất tiện:**
   - Trên màn hình điện thoại (chiều dọc), các khối điều khiển xếp chồng lên trước bản đồ, người dùng phải cuộn một đoạn dài mới thấy bản đồ.
   - Khi bấm khảo sát, bảng trạm lân cận lại nằm tuốt bên dưới đáy bản đồ, không thể vừa nhìn tuyến cáp/trạm vừa xem danh sách.
3. **Chưa tận dụng mô hình tương tác chuẩn của Google Maps:**
   - Người dùng đã quen với Google Maps: Bản đồ luôn tràn 100% màn hình, thanh tìm kiếm nổi ở góc trên, các nút phân loại là các "Pill / Chip" nằm ngang, các tác vụ phụ nằm trong Bottom Sheet (Mobile) hoặc Card nổi có thể thu gọn (Desktop).

---

## 2. GIẢI PHÁP ĐỀ XUẤT (Google Maps-Style Architecture)

### 2.1. Triết lý thiết kế (Core Design Concept)
- **Map-First (Bản đồ tràn viền 100% Viewport):** Bản đồ số là nhân vật chính, chiếm trọn vẹn không gian hiển thị (cả Desktop lẫn Mobile).
- **Floating Controls (Điều khiển nổi thông minh):** Tất cả các công cụ (Tìm kiếm, Bộ lọc, Bán kính, GPS, Lớp bản đồ) đều là các thẻ nổi (Floating Glassmorphic Cards/Pills) đè lên trên bản đồ, có thể thu gọn hoặc tự ẩn khi không dùng.
- **Bottom Sheet chuẩn Mobile:** Trên điện thoại, danh sách trạm lân cận và thông số kéo cáp nằm trong Bottom Sheet có thể vuốt kéo (Peek -> Half -> Full).

---

## 3. THIẾT KẾ CHI TIẾT THEO THIẾT BỊ

### 3.1. Giao diện Desktop (Màn hình rộng / Laptop)
Học theo giao diện Google Maps Web (ảnh 2 user cung cấp):
1. **Thanh tìm kiếm nổi (Top-Left Floating Search Box):**
   - Vị trí: Góc trên bên trái (`top-4 left-4 z-[1000]`), chiều rộng chuẩn `380px - 400px`.
   - Thiết kế: Bo tròn 16px, kính mờ (`backdrop-blur-md bg-slate-900/90`), viền thanh mảnh, đổ bóng sâu (`shadow-2xl`).
   - Tích hợp: Ô nhập mã trạm / tọa độ + Nút xóa `✕` + Gợi ý tự động (Autocomplete dropdown) xuất hiện ngay dưới ô tìm kiếm.
2. **Dải Filter Chips nằm ngang (Top Horizontal Filter Bar):**
   - Vị trí: Chạy ngang ở trên cùng bản đồ, ngay cạnh thanh tìm kiếm.
   - Các chip bo tròn mềm mại (`rounded-full px-3 py-1.5 text-xs font-semibold`):
     - `🔵 Trạm HĐ (469)` (Đang bật)
     - `📶 5G Onair (23)`
     - `🔄 4G ERA (65)`
     - `🏛️ CSHT QH (95)`
     - `⚡ Last Mile (225)`
   - Khi bấm vào chip, lọc ngay lập tức trên bản đồ, màu sắc sáng nổi bật tương ứng trạng thái.
3. **Thẻ nổi thông tin trạm / Trạm lân cận (Floating Left Drawer / Collapsible Side Card):**
   - Khi click vào 1 trạm hoặc chấm 1 điểm khảo sát: Thẻ chi tiết sẽ trượt ra nhẹ nhàng ở cạnh trái (bên dưới thanh tìm kiếm).
   - Có nút thu gọn `‹` / mở ra `›` dạng thanh kẹp để người dùng ẩn thẻ đi bất cứ khi nào muốn ngắm toàn cảnh bản đồ mà không làm mất dữ liệu đã quét.
4. **Cụm Floating Action Buttons (Góc dưới & góc trên bên phải):**
   - Góc trên phải: Bộ chuyển lớp bản đồ (Vệ tinh / Bản đồ số) gọn gàng dạng popup.
   - Góc dưới phải: Nút GPS định vị thực địa `🎯`, Phóng to/Thu nhỏ `+` `-`, Nút Toàn màn hình `⛶`.
5. **Banner Tuyến cáp quang nổi (Floating Route Info Pill):**
   - Khi đang kéo cáp (VD: từ điểm chọn về DNLK24), một thanh nổi nhỏ gọn gắn ở giữa cạnh dưới bản đồ:
     `🔌 Tuyến kéo về DNLK24: Đường bộ 3.86 km | Cáp (+5%): 4.05 km  [✕ Ẩn]`

---

### 3.2. Giao diện Mobile (Điện thoại iOS / Android)
Học theo giao diện Google Maps App (ảnh 1 user cung cấp):
1. **Thanh tìm kiếm nổi trên cùng (Top Floating Search Pill):**
   - Cố định ở đỉnh màn hình (`top-3 left-3 right-3 z-[1000]`).
   - Giao diện bo tròn hoàn toàn (`rounded-full`), có icon kính lúp, placeholder *"Tìm mã trạm, tọa độ..."*, icon GPS và nút xóa.
2. **Dải Filter Chips cuộn ngang (Horizontal Scrolling Carousel):**
   - Nằm ngay dưới thanh tìm kiếm, hỗ trợ vuốt ngón tay trượt ngang mượt mà (`overflow-x-auto no-scrollbar`).
   - Cho phép bật/tắt nhanh các lớp và trạng thái 5G, 4G ERA, CSHT, Last Mile mà không che khuất màn hình.
3. **Bộ nút điều khiển nổi bên phải (Right Floating Action Buttons):**
   - Nút Lớp bản đồ (Layer stack icon): Chạm vào mở menu chọn Vệ tinh / Đường phố.
   - Nút GPS Định vị (Navigation arrow icon): Chạm để tự động zoom vào vị trí hiện tại của kỹ sư ngoài hiện trường.
4. **Interactive Bottom Sheet (Tấm kéo đáy đa tầng):**
   - Nằm cố định ở đáy màn hình với thanh kéo pill `—` ở giữa trên cùng.
   - **Trạng thái 1 - Thu gọn (Collapsed - Cao ~65px):** 
     - Khi chưa chọn điểm: Hiện *"📍 Chạm lên bản đồ để quét trạm & kéo cáp"*.
     - Khi đã chọn điểm: Hiện *"📍 Điểm khảo sát • [X] trạm lân cận • Gần nhất: DNLK51 (865m)"*.
   - **Trạng thái 2 - Nửa màn hình (Half-Expanded - Cao ~45% màn hình):**
     - Hiện bộ chọn bán kính (1km, 2km, 3km, 5km...), ô tìm trạm đích và danh sách 4-5 trạm gần nhất kèm nút `🔌 Kéo cáp`.
   - **Trạng thái 3 - Mở rộng toàn bộ (Full-Expanded - Cao ~88% màn hình):**
     - Hiện bảng đầy đủ chi tiết, thông số cáp, quản lý trạm, nút copy tọa độ, chia sẻ link chỉ đường.

---

## 4. TÍNH NĂNG & PHÂN LOẠI ƯU TIÊN

### 🚀 MVP (Giai đoạn 1 - Bắt buộc):
- [ ] Chuyển layout trang `NetworkMap` sang **Map-First (Bản đồ tràn viền 100% chiều cao màn hình)**.
- [ ] Xây dựng **Floating Search Box** góc trên trái (Desktop) và full-width top pill (Mobile).
- [ ] Xây dựng **Horizontal Filter Chips Bar** (Dải chip lọc ngang) thay thế cho các khối hộp lọc cồng kềnh hiện tại.
- [ ] Tích hợp **Bottom Sheet** cho Mobile (có thể kéo mở hoặc bấm để mở rộng / thu gọn).
- [ ] Tích hợp **Collapsible Side Card** cho Desktop (có nút thu gọn `‹` / mở rộng `›`).
- [ ] Giữ nguyên toàn bộ logic nghiệp vụ: Quét trạm, Đo khoảng cách, Tuyến kéo cáp OSRM (+5%), Copy thông tin QLT, Đổi lớp vệ tinh.

### 🎁 Nice-to-Have (Giai đoạn 2):
- [ ] Thêm cử chỉ vuốt chạm cảm ứng tự nhiên (Touch gesture drag) cho Bottom Sheet trên mobile.
- [ ] Nút "Chỉ đường" (Directions) tích hợp mở trực tiếp app Google Maps trên điện thoại.
- [ ] Lưu lịch sử các trạm hoặc điểm vừa khảo sát gần đây dạng danh sách drop-down như Google Maps.

---

## 5. ĐÁNH GIÁ KHẢ THI KỸ THUẬT (Technical Reality Check)

- **Độ phức tạp:** Trung bình (Medium).
- **Công nghệ áp dụng:**
  - React 19 + Tailwind CSS v4 + React Leaflet 5 + Lucide Icons đã có sẵn trong dự án.
  - Sử dụng CSS Flexbox/Absolute/Fixed positioning chuẩn, không cần cài thêm thư viện ngoài nặng nề.
  - Hỗ trợ tốt `backdrop-filter: blur()`, touch events native mượt mà 60fps trên mobile Safari & Chrome.
- **Rủi ro & Giải pháp:**
  - *Sự kiện click trên Leaflet khi có Bottom Sheet:* Cần xử lý z-index và stopPropagation cẩn thận để thao tác vuốt Bottom Sheet không vô tình click lên bản đồ bên dưới.

---

## 6. CÂU HỎI THẢO LUẬN CÙNG USER

1. **Về màu sắc giao diện:** Bác muốn giữ phong cách **Dark Tech hiện đại** (nền tối Slate/Cyan kết hợp hiệu ứng kính mờ glassmorphism như hiện tại) hay chuyển sang phong cách **Sáng / Trắng tối giản** y hệt như Google Maps gốc?
2. **Về các chip lọc ngang:** Bác thấy 5 chip chính (`Trạm HĐ`, `5G Onair`, `4G ERA`, `CSHT QH`, `Last Mile`) đã đủ bao quát nhu cầu theo dõi hàng ngày chưa, hay cần thêm chip nào khác?

---

## 7. BƯỚC TIẾP THEO
→ Sau khi thống nhất ý tưởng, chuyển sang lệnh `/plan` để lập bản kế hoạch kỹ thuật chi tiết và tiến hành triển khai.
