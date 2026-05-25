# 🎨 Design Specifications: Datasites Full-screen View

## 1. Tổng quan (Overview)
- **Mục tiêu:** Nâng cấp trải nghiệm người dùng trên trang Quản lý Trạm (Datasites). Xóa bỏ Slide-over panel chật chội, thay bằng giao diện Full-screen chuyên nghiệp. Bổ sung tính năng Xuất Excel và Template Thêm Trạm.
- **Vibe / Cảm xúc:** Sạch sẽ (Clean), Chuyên nghiệp (Corporate), Hiện đại (Modern) với tông màu Xanh Blue chủ đạo (kế thừa từ hệ thống hiện tại).

---

## 2. Các màn hình & Layout

### 2.1. Màn hình Chính (Data Grid)
- **Header Actions:**
  - Nút **Xuất Excel** (`FileDown` icon): Nằm cạnh nút Thêm Trạm. Nút màu trắng, viền xám (`bg-white border-gray-200 text-gray-700`).
  - Nút **+ Thêm Trạm**: Màu xanh đặc trưng (`bg-blue-600 text-white`). 
    - *UX Behavior:* Click vào sẽ mở ra 1 Dialog nhỏ cho chọn: (1) Điền Form thủ công hoặc (2) Upload file Excel. Tại phần Upload sẽ có dòng link màu xanh: *"📥 Tải xuống Template Excel mẫu"*.
- **Data Table:** Giữ nguyên phong cách hiện tại nhưng khi hover vào 1 dòng, row nổi bật mượt mà hơn. Click vào bất kỳ đâu trên Row sẽ mở Full-screen Detail.

### 2.2. Trang Chi tiết Trạm (Full-screen Modal/Page)
- **Animation:** Trượt từ dưới lên (Slide up) hoặc Fade-in, che phủ 100% màn hình với nền trắng. Không còn background mờ.
- **Header Bar (Cố định ở trên):**
  - **Trái:** Nút Back (🔙 Quay lại), Title bự (Tên Trạm + Mã Trạm), Badge Trạng thái (VD: 🟢 Hoạt động).
  - **Phải:** Các nút thao tác nhanh: `Chỉnh sửa`, `Xuất Excel (riêng trạm này)`, `Xóa`.
- **Layout Chia Tab (Dạng Vertical / Cột dọc bên trái):**
  Vì trạm có rất nhiều dữ liệu, chia Tab dọc sẽ hiển thị được nhiều mục hơn Tab ngang.
  - 📋 **Thông tin chung:** (Mã trạm, Vị trí tọa độ, Tổ quản lý, Trạng thái...)
  - ⚡ **Hạ tầng phụ trợ:** (Cột anten, Phòng thiết bị, Bệ máy nổ, Máy lạnh, Máy nổ...)
  - 📡 **Kỹ thuật:** (Thiết bị viễn thông, Dữ liệu vô tuyến, Truyền dẫn...)
  - 📄 **Pháp lý & Hợp đồng:** (Chủ thể, Hình thức đầu tư, Thông tin hợp đồng...)
  - ⚙️ **Nhật ký & Lịch sử:** (Nhật ký Máy phát điện, Lịch sử bảo trì...)

- **Content Area (Khu vực nội dung bên phải):**
  - Hiển thị theo dạng Card trắng (`bg-white rounded-xl shadow-sm border border-slate-200`).
  - Dữ liệu trình bày theo Grid 2 hoặc 3 cột rõ ràng (Label chữ xám nhạt, Value chữ đen đậm).

---

## 3. Design System (CSS/Tailwind)

### 🎨 Color Palette
| Name | Classes | Usage |
|------|---------|-------|
| Primary | `bg-blue-600` / `text-blue-600` | Nút chính, Active Tab, Icon |
| Surface | `bg-white` | Nền Card, Nền Modal |
| Background | `bg-slate-50` / `bg-gray-50` | Nền trang chính, Vùng xám phụ |
| Text Dark | `text-slate-800` | Tiêu đề, Giá trị dữ liệu (Value) |
| Text Muted | `text-slate-500` | Nhãn dữ liệu (Label), Chú thích |

### 🔲 Border & Shadows
- **Card Border:** `border border-slate-200`
- **Tab Inactive:** `text-slate-600 hover:bg-slate-100 rounded-lg`
- **Tab Active:** `bg-blue-50 text-blue-700 font-bold rounded-lg`
- **Shadow Full Modal:** Không cần vì tràn viền, nhưng Header cần shadow nhẹ: `shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]`

### ✨ Animations
- **Mở Modal:** `animate-in slide-in-from-bottom-4 fade-in duration-300 ease-out`
- **Chuyển Tab:** Fade nội dung nhẹ `animate-in fade-in duration-200`

## 4. Các File cần code (Gợi ý cho Developer)
1. `src/pages/Datasites.jsx`: 
   - Thêm nút Xuất Excel toàn bộ.
   - Thêm modal/dropdown cho nút "Thêm trạm" (có nút download template).
   - Đổi state `selectedSite` sang render component mới thay vì Slide-over.
2. `src/components/datasites/DatasiteDetailFullscreen.jsx` (Tạo mới): Component hiển thị Full-screen chia Tab.
3. API/Utils: Hàm generate file Excel Template và hàm Export Excel.
