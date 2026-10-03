# 💡 BRIEF: Tích Hợp Bot ERA & METRO CSG (Router Gateway & Đồng Bộ TVT3)

**Ngày tạo:** 03/10/2026  
**Thư mục mã nguồn:** `/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/Telebot_Metro`  
**Dự án tích hợp:** TVT3 Network Operations Hub (`/Users/cang_it/Antigravity/TVT3`)  
**Phương án đã chọn:** Giữ 2 Bot Telegram riêng biệt nhưng nâng cấp dùng chung 1 Router Gateway + Đồng bộ Database trạm từ TVT3.

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT & HIỆN TRẠNG

### 1.1. Hiện trạng hệ thống `Telebot_Metro`
- **2 Bot Telegram độc lập:**
  1. `tele_bot.py`: Chatbot Metro Truyền dẫn CSG (Cisco NCS540, ASR920...).
  2. `bot_era.py`: Chatbot ERA Vô tuyến 3G/4G/5G (`@LKH_ERA_BOT`, Ericsson OSS/ENM Moshell).
- **Backend chung:** Flask API (`app.py` -> `api/main_api.py`) chạy trên Port 5000.
- **AI Intent Parser:** `api/gemini_service.py` (dùng Gemini 1.5/2.0 Flash, Groq Llama-3.3-70B, Regex Fallback).

### 1.2. Các điểm hạn chế cần khắc phục
1. **Lặp lại code (Code Duplication):** `tele_bot.py` và `bot_era.py` lặp lại hơn 80% logic: xác thực người dùng, phê duyệt Admin Inline Keyboard, ghi log hoạt động, xử lý callback.
2. **Khởi động cồng kềnh:** File `start_all_bots.bat` phải bật 3 cửa sổ CMD riêng biệt (`app.py`, `tele_bot.py`, `bot_era.py`). Nếu 1 bot bị crash thì khó giám sát.
3. **Chưa hỗ trợ Cross-Command (Nhầm lẫn bot):** Kỹ sư ở hiện trường nếu gõ lệnh ERA vào Bot Metro (hoặc gõ lệnh Metro vào Bot ERA) sẽ bị báo lỗi "Không hiểu", gây mất thời gian thao tác.
4. **Phụ thuộc file mapping tĩnh:** `site_mapping.json` (ERA) và `device_mapping.json` (Metro) phải cập nhật thủ công bằng tay hoặc qua file Excel rời, dễ bị lệch khi mạng lưới có trạm mới, trạm đổi tên cũ - mới.

---

## 2. GIẢI PHÁP ĐỀ XUẤT: SHARED ROUTER GATEWAY & SUPABASE SYNC

### 2.1. Kiến trúc tổng thể

```
                     ┌───────────────────────────────┐
                     │     KỸ SƯ MẠNG LƯỚI / KTV     │
                     └───────┬───────────────┬───────┘
                             │               │
                             ▼               ▼
                   [Bot Metro CSG]      [Bot ERA 3G/4G/5G]
                    (@Telebot_Metro)     (@LKH_ERA_BOT)
                             │               │
                             └───────┬───────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────┐
                │        ROUTER GATEWAY UNIFIED          │
                │ ────────────────────────────────────── │
                │ 1. Unified Auth & Roles (Admin 1-Click)│
                │ 2. Smart Parser (Gemini + Groq + Regex)│
                │ 3. Smart Cross-Route (Tự sửa bot nhầm) │
                │ 4. TVT3 Supabase Dynamic Site Resolver │
                └────────────┬───────────────┬───────────┘
                             │               │
                    ┌────────┴────────┐      │
                    ▼                 ▼      ▼
             [Core CSG API]     [Core ERA API]  [TVT3 Supabase]
               (Cisco CSG)       (Ericsson OSS)   (412 trạm VHKT)
```

### 2.2. Điểm cải tiến đột phá

1. **Giữ nguyên 2 Bot Telegram riêng biệt:**
   - Kỹ sư Vô tuyến tiếp tục chat với Bot ERA quen thuộc.
   - Kỹ sư Truyền dẫn tiếp tục chat với Bot Metro CSG.
   - Không làm xáo trộn thói quen làm việc và nhóm chat hiện có.

