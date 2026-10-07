# Plan: Phát Triển Module Bot Telegram DataSite & Hợp Đồng TVT3

Created: 2026-10-07T14:00:00+07:00
Status: ✅ Completed
Architecture Reference: [docs/DESIGN_TELEGRAM_BOT_SITE_CONTRACT.md](../../docs/DESIGN_TELEGRAM_BOT_SITE_CONTRACT.md)
UI/UX Reference: [docs/VISUALIZE_TELEGRAM_BOT_UIUX.md](../../docs/VISUALIZE_TELEGRAM_BOT_UIUX.md)
Brief Reference: [docs/BRIEF_TELEGRAM_BOT_INTEGRATION.md](../../docs/BRIEF_TELEGRAM_BOT_INTEGRATION.md)

---

## 🎯 Tổng quan mục tiêu (Objective)
Xây dựng một module độc lập `backend/bots/` chuyên trách **Tra cứu siêu tốc thông tin DataSite (Hạ tầng, Nguồn, MPD, Ắc quy) và Hợp đồng (Chủ đất, Tiền thuê, Chìa khóa)** trực tiếp trên Telegram cho KTV hiện trường:
- Không làm lại các tính năng Web đã có (Lịch cúp điện EVN, VHKT RAN).
- Truy vấn duy nhất từ bảng **`datasites`** trên Supabase (nơi đã thống nhất cả hồ sơ trạm và `contract_info`).
- Ứng dụng **In-Memory Snapshot Cache** toàn bộ 412 trạm: phản hồi **< 0.1 giây**, tra cứu offline/mạng yếu cực nhạy.
- Điều hướng **1-chạm** qua Inline Keyboard, tự động sửa tin nhắn tại chỗ (In-place edit) không làm trôi chat.
- Hỗ trợ gửi **Live Location (GPS)**: tự quét trạm gần nhất trong bán kính 500m.

---

## 🛠️ Công nghệ & Môi trường
- **Ngôn ngữ & Runtime:** Python 3.11+ chạy local trên máy macOS của Cang_IT (`backend/.venv/`).
- **Giao tiếp Telegram:** Asynchronous Telegram Bot Client (`httpx` / Long Polling).
- **Cơ sở dữ liệu:** Supabase Cloud (`datasites` table, anon key).
- **Tiến trình:** Tích hợp trực tiếp vào Daemon Watchdog `backend/run_workers.py`.

---

## 📋 Danh sách các Phases triển khai

| Phase | Tên Phase | Mô tả công việc | File đích | Trạng thái |
|:---:|---|---|---|:---:|
| **01** | **Core Bot & Whitelist Auth** | Khởi tạo package `backend/bots/core/`, load token, cấu hình Whitelist Telegram IDs & Role phân quyền | `backend/bots/core/` | ✅ Complete |
| **02** | **Cache & 4-Field Resolver** | Bộ quản lý Cache In-Memory 412 trạm, Haversine GPS calc, Formatter 4 trường dữ liệu (Site, Infra, Contract, Access) | `backend/bots/resolvers/` | ✅ Complete |
| **03** | **Search & Message Handlers** | Bắt lệnh `/start`, `/help`, `/tram`, tìm kiếm mềm (Unaccent/Fuzzy) và bắt tọa độ GPS từ tin nhắn Live Location | `backend/bots/handlers/` | ✅ Complete |
| **04** | **Inline Keyboards & Callback** | Xây dựng lưới nút bấm 2 cột, xử lý Callback Query sửa tin nhắn tại chỗ, nút mở Google Maps | `backend/bots/handlers/` | ✅ Complete |
| **05** | **Runner, Watchdog & Testing** | Viết file chạy chính `site_contract_bot.py`, tích hợp vào `run_workers.py`, viết test suite kiểm thử toàn diện | `backend/bots/`, `tests/` | ✅ Complete |

---

## ⚡ Quick Commands
- Bắt đầu Phase 1: `/code phase-01`
- Kiểm tra tiến độ: `/next`
- Lưu ngữ cảnh não bộ: `/save-brain`
