# Phase 3: Giao diện Báo Hỏng 30 Giây Siêu Tốc & Sửa Lỗi Logic Hiển Thị B4

**Mã giai đoạn:** `PHASE-03-ONE-TAP-REPORTING-UI`  
**Thuộc kế hoạch:** `261005-1330-b4-asset-enrichment-and-reporting`  
**Mục tiêu:** 
1. Khắc phục triệt để lỗi logic: Ẩn 100% khối Cấu hình Biểu mẫu B4 khi chọn Cột anten, Nhà trạm, Tiếp đất...
2. Tái thiết kế trải nghiệm Mobile-First: Thẻ thiết bị tại trạm (Device Cards) + Ma trận Quick Tags 1-chạm + AI Auto-Categorizer.

---

## 1. Thiết Kế Logic Ẩn / Hiện Thông Minh (Conditional Rendering)

### Khắc phục lỗi "Cột anten mà có khối B4":
- Trong `DailyWork.jsx` và `DatasiteDetailFullscreen.jsx`:
```jsx
// CHỈ hiển thị khối Cấu hình B4 khi hạng mục là Máy phát điện hoặc Máy lạnh:
const isB4Applicable = issueCategory === 'Máy phát điện' || issueCategory === 'Máy lạnh';

{isB4Applicable && (
  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
    {/* Khối cấu hình B4 */}
  </div>
)}
```
- Nếu `issueCategory === 'Cột anten'` $\longrightarrow$ Khối B4 biến mất 100%, form trả về ngắn gọn, đúng chuyên môn cột anten.

---

## 2. Các Thành Phần Giao Diện Mới (Theo Mockup Visualize)

### 2.1. Thẻ thiết bị thực tế tại trạm (Device Cards)
- Khi nhập mã trạm (hoặc trạm hiện tại), modal tự động hiển thị các thẻ thiết bị:
  * ⚡ `[Thẻ MPĐ: CAPO 12.5kVA - Serial: 76903]` $\longrightarrow$ Bấm vào: Tự động đổi `issueCategory = 'Máy phát điện'`, mở khối B4 MPĐ.
  * ❄️ `[Thẻ Máy lạnh 1: DAIKIN 12k BTU]` $\longrightarrow$ Bấm vào: Tự động đổi `issueCategory = 'Máy lạnh'`, mở khối B4 Điều hòa.
  * 🗼 `[Thẻ Cột anten: Cao 42m]` $\longrightarrow$ Bấm vào: Tự động đổi `issueCategory = 'Cột anten'`, ẩn khối B4.
  * 🏠 `[Thẻ Nhà trạm / Tiếp đất / Khác]` $\longrightarrow$ Bấm vào: Tự động đổi category, ẩn khối B4.

### 2.2. Ma trận Nút bấm 1-Chạm (Quick Tags)
- **Khi chọn MPĐ**:
  * `[🔋 Bình yếu / Hỏng sạc]` $\longrightarrow$ Tự điền text + tick Mục 3
  * `[💧 Xì két nước / Nhiệt cao]` $\longrightarrow$ Tự điền text + tick Mục 5
  * `[🕹️ Hư ATS / Mất pha]` $\longrightarrow$ Tự điền text + tick Mục 6
  * `[⚡ Cháy AVR / Không ra điện]` $\longrightarrow$ Tự điền text + tick Mục 2
  * `[⛽ Nghẹt béc / Bơm dầu]` $\longrightarrow$ Tự điền text + tick Mục 4
  * `[⛓️ Đứt dây curoa]` $\longrightarrow$ Tự điền text + tick Mục 5
- **Khi chọn Điều hòa**:
  * `[❄️ Không lạnh / Hết gas]` $\longrightarrow$ Tự điền text + tick Mục 4
  * `[🛑 Cháy block / Kẹt nén]` $\longrightarrow$ Tự điền text + tick Mục 1
  * `[🌪️ Hỏng quạt nóng]` $\longrightarrow$ Tự điền text + tick Mục 3
  * `[🖲️ Lỗi bo Inverter]` $\longrightarrow$ Tự điền text + tick Mục 2
  * `[💧 Chảy nước phòng]` $\longrightarrow$ Tự điền text + tick Mục 8
- **Khi chọn Cột anten**:
  * `[📐 Chùng dây co]` | `[💡 Đèn báo không sáng]` | `[⚠️ Cong vênh móp]` | `[🦀 Rỉ sét thân cột]` | `[⚡ Đứt dây tiếp địa]`

### 2.3. Smart Auto-Detection khi gõ tự do
- Nếu anh em gõ tự do vào ô mô tả:
  * Từ khóa máy nổ (`avr`, `củ đề`, `acquy`, `két nước`, `ats`...) $\longrightarrow$ Tự động chuyển `issueCategory` sang `'Máy phát điện'`.
  * Từ khóa máy lạnh (`block`, `xì gas`, `quạt nóng`...) $\longrightarrow$ Tự động chuyển sang `'Máy lạnh'`.

---

## 3. Tiêu chí hoàn thành (Acceptance Criteria)
- [ ] Chọn Cột anten, Nhà trạm, Tiếp đất $\longrightarrow$ Tuyệt đối KHÔNG xuất hiện khối B4.
- [ ] Thẻ thiết bị hiển thị đúng thông số máy của trạm.
- [ ] Chạm Quick Tag $\longrightarrow$ Tự động điền mô tả và tick đúng mục B4.
- [ ] Thao tác trên điện thoại cực kỳ mượt mà, hoàn thành báo hỏng trong 20-30 giây.
