# 🎨 BẢN THIẾT KẾ: TINH GỌN & ĐƠN GIẢN HÓA GIAO DIỆN DỰ ÁN CSHT (TVT3)

> **Mục tiêu:** Giúp nhân sự kỹ thuật & phát triển mạng lưới Tổ Viễn Thông 3 **nhập liệu nhanh, kiểm tra thông tin tức thì, không bị rối mắt bởi quá nhiều trường dữ liệu dàn trải**.

---

## 1. PHÂN TÍCH HIỆN TRẠNG & ĐIỂM NGHẼN (PAIN POINTS)

| Hạng mục | Hiện trạng thực tế | Vấn đề / Khó khăn | Giải pháp tinh gọn |
|---|---|---|---|
| **Thanh công cụ Top** | 6 nút lớn xếp hàng ngang (`Đề xuất`, `Xuất Excel`, `Báo cáo 4 Sheet`, `Nhập Excel`, `PL Trình TCT`, `Cột`) | Quá nhiều nút cạnh tranh thị giác, chiếm diện tích | Gom nhóm các hành động xuất dữ liệu vào **Dropdown `[ 📥 Xuất báo cáo ▾ ]`**; Nổi bật nút chính `[ + Đề xuất trạm mới ]`. |
| **Bảng danh sách trạm** | 15 cột nhét nhiều thông tin lồng nhau | Cuộn ngang dài, khó nắm bắt tình trạng trạm nhanh | Hỗ trợ 2 chế độ: **Gọn gàng (Compact)** & **Chi tiết (Full)**. Thêm cột tiến độ mini dạng dot màu. |
| **Modal Xem Chi Tiết** | 1 trang cuộn dài hơn 2.500px, gồm 8 section xếp dọc | Cuộn chuột mỏi tay, thông tin quan trọng bị chìm | Chuyển sang **3 Tab con mỏng gọn**: <br>1. *📍 Quy hoạch & Pháp lý*<br>2. *🏗️ Kỹ thuật hạ tầng*<br>3. *💰 Chủ đất & Hợp đồng*. |
| **Kiểm tra Điều kiện** | Banner cảnh báo phân tán nhiều nơi | Khó biết trạm này đã đủ điều kiện trình ký hay chưa | Đặt **Quick Checklist (Hồ sơ trình ký)** ngay trên đầu Modal: Liếc mắt 1 giây là biết đủ hay thiếu giấy tờ gì. |
| **Form Chỉnh sửa/Nhập** | Hơn 25 input xếp dọc liên tiếp không phân nhóm | Dễ sót trường, nhập lâu, mệt mỏi | Phân nhóm 3 khối rõ ràng tương ứng 3 Tab, tự động tính toán (khoảng cách lệch, tiền chữ, format CCCD/SĐT). |

---

## 2. THIẾT KẾ CHI TIẾT CÁC THÀNH PHẦN

### 2.1. Thanh Công Cụ Đầu Trang (Streamlined Action Header)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 📡 Phát triển CSHT (101 trạm quy hoạch)                    [ ⚙️ Bộ lọc ]  [ ⊞ Cột ]    │
│ [ + Đề xuất trạm mới ]  [ 📥 Xuất báo cáo ▾ ]  [ 📤 Nhập Excel ]                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
* **Dropdown `[ 📥 Xuất báo cáo ▾ ]`** chứa:
  - 📊 Báo cáo Rà soát CSHT (Bộ 4 Sheet Excel chuẩn)
  - 📋 Danh sách trạm quy hoạch (Excel 101 trạm)
  - 📑 Phụ lục Quỹ điểm sạch trình TCT (CV 7203)

---

### 2.2. Modal Xem Chi Tiết Trạm (Smart Inspection Modal)

#### A. Header & Quick Summary (Cố định ở trên):
* **Mã trạm:** `26DNa356` (Mã cũ: `DN0356`) • **Địa bàn:** Xã Suối Nho, H. Định Quán.
* **Gói thầu:** Gói 4 • **Hình thức:** CSHT MBF đầu tư.
* **Thanh Trạng Thái Trình Ký (Status Pill):**
  - 🟢 **ĐỦ ĐIỀU KIỆN TRÌNH KÝ** (Đã có BB Ghi nhớ, Tọa độ KS, CCCD, SĐT, Giá thuê).
  - 🟡 **CẦN BỔ SUNG** (Còn thiếu: *CCCD Chủ đất, Biên bản ghi nhớ*).
  - 🔴 **VƯỚNG DÙNG CHUNG / SỞ CHƯA DUYỆT** (Cự ly < 400m với trạm VTT).

#### B. Thanh 3 Tab Nội Dung (Segmented Tabs):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [ 📍 Quy hoạch & Pháp lý ]    [ 🏗️ Kỹ thuật hạ tầng ]    [ 💰 Chủ đất & Hợp đồng ]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  NỘI DUNG HIỂN THỊ THEO TAB (Không phải cuộn dài, bấm tab chuyển ngay lập tức)        │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

