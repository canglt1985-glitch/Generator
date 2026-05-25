# 💡 BRIEF: TVT3 Firebase Migration & Contract Module

**Ngày tạo:** 07/05/2026
**Dự án:** TVT3 (Migration & Tính năng mới)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- Hệ thống TVT3 hiện tại là một khối Monolith (Flask) chạy hoàn toàn trên 1 máy tính local. Nếu máy local cúp điện, mất mạng, hoặc quá tải thì toàn bộ hệ thống tê liệt.
- Cần phát triển thêm **Module Hợp đồng nhà trạm** (quản lý, xuất file Word). Nếu cứ nhét thêm vào máy local thì rủi ro càng cao.
- Trình thu thập dữ liệu (Scraper) của SmartW bắt buộc phải chạy local do cần mở trình duyệt thật (Playwright) để vượt tường lửa/SSO.

## 2. GIẢI PHÁP ĐỀ XUẤT (CLOUD MIGRATION)
Tách toàn bộ dự án thành **Kiến trúc Serverless trên Firebase**, chỉ giữ lại phần cào dữ liệu (Scraper) chạy ở local.
- **Phần đẩy lên mây (Firebase):** Toàn bộ giao diện (Frontend), API xử lý logic (Daily Work, Máy phát điện, Hợp đồng), Crawler lịch cúp điện (EVNSPC).
- **Phần giữ ở local:** Script `smartw/scraper.py` làm nhiệm vụ cào data và đẩy thẳng lên mây (thông qua API).

## 3. KIẾN TRÚC MỚI CHI TIẾT

### 🌐 Frontend (Firebase Hosting)
- **Giao diện:** Viết bằng HTML/JS/CSS (hoặc React/Vue) gọi API.
- **Tính năng:** Chứa tất cả các trang: Dashboard, Nhật ký công việc, Máy phát điện, VHKT SmartW, và Hợp đồng nhà trạm.
- Tốc độ tải siêu nhanh, bảo mật SSL có sẵn, không chết khi máy local sập.

### ⚙️ Backend API (Firebase Cloud Functions - Python)
- **Functions:** 
  - `api_daily_work`: Thêm/sửa/xóa nhật ký.
  - `api_generator`: Xử lý tính toán xăng dầu, lịch chạy máy.
  - `api_contract`: Nhận thông tin, trộn template Word và trả về file.
  - `api_smartw_receiver`: API để cái Scraper ở local gọi lên và ném data vào.
- **Scheduled Functions (Cron Jobs):**
  - Tool cào lịch cúp điện EVNSPC (chạy lúc 5h sáng tự động trên mây).

### 🗄️ Database & Storage
- **Database:** Giữ nguyên **Supabase (PostgreSQL)** vì dữ liệu của anh em đang liên kết chằng chịt (Relational), dùng Supabase là ngon nhất. (Firebase Functions gọi sang Supabase rất mượt).
- **Storage:** **Firebase Storage** (lưu file Word template hợp đồng, file xuất ra, hình ảnh...).

### 💻 Local Machine (Chỉ chạy Worker)
- Một script Python nhỏ gọn chạy ẩn.
- Nhiệm vụ: Đăng nhập SmartW bằng Playwright -> Cào data MLL/MPĐ -> Gọi POST API ném lên mây.

## 4. LỘ TRÌNH THỰC HIỆN & CHIẾN LƯỢC CHUYỂN ĐỔI SONG SONG (NO DOWNTIME)

Để **KHÔNG ẢNH HƯỞNG** đến app Flask đang chạy ở local, chúng ta sẽ áp dụng chiến lược "Phát triển song song" (Parallel Run):

1. **Về Source Code:** 
   Tạo một thư mục mới hoàn toàn (ví dụ: `firebase-app/`) tách biệt với `web-app/` hiện tại. Code mới viết trong đó, không đụng chạm một dòng code nào của app cũ.
2. **Về Database (Cực kỳ quan trọng):** 
   Trong giai đoạn dev, Firebase sẽ kết nối đến một Database Test (hoặc trỏ đến Supabase hiện tại nhưng chỉ thao tác trên các bản ghi test). Đảm bảo không làm rác data thật.
3. **Quá trình Test:** 
   App mới sẽ được deploy lên một đường link Firebase riêng (ví dụ: `tvt3-beta.web.app`). App local cũ vẫn chạy bình thường trên đường link Cloudflare. Anh em có thể vào link beta để test chán chê.
4. **Tắt App Cũ (Cut-over):** 
   Khi nào link beta chạy mượt, data ngon lành, anh chỉ việc thông báo anh em dùng link mới, và ấn nút "Tắt" cái màn hình đen thui đang chạy Flask ở máy local là xong.

### Phase 1: Xây dựng Core Firebase & Module Hợp đồng (Làm trước)
- Khởi tạo project Firebase.
- Thiết lập kết nối Supabase từ Firebase Functions.
- Hoàn thiện Module Hợp đồng (MVP) chạy thẳng trên mây.

### Phase 2: Migrate các tính năng cũ (Dần dần)
- Chuyển `Nhật ký công việc` thành API trên Firebase.
- Chuyển `Máy phát điện` và `Cào lịch EVNSPC` lên mây.
- Đổi giao diện cũ (Jinja2) thành giao diện gọi API.

### Phase 3: Tách SmartW Scraper
- Cấu hình lại `smartw/worker.py` ở local để không tự lưu JSON nữa mà gọi API ném lên mây.

## 5. ƯỚC TÍNH SƠ BỘ
- **Độ phức tạp:** Cao (Vì phải thay đổi cấu trúc từ Flask rendering Jinja2 sang API Backend + SPA Frontend).
- **Lợi ích:** Hệ thống sẽ "bất tử", bảo mật cao, anh truy cập từ điện thoại lúc nào cũng nhanh như chớp. Máy local cấu hình yếu đến đâu cũng chỉ cần lo đúng việc cào data.

## 6. BƯỚC TIẾP THEO
→ Chạy `/plan` để bắt đầu lên thiết kế chi tiết (Chia tách thư mục, thiết kế API, cấu hình Firebase).
