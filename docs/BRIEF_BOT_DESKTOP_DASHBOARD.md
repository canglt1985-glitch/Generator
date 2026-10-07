# 💡 BRIEF: Dashboard Cấu Hình & Quản Trị Bot Telegram (Desktop Only)

**Ngày tạo:** 07/10/2026  
**Chủ đề:** Nghiên cứu thiết kế Dashboard setup các tính năng Bot Telegram TVT3 (Chỉ hiển thị trên Desktop)  
**Tác giả:** Antigravity Team & Cang_IT  
**Trạng thái:** Brainstorm & Architecture Discovery  

---

## 1. MỤC TIÊU & NGUYÊN TẮC THIẾT KẾ

### 1.1. Mục tiêu
Xây dựng một Trung tâm Điều hành & Cấu hình Bot Telegram (**Telegram Bot Command Center**) trực tiếp trên Web Dashboard của TVT3:
- Giúp Quản trị viên / Tổ trưởng bật/tắt tính năng, phân quyền Whitelist Telegram IDs, điều chỉnh tham số GPS, và xem nhật ký tác nghiệp mà **không cần đụng vào code hay restart server bằng tay**.
- Tự động đồng bộ cấu hình qua bảng `system_config` trên Supabase (Realtime Sync).

### 1.2. Nguyên tắc "Desktop Only" (Chỉ hiển thị trên máy tính)
- **Lý do thực tế:** Các thao tác cấu hình hệ thống (nhập token, phân quyền admin/ktv, bật/tắt bảo mật, xem bảng nhật ký nhiều cột) đòi hỏi không gian hiển thị rộng rãi, chuột và bàn phím để tránh thao tác nhầm lẫn.
- **Ranh giới thiết bị:**
  - **Trên Mobile (Smartphones/Tablets < 1024px):** Ẩn hoàn toàn khỏi thanh điều hướng Mobile Navigation. Nếu truy cập trực tiếp bằng URL, hiển thị thông báo "Tính năng chỉ hỗ trợ trên Desktop".
  - **Trên Desktop (Laptops/PCs >= 1024px):** Hiển thị đầy đủ giao diện Dashboard dạng Tab chuyên nghiệp.

---

## 2. KIẾN TRÚC 5 KHỐI TÍNH NĂNG (CORE FEATURE BLOCKS)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               🖥️ TELEGRAM BOT MANAGEMENT DASHBOARD (DESKTOP ONLY)                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ 📊 Trạng Thái Đội Bot ] [ ⚙️ Bật/Tắt Tính Năng ] [ 👥 Phân Quyền ] [ 📜 Nhật Ký Bot ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│ 1. BOT FLEET STATUS:                                                                   │
│    • Bot TVT3 Site & Contract : 🟢 Running (PID: 4921 • Uptime: 4h 12m • RAM: 42MB)    │
│    • Bot MLL TVT3             : 🟢 Running (PID: 4922 • Uptime: 4h 12m)                │
│    • Bot Nhiên Liệu MPD       : 🟢 Running (PID: 4923 • Uptime: 4h 12m)                │
│    [ 🔄 Restart Bot Engine ]  [ ⚡ Ép Buộc Sync Cache 412 Trạm ]  [ 🧪 Ping Telegram ] │
│                                                                                        │
│ 2. FEATURE TOGGLES (Bật/Tắt tức thì):                                                  │
│    • [ON ] Tra cứu Hạ tầng & Nguồn (FIELD_INFRA: PE, MPD, Ắc quy)                      │
│    • [ON ] Tra cứu Hợp đồng & Tiền thuê (FIELD_CONTRACT: Giá thuê, STK ngân hàng)      │
│    • [ON ] Tra cứu Vào trạm & Mật khẩu khóa (FIELD_ACCESS: Mật mã khóa số cổng)        │
│    • [ON ] Quét trạm theo vị trí GPS Live Location (Bán kính: [ 1.0 km ▾ ])            │
│    • [ON ] Tìm kiếm mờ tiếng Việt không dấu (Fuzzy Unaccent Matching)                  │
│                                                                                        │
│ 3. WHITELIST ACCESS CONTROL (Phân quyền Telegram ID):                                  │
│    • Quản lý danh sách ID Telegram: Cang_IT (Admin), KTV Khuân, KTV Châu...            │
│    • Phân quyền 1-Chạm: ADMIN / KTV / QLT / VIEWER.                                    │
│    • Nút [+ Thêm Telegram ID] và [Khóa tạm thời].                                      │
│                                                                                        │
│ 4. LIVE AUDIT LOGS (Nhật ký tra cứu hiện trường):                                      │
│    • 14:15:20 | KTV Thái (0903xxx) | Mã: DNIXDU01 | Xem: Hợp đồng & STK | 45ms       │
│    • 14:10:05 | KTV Vĩnh (0918xxx) | GPS Live (10.93, 107.24) | Gần: DNLK00 | 12ms     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT CÁC TAB CHỨC NĂNG

### 🔹 Tab 1: Bot Fleet Health & Lifecycle (Trạng Thái Đội Bot)
- **Thẻ trạng thái từng Bot:**
  - Tên bot, Username Telegram (`@TVT3_NLMPD_BOT`, `@LKH_VHKT_BOT`).
  - Trạng thái: Running (Xanh lá) / Stopped (Đỏ) / Error (Vàng).
  - Thông số runtime: PID, Thời gian chạy liên tục (Uptime), Bộ nhớ RAM tiêu thụ, Lần nhận tin nhắn gần nhất.