##### 🔹 Tab 1: 📍 Quy hoạch & Pháp lý
* **Tọa độ quy hoạch vs Khảo sát:** Hiện tọa độ và tự động tính độ lệch (mét).
* **Pháp lý Sở TT&TT / KH&CN:** Số công văn chấp thuận, ngày gửi, tình trạng dùng chung.
* **Phê duyệt TCT:** Tình trạng phê duyệt quyết định đầu tư, nhánh dự án.
* **Trạm lân cận:** Danh sách trạm trong bán kính 1km (khoảng cách, nhà mạng khác).

##### 🔹 Tab 2: 🏗️ Kỹ thuật hạ tầng
* **Vị trí & Mặt bằng:** Dựng trên đất liền hay nóc nhà, diện tích thuê ($m^2$), đường vào trạm (xe tải/ba gác/xe máy).
* **Cột anten:** Loại cột (Tự đứng, Dây néo, Cột ngụy trang...), Chiều cao đề xuất ($m$).
* **Nguồn điện:** Điện 1 pha/3 pha, khoảng cách kéo dây điện ($m$), nguồn hạ trạm hay mua qua dân.
* **Cáp quang & Xung đột:** Điểm đấu nối quang gần nhất, vật cản/cây cối/công trình xung quanh.

##### 🔹 Tab 3: 💰 Chủ đất & Hợp đồng
* **Thông tin chủ đất:** Họ và tên, Số điện thoại (bấm gọi/sao chép nhanh), Số CCCD/CMND, Ngày cấp, Nơi cấp.
* **Pháp lý đất:** Số thửa đất, Tờ bản đồ, Giấy chứng nhận QSDĐ.
* **Tài chính:** Giá thuê đề xuất (VNĐ/tháng), Khung giá tối đa quy định của xã, Tài khoản ngân hàng, Chủ tài khoản, Chi nhánh.
* **Bộ nút xuất văn bản pháp lý (dưới chân modal):**
  - `[ 📄 Hợp đồng (.docx) ]` *(Tự động theo mẫu CSHT hoặc MBF)*
  - `[ 📝 BB Ghi Nhớ (.docx) ]` *(Mẫu Biên bản ghi nhớ BBLV)*
  - `[ ✏️ Chỉnh sửa ]`
  - `[ Đóng ]`

---

### 2.3. Form Chỉnh Sửa Trạm (Smart & Auto-filling Form)

Thay vì 1 cột kéo dài vô tận, form sẽ tổ chức thành **3 khối (cards)** tương ứng với 3 Tab trên:
1. **Khối 1: Thông số Khảo sát & Kỹ thuật:**
   - 2 ô Vĩ độ / Kinh độ có nút `📍 Lấy vị trí hiện tại` hoặc `Dán link Google Maps`.
   - Độ lệch cự ly tự động tính bằng thuật toán Haversine và đổi màu (Xanh nếu $\le 100m$, Vàng nếu $100-300m$, Đỏ nếu $> 300m$).
2. **Khối 2: Tiến độ & Pháp lý:**
   - Chọn Giai đoạn (Dropdown 5 bước).
   - Tình trạng Sở & TCT (Radio buttons nhanh).
3. **Khối 3: Chủ đất & Giá thuê:**
   - Ô nhập số tiền có bộ format tự động (ví dụ gõ `5000000` tự hiển thị `5,000,000 đ - Năm triệu đồng`).
   - Tự động đối soát với khung giá tối đa của Xã để cảnh báo nếu vượt khung.

---

## 3. CHECKLIST KIỂM TRA (ACCEPTANCE CRITERIA)

- [ ] **AC-1:** Giao diện chi tiết trạm được chia làm 3 tab rõ ràng, chiều cao modal không vượt quá 85vh, không bị cuộn trang liên tục.
- [ ] **AC-2:** Header modal có sẵn checklist kiểm tra điều kiện trình ký (Đủ / Thiếu giấy tờ gì).
- [ ] **AC-3:** Chân modal chỉ còn đúng 2 nút xuất file: `[ 📄 Hợp đồng (.docx) ]` và `[ 📝 BB Ghi Nhớ (.docx) ]`.
- [ ] **AC-4:** Nhập tọa độ khảo sát tự động hiển thị khoảng cách lệch so với tọa độ quy hoạch ban đầu.
- [ ] **AC-5:** Nhập giá thuê tự động quy đổi thành chữ tiếng Việt chính xác.
- [ ] **AC-6:** Thao tác chuyển đổi giữa 3 tab mượt mà, giữ nguyên trạng thái dữ liệu đang nhập nếu chuyển qua lại.

---

## 4. KẾ HOẠCH TRIỂN KHAI

1. **Bước 1 (Sub-tabs Modal):** Tách cấu trúc hiển thị trong `InfrastructureDevelopment.jsx` thành 3 Tab: *Quy hoạch*, *Kỹ thuật*, *Chủ đất & Hợp đồng*.
2. **Bước 2 (Quick Checklist Header):** Bổ sung khối tóm tắt tình trạng hồ sơ trình ký lên đầu modal.
3. **Bước 3 (Smart Input Form):** Gom nhóm form chỉnh sửa thành 3 card tương ứng, thêm tính năng tự format tiền và tính độ lệch tọa độ.
4. **Bước 4 (Testing & Verify):** Kiểm thử trên trình duyệt thực tế, kiểm tra giao diện cả Desktop và Mobile.
