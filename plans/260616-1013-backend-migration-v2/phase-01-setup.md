# Phase 01: Setup Environment
Status: ✅ Complete
Dependencies: None

## Objective
Thiết lập cấu trúc thư mục `/backend` độc lập, khởi tạo môi trường ảo Python venv riêng biệt cho backend workers, cài đặt các dependencies cần thiết và cấu hình tệp tin môi trường `.env`.

## Requirements
### Functional
- [x] Khởi tạo thư mục gốc `/backend` ở cấp dự án.
- [x] Khởi tạo môi trường ảo Python `backend/.venv` (không dùng chung với venv ngoài để tránh xung đột).
- [x] Chuẩn bị tệp `backend/requirements.txt` sạch sẽ chứa các thư viện cần thiết.
- [x] Chuẩn bị tệp `backend/.env.example` chứa các cấu hình cần thiết để kết nối với Supabase V2.

### Non-Functional
- [x] Performance: Môi trường ảo độc lập giúp giảm thiểu kích thước lưu trữ và đảm bảo tốc độ chạy script.
- [x] Security: Tách biệt biến môi trường của backend khỏi frontend, cấu hình các quyền truy cập Supabase qua RLS.

## Implementation Steps
1. [x] Tạo thư mục `backend/` trong workspace.
2. [x] Tạo file `backend/requirements.txt` với các dependencies tối thiểu:
   - `supabase==2.30.0`
   - `python-dotenv==1.2.1`
   - `requests==2.32.5`
   - `beautifulsoup4==4.14.3`
   - `playwright==1.58.0`
3. [x] Khởi tạo virtualenv trong thư mục `backend/.venv`:
   `python3 -m venv backend/.venv`
4. [x] Kích hoạt venv và cài đặt các dependencies:
   `./backend/.venv/bin/pip install -r backend/requirements.txt`
5. [x] Tạo tệp `.env.example` trong thư mục `backend/` định nghĩa các biến:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `TELEGRAM_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `SMARTW_USER`
   - `SMARTW_PASSWORD`

## Files to Create/Modify
- [NEW] `backend/requirements.txt`
- [NEW] `backend/.env.example`

## Test Criteria
- [ ] File `requirements.txt` cài đặt thành công không lỗi.
- [ ] Môi trường ảo hoạt động chính xác và có thể import `supabase` thành công.

---
Next Phase: [phase-02-bot-telegram.md](file:///Users/cang_it/Antigravity/TVT3/plans/260616-1013-backend-migration-v2/phase-02-bot-telegram.md)