- **Thao tác nhanh:**
  - Nút **[⚡ Force Sync 412 Trạm]**: Gửi tín hiệu làm mới In-Memory Cache ngay lập tức (dùng khi nhân sự vừa thêm/sửa trạm mới trên trang DataSites).
  - Nút **[🧪 Test Kết Nối]**: Gọi `getMe` và kiểm tra độ trễ mạng đến máy chủ Telegram API.

### 🔹 Tab 2: Feature Toggles & Parameter Tuning (Cấu Hình Tính Năng)
- **Công tắc an toàn (Security Toggles):**
  - *Cho phép hiển thị STK & Tiền thuê:* Nếu tắt, KTV chỉ thấy ngày hết hạn hợp đồng, không thấy giá tiền thuê (phù hợp khi cho đối tác/thầu phụ mượn bot).
  - *Cho phép hiển thị Mật khẩu khóa số:* Nếu trạm đang trong đợt thanh tra an ninh, có thể tắt tạm thời tính năng xem mật mã khóa số.
- **Bộ điều chỉnh tham số:**
  - *Bán kính tìm kiếm GPS:* Slider chọn từ `200m` đến `5.000m` (mặc định: `1.000m`).
  - *Chu kỳ tự động làm mới Cache:* Dropdown `30 phút` / `60 phút` / `120 phút`.
  - *Ngưỡng cảnh báo HĐ sắp hết hạn:* Nhập số ngày (mặc định: `45 ngày`).

### 🔹 Tab 3: Access Control & Whitelist (Danh Bạ & Phân Quyền)
- **Bảng quản lý người dùng Telegram:**
  - Cột: Telegram ID, Username, Họ tên KTV, Tổ công tác, Vai trò (`ADMIN`, `KTV`, `QLT`), Ngày cấp quyền, Trạng thái (`Active`/`Blocked`).
- **Modal Thêm KTV mới:**
  - Nhập Telegram ID (số).
  - Chọn vai trò.
  - Nhập tên nhân sự và SĐT.
- Khi người lạ nhắn tin vào bot, ID của họ sẽ hiện trong danh sách "Chờ phê duyệt" (Pending Requests) ➔ Admin chỉ cần bấm `[Duyệt]` là KTV dùng được ngay!

### 🔹 Tab 4: Live Activity Stream (Nhật Ký Tác Nghiệp Hiện Trường)
- **Lợi ích vận hành:**
  - Giúp Tổ trưởng biết KTV đang ứng cứu ở trạm nào qua lịch sử tra cứu GPS.
  - Phát hiện các trạm thường xuyên bị hỏi mật mã khóa số (dấu hiệu ổ khóa bị kẹt hoặc trạm có nhiều sự cố).
  - Cảnh báo các truy cập bất thường (ví dụ tra cứu liên tục nhiều trạm vào ban đêm).

---

## 4. PHƯƠNG ÁN BỐ TRÍ TRÊN GIAO DIỆN WEB

### Phương án A: Tích hợp thành Sub-tab trong trang Cài Đặt (`/settings`)
* **Cách thực hiện:** Thêm tab thứ 3 vào trang `Settings.jsx`:
  * Tab 1: Tài khoản người dùng (`users`)
  * Tab 2: Cấu hình hệ thống (`config`)
  * **Tab 3: Quản lý Bot Telegram (`telegram_bot`)** ➔ **Chỉ render trên Desktop (`hidden lg:flex`)**
* **Ưu điểm:** Gọn gàng, tập trung mọi thiết lập quản trị vào một nơi, không làm phình to thanh điều hướng chính.

### Phương án B: Tạo trang Dashboard Quản Trị Bot Riêng Biệt (`/bot-manager`)
* **Cách thực hiện:** Tạo trang mới `src/pages/BotManagerDashboard.jsx`.
* Thêm icon trên Sidebar Desktop: `[🤖 Quản Trị Bot]` (chỉ hiện trên màn hình Desktop).
* **Ưu điểm:** Không gian cực kỳ rộng rãi, có thể hiển thị song song cả biểu đồ hoạt động của Bot, bảng log realtime và các công tắc điều khiển.

---

## 5. THỰC HIỆN CƠ CHẾ "DESKTOP ONLY" TRONG CODE

```jsx
// 1. Kiểm tra kích thước màn hình hoặc bọc Responsive Guard
export default function BotManagerDashboard() {
  return (
    <>
      {/* GIAO DIỆN DESKTOP (Màn hình >= 1024px) */}
      <div className="hidden lg:block space-y-6">
        {/* Render Dashboard Tabs & Toggles */}
      </div>

      {/* THÔNG BÁO TRÊN MOBILE (Màn hình < 1024px) */}
      <div className="lg:hidden flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
          <Monitor className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Chỉ Dành Cho Máy Tính</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Trang Quản trị & Cấu hình Bot Telegram yêu cầu màn hình rộng để thao tác an toàn. Vui lòng truy cập trên Laptop hoặc PC.
        </p>
      </div>
    </>
  );
}
```

---

## 6. KẾT LUẬN & BƯỚC TIẾP THEO
Anh Cang vui lòng chọn phương án bố trí (Phương án A - tích hợp vào Settings hay Phương án B - tạo trang Bot Manager riêng), sau đó ta sẽ chuyển sang `/plan` để triển khai!
