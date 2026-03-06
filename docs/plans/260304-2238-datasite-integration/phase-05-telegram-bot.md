# Phase 05: Tích hợp Chatbot Telegram
Status: ⬜ Pending
Dependencies: phase-03-webui.md, phase-04-anomaly.md

## Objective
Khởi tạo 1 con Telegram Bot để Tra cứu mọi thông số Trạm của Local Database bằng lệnh Chat trên Telegram, phục vụ App VHKT khi đi công tác/ứng cứu trong Đêm, Chui hầm mất sóng 4G. 

## Requirements
- [ ] Hàm bắt API Webhook Telegram (Endpoint Flask `/webhook/telegram`) hoặc Polling nếu mạng ko mở Port.
- [ ] Cơ chế xác thực: Chỉ cho phép các User nằm trong nhóm Tổ VHKT hoặc có trong Database `users` mới được chat tra cứu.
- [ ] Bot phản hồi khi nhận `/tram XYZ`: 
    + Trả lại 1 cái string Text Format cực rõ về Thông số Tủ Nguồn/Accu/Máy lạnh/Máy Phát + Thời gian cúp.
- [ ] Module Ngôn ngữ Nâng cao (Tùy chọn): Tích hợp OpenAI/Gemini làm MCP Model đọc DB và trả lời.

## Implementation Steps
1. [ ] Đăng ký Telegram Bot API bằng BotFather, lấy Token (để trong .env).
2. [ ] Viết Blueprint riêng `bot_telegram.py` nhận Hook.
3. [ ] Cấu hình Template text thông báo cho từng site.
4. [ ] Nếu tìm hiểu MCP, tích hợp Langcheck hoặc custom prompt.

## Files to Create/Modify
- `web-app/bot_telegram.py`
- `.env` - Bắt thêm TELEGRAM_TOKEN.
- `web-app/app.py` - Giao tiếp import webhook.
