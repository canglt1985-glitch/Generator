# 💡 BRAINSTORM & DESIGN SPECIFICATION: TÁI THIẾT KẾ TOÀN DIỆN GIAO DIỆN QUẢN LÝ TỒN TẠI & PHÂN TÁCH LUỒNG SỬA CHỮA B4 - UCTT - CSHT

**Mã tài liệu:** `261005-BRAINSTORM-DESIGN-ISSUES-UI-REFACTOR`  
**Ngày lập:** 05/10/2026  
**Chủ đề:** Tối ưu hóa UI/UX trang Quản lý Tồn tại (`DailyWork.jsx`), xóa bỏ visual clutter (badge rác), phân tách rạch ròi 3 luồng công việc (B4 vs UCTT/Ắc quy vs CSHT địa bàn) và cơ chế đánh dấu duyệt theo Đợt linh hoạt.  
**Dựa trên phản hồi người dùng:**  
> *"chỗ này chưa được tối ưu giao diện, hiển thị, nội dung chung là tồn tại, riêng sửa chữa DHKK và MPĐ thì tách riêng ra với CSHT, vật tư uctt ( accu đề...), tìm cách phân biệt các đợt đã duyệt ( tick chọn đã duyệt vào cùng 1 đợt theo thứ tự), đừng có hiển thị chờ đề xuất B4 rồi B4 MPĐ .... nhìn rối quá"*

---

## 1. PHÂN TÍCH HIỆN TRẠNG & CÁC ĐIỂM NGHẼN (PAIN POINTS)