2. **Smart Cross-Routing (Chống gõ nhầm bot):**
   - Nếu KTV gõ nhầm `st cell 4G DNLK00` vào Bot Metro: Router Gateway tự động nhận diện đây là lệnh ERA, tự chạy kết quả trả về và kèm lời nhắc nhẹ: `(💡 Mẹo: Bạn có thể tra cứu lệnh này trực tiếp tại @LKH_ERA_BOT)`.
   - Nếu KTV gõ nhầm `int all DNLK00` vào Bot ERA: Tự động chạy lệnh Metro CSG và trả lời kết quả đầy đủ.

3. **Đồng bộ Database trạm từ TVT3 (`datasites` Supabase):**
   - Thay vì tra cứu `site_mapping.json` tĩnh, Router Gateway kết nối trực tiếp Supabase TVT3:
     - 412 trạm với đầy đủ mã mới (`site_id`), mã cũ (`site_id_old`).
     - Tự động nhận diện công nghệ: `...L` (4G/SRAN), `...N` (5G), khối 3G độc lập.
     - Đính kèm luôn thông tin Quản lý trạm (QLT) và SĐT liên hệ khi trả lời kết quả nếu cần.
   - Khi TVT3 cập nhật thông tin trạm trên Web Dashboard, cả 2 Bot Telegram được cập nhật ngay lập tức (Zero Maintenance).

4. **Quản lý quy trình 1 tiến trình (Single Unified Runner):**
   - Hợp nhất runner: Chạy cả 2 bot song song trên cùng 1 tiến trình Python (`asyncio.gather`) hoặc qua Router Gateway backend, chỉ cần 1 cú click `start_all_bots.bat` nhẹ nhàng, tự phục hồi khi mất kết nối mạng.

---

## 3. PHẠM VI TÍNH NĂNG (MVP VS PHASE 2)

### 🚀 MVP (Triển khai ngay):
- [ ] Xây dựng module `router_gateway.py` điều phối logic chung cho cả 2 bot.
- [ ] Tích hợp bộ giải mã trạm `TVT3SiteResolver` đọc từ Supabase `datasites` (có local cache in-memory 1 giờ).
- [ ] Tự động chuyển tiếp thông minh (Smart Cross-Routing) khi KTV gõ nhầm bot.
- [ ] Chuẩn hóa bộ phân quyền tập trung (`allowed_users` theo role: `metro`, `era`, `all`, `admin`).
- [ ] Tối ưu script khởi động `start_all_bots.bat` chạy 1 file gọn gàng, ổn định.

### 🎁 Phase 2 (Nâng cấp tiếp theo):
- [ ] Đồng bộ log tác nghiệp (`user_activity.log`) lên bảng `bot_audit_logs` trên Supabase TVT3 để hiển thị Dashboard báo cáo.
- [ ] Cung cấp nút tra cứu nhanh trạng thái port CSG và trạng thái Cell ERA trực tiếp trên Web Dashboard TVT3 (`tvt3_v2`).
- [ ] Webhook thay cho Polling nếu deploy server có IP tĩnh / Cloudflare Tunnel.

---

## 4. ĐÁNH GIÁ ĐỘ KHẢ THI & RỦI RO (REALITY CHECK)

- **Độ phức tạp:** **Trung bình (2 - 3 ngày hoàn thiện)**.
  - Lý do: Bộ lõi `csg/`, `era/`, và `gemini_service.py` vốn đã hoàn thiện rất tốt và đã nằm chung trong Flask API. Ta chỉ cần tái cấu trúc tầng Telegram Bot và gắn kết nối Supabase TVT3.
- **Rủi ro kỹ thuật & Giải pháp:**
  - *Rủi ro mạng OAM:* Kết nối Cisco CSG và Ericsson ENM OSS (`10.53.138.6:5022`) yêu cầu máy chủ chạy bot phải nằm trong mạng nội bộ OAM hoặc mở VPN.
    -> *Giải pháp:* Giữ server chạy trên máy trạm vận hành hiện tại (hoặc VPS nội bộ) như cách đang chạy.
  - *Rủi ro Supabase rớt mạng:* Nếu mạng Internet tạm thời chập chờn không kết nối được Supabase.
    -> *Giải pháp:* Thiết lập Cache cục bộ (In-memory + File snapshot `sites_cache.json`), nếu không query được Supabase thì tự động fallback về cache cũ.

---

## 5. BƯỚC TIẾP THEO
→ Chạy `/plan` để lập kế hoạch chi tiết từng bước tái cấu trúc code và tích hợp!