```
HIỆN TẠI (RỐI MẮT, CHỒNG CHÉO):
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ Phân loại B4: [Tất cả (105)] [Đã duyệt B4 28] [B4 Cần đề xuất 21] [Mua Ắc quy riêng 22]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SITE ID   │ HẠNG MỤC                                                                  │
│ DNTN26    │ Máy phát điện                                                              │
│           │ [⚡ B4 MPĐ]  <- Badge thừa                                                 │
│           │ [⏳ Chờ đề xuất B4] <- Badge thừa, làm cột cao gấp 3 lần bình thường       │
│ DNTP23    │ Máy phát điện                                                              │
│           │ [⚡ B4 MPĐ]                                                                │
│           │ [⏳ Chờ đề xuất B4]                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Điểm nghẽn 1: Gom chung 3 luồng công việc khác nhau vào 1 mớ hỗn độn
* **B4 (MPĐ & ĐHKK):** Trình Ban 4 Tổng Công ty duyệt kinh phí sửa chữa lớn theo đợt.
* **Vật tư UCTT (Ắc quy đề MPĐ):** Mua sắm vật tư tiêu hao nội bộ Tỉnh/Đài theo lô.
* **Tồn tại CSHT địa bàn:** Nhà trạm, Cột anten, Điện lưới, Tiếp địa sửa chữa tại chỗ.
$\rightarrow$ Việc gom chung khiến bảng có 105 dòng lẫn lộn giữa ca xin tiền TCT và ca thay bóng đèn, dọn cỏ trạm.

### Điểm nghẽn 2: Rối mắt vì Badge xếp chồng ở cột "HẠNG MỤC"
* Cột Hạng mục hiện đang nhồi 3 thành phần: (1) Tên danh mục, (2) Badge `⚡ B4 MPĐ` / `❄️ B4 ĐHKK`, (3) Badge `⏳ Chờ đề xuất B4` / `✅ B4 Đợt 1 (Đã duyệt)`.
* Khiến dòng bị đẩy cao lên `60-80px`, bảng nhìn vụn vặt, mỏi mắt khi lướt danh sách.

### Điểm nghẽn 3: Chưa có cơ chế quản lý và duyệt linh hoạt theo "Đợt"
* Các đợt duyệt B4 bị cố định cứng nhắc (chỉ có Đợt 1 và Đợt 2).
* Chưa cho phép người dùng tick chọn các trạm rồi bấm: *"Duyệt vào Đợt X theo thứ tự đã tick"* để chốt danh sách trình cấp trên.

---

## 2. BẢN THIẾT KẾ GIẢI PHÁP MỚI (PROPOSED ARCHITECTURE & UI)

### 2.1. Phân Tách 3 Luồng Công Việc Bằng Segmented Switcher (Trên đầu bảng)
Ngay dưới thanh tìm kiếm, thay thế hàng nút lọc B4 cũ bằng **Thanh Điều Hướng 3 Luồng Rạch Ròi**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [🔍 Tìm tồn tại theo trạm, mô tả, người báo cáo...]                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┬───────────────────────┬──────────────────────┬─────────────┐ │
│ │ ⚡ SỬA CHỮA B4        │ 🔋 VẬT TƯ UCTT /      │ 🗼 TỒN TẠI HẠ TẦNG   │ 📋 TẤT CẢ   │ │
│ │    (MPĐ & ĐHKK)       │    ẮC QUY ĐỀ MPĐ      │    CSHT ĐỊA BÀN      │    TỒN TẠI  │ │
│ │       [ 49 ca ]       │       [ 22 ca ]       │       [ 34 ca ]      │  [ 105 ca ] │ │
│ └───────────────────────┴───────────────────────┴──────────────────────┴─────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Ưu điểm vượt trội:**
  1. Người làm việc với B4 Ban 4 chỉ cần bấm tab **⚡ Sửa chữa B4**: Bảng lập tức sạch bóng, chỉ còn đúng 49 ca MPĐ và ĐHKK.
  2. Người cần mua ắc quy chỉ cần bấm tab **🔋 Vật tư UCTT**: Chỉ còn đúng 22 bình ắc quy đề.
  3. Người phụ trách hạ tầng bấm tab **🗼 Tồn tại CSHT**: Chỉ còn đúng 34 ca điện, trạm, cột.

---

### 2.2. Nút Thao Tác Thông Minh Tự Thích Ứng (Context-Aware Action Buttons)
Tùy vào tab phân hệ đang chọn, các nút bấm ở góc phải trên cùng sẽ hiển thị đúng chức năng:
* **Khi ở Tab Sửa chữa B4:**
  * `[📄 Xuất Biểu Mẫu B4 (Đợt đang chọn) ▼]` (Tùy chọn: Xuất Đợt 2, Đợt 1, hoặc Cả 2 đợt).
  * `[+ Báo hỏng MPĐ / Điều hòa]`
* **Khi ở Tab Vật tư UCTT (Ắc quy):**
  * `[🔋 Xuất Bảng Kê Mua Ắc Quy Đề (Excel)]`
  * `[+ Đề xuất mua ắc quy]`
* **Khi ở Tab Hạ tầng CSHT:**
  * `[🗼 Xuất Báo Cáo Tồn Tại CSHT Địa Bàn (Excel)]`
  * `[+ Báo tồn tại CSHT]`

---

### 2.3. Dọn Dẹp Sạch Sẽ Cột "HẠNG MỤC" & Tách Cột "ĐỢT B4 / TRẠNG THÁI"
* **XÓA BỎ 100%:** `⚡ B4 MPĐ`, `❄️ B4 ĐHKK`, `⏳ Chờ đề xuất B4`.
* **Cột HẠNG MỤC mới:** Tinh tế, chuẩn mực, 1 dòng duy nhất:
  * `⚡ Máy phát điện`
  * `❄️ Điều hòa không khí`
  * `🔌 Hệ thống điện`
  * `🗼 Cột anten`
  * `🏠 Nhà trạm`
  * `⚡ Tiếp đất chống sét`
* **Cột "ĐỢT PHÊ DUYỆT" (Dành riêng cho luồng B4):**
  * `🟢 Đợt 1` (Đã duyệt)
  * `🔵 Đợt 2` (Đã duyệt / Chờ duyệt)
  * `⚪ Chưa phân đợt`
  $\rightarrow$ Badge gọn gàng, nằm ngay ngắn trong 1 ô riêng, không làm phình chiều cao của cả dòng!

---

### 2.4. Thanh Tác Vụ Nổi: Duyệt Hàng Loạt Theo Đợt & Thứ Tự Tick Chọn (Batch Approval Bar)
Khi người dùng tích chọn 1 hoặc nhiều trạm qua ô Checkbox:
Một thanh nổi màu xanh Navy MobiFone hiện lên phía trên bảng:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ☑ Đã chọn 5 trạm: DNTN26, DNTP23, DNTP04, DNDQ25, DNDQ26                               │
│                                                                                        │
│ [ Chọn đợt: [ Đợt 2 (Chờ duyệt) ▼ ] ]  [ ✔️ Gán vào đợt này ]   [ ↩️ Bỏ duyệt ] [ ✕ ]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Cơ chế hoạt động:**
  1. Người dùng tick chọn các trạm theo thứ tự ưu tiên (1, 2, 3...).
  2. Chọn Đợt mong muốn từ Dropdown:
     - `Đợt 1 (Đã duyệt)`
     - `Đợt 2 (Chờ duyệt Ban 4)`
     - `Đợt 2 (Đã duyệt)`
     - `Đợt 3 (Đợt mới)`
     - `+ Tạo đợt mới...`
  3. Bấm **[Gán vào đợt này]**: Hệ thống cập nhật trường `b4_batch`, `b4_approved` và ghi nhận `b4_order` theo đúng thứ tự tick chọn vào Supabase.

---

### 2.5. Mockup Bảng Dữ Liệu Sau Khi Thiết Kế Lại

```
========================================================================================================================
[☑] | NGÀY PHÁT HIỆN | SITE ID CŨ | SITE ID MỚI | HẠNG MỤC        | ĐỢT B4    | MÔ TẢ TỒN TẠI         | TRẠNG THÁI | THAO TÁC
========================================================================================================================
[ ] | 22/09/2026     | DNTN26     | DNITNH15    | ⚡ Máy phát điện | 🔵 Đợt 2  | Máy hư BO AVR         | 🟠 Chưa XL | ✏️ Sửa
[ ] | 17/09/2026     | DNTP23     | DNITPU08    | ⚡ Máy phát điện | 🔵 Đợt 2  | Hư board avr          | 🟠 Chưa XL | ✏️ Sửa
[ ] | 17/09/2026     | DNTP04     | DNITPU00    | ⚡ Máy phát điện | 🔵 Đợt 2  | Máy đề không được     | 🟠 Chưa XL | ✏️ Sửa
[ ] | 14/09/2026     | DNDQ25     | DNIPVI03    | ⚡ Máy phát điện | 🔵 Đợt 2  | Hư board avr          | 🟠 Chưa XL | ✏️ Sửa
[ ] | 08/08/2026     | DNXL18     | DNIXLO02    | ⚡ Máy phát điện | 🟢 Đợt 1  | Máy xì nhớt, đại tu   | 🟢 Đã xong | ✏️ Sửa
[ ] | 10/08/2026     | DNTP14     | DNIPLA04    | ❄️ Điều hòa     | 🔵 Đợt 2  | Cháy quạt dàn nóng    | 🟠 Chưa XL | ✏️ Sửa
========================================================================================================================
```

*(Nhìn bảng cực kỳ thoáng mắt, chiều cao đồng đều 40px, các nhãn Đợt 1 / Đợt 2 nằm ngay ngắn thẳng hàng, không còn badge rác).*

---

## 3. CÁC BƯỚC TRIỂN KHAI MÃ NGUỒN (`/code`)

1. **Cấu trúc lại State bộ lọc trong `DailyWork.jsx`:**
   - Thay `issueB4Filter` bằng `issueWorkstream`: `'B4_REPAIR' | 'BATTERY_UCTT' | 'LOCAL_INFRA' | 'ALL'`.
   - Bổ sung bộ lọc phụ theo Đợt: `b4BatchFilter: 'ALL' | 'DOT_1' | 'DOT_2' | 'PENDING'`.
2. **Loại bỏ badge rác tại cột Hạng mục:**
   - Xóa `⚡ B4 MPĐ`, `❄️ B4 ĐHKK`, `⏳ Chờ đề xuất B4`.
   - Giữ lại 1 icon + tên danh mục sạch đẹp.
3. **Thêm Cột "ĐỢT B4" (hoặc hiển thị tinh tế cạnh Trạng thái):**
   - Chip `🟢 Đợt 1`, `🔵 Đợt 2`, `⚪ Chờ duyệt`.
4. **Nâng cấp Thanh Bulk Action:**
   - Thêm dropdown chọn Đợt (`Đợt 1`, `Đợt 2`, `Đợt mới`) khi tick chọn nhiều trạm.
   - Cập nhật hàm `handleBulkAssignBatch(batchName)`.
5. **Đồng bộ các nút Xuất File theo Phân Hệ:**
   - Nút Xuất B4 chỉ xuất các ca thuộc đợt đang chọn trong Tab B4.
   - Nút Xuất Ắc quy hiển thị khi ở Tab Ắc quy.
   - Nút Xuất CSHT hiển thị khi ở Tab CSHT.
