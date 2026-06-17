# Chiến Lược Sao Lưu & Giám Sát Hệ Thống (Backup & Monitoring) - TVT3 V2

Tài liệu này hướng dẫn cách cấu hình và duy trì hoạt động ổn định cho hệ thống TVT3 V2 bao gồm Cơ sở dữ liệu Supabase, Giao diện React Frontend và các Background Workers Python.

---

## 1. Chiến Lược Sao Lưu Dữ Liệu (Backup Strategy)

### 1.1. Sao lưu tự động (Supabase Managed Backups)
Do hệ thống đã chuyển dịch toàn bộ cơ sở dữ liệu sang **Supabase PostgreSQL**, chúng ta thừa hưởng cơ chế sao lưu tự động cực kỳ an toàn của nhà cung cấp:
- **Tần suất:** Tự động sao lưu hàng ngày (Daily backups).
- **Lưu trữ:** Lưu trữ an toàn trên hạ tầng đám mây của Supabase.
- **Khôi phục:** Có thể khôi phục (Restore) trực tiếp từ Dashboard của Supabase chỉ với một click.

### 1.2. Sao lưu thủ công / Dự phòng nội bộ (pg_dump Script)
Để đảm bảo an toàn tuyệt đối và có bản sao lưu offline tại máy trạm Tổ, quản trị viên có thể chạy tập lệnh sao lưu định kỳ hàng tuần.

**Lệnh chạy nhanh (Terminal):**
```bash
pg_dump -h db.supabase.co -U postgres -d postgres -F c -b -v -f "/path/to/backups/tvt3_backup_$(date +%Y%m%d).dump"
```
*(Thay thế host, user và database name bằng Connection String lấy từ Supabase Settings > Database)*

**Script tự động hàng ngày (Cron job trên server nội bộ):**
1. Tạo file script `backup.sh`:
   ```bash
   #!/bin/bash
   BACKUP_DIR="/data/tvt3_backups"
   DB_URI="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"
   FILENAME="tvt3_db_$(date +%Y%m%d_%H%M%S).sql"
   
   # Chạy dump
   pg_dump "$DB_URI" > "$BACKUP_DIR/$FILENAME"
   
   # Nén file
   gzip "$BACKUP_DIR/$FILENAME"
   
   # Xóa các bản sao lưu cũ hơn 7 ngày để tiết kiệm dung lượng
   find "$BACKUP_DIR" -type f -name "tvt3_db_*.sql.gz" -mtime +7 -delete
   ```
2. Thêm vào crontab (`crontab -e`) để chạy lúc 2h sáng mỗi ngày:
   ```cron
   0 2 * * * /bin/bash /path/to/backup.sh > /dev/null 2>&1
   ```

---

## 2. Giám Sát Trạng Thái & Lỗi (Monitoring & Error Tracking)

### 2.1. Giám sát Uptime (Uptime Monitoring)
Để đảm bảo website luôn hoạt động 24/7 và nhận cảnh báo ngay lập tức qua Viber/Telegram khi web bị sập:
- Sử dụng **UptimeRobot** (Miễn phí 50 monitors, tần suất 5 phút/lần).
- **URL cần giám sát:** `https://tvt3.vercel.app`
- **Hình thức cảnh báo:** Cấu hình Webhook gửi thông báo trực tiếp đến Group chat Telegram/Viber của Tổ.

### 2.2. Theo dõi lỗi Runtime với Sentry (Sentry Integration)
Sentry được cấu hình để tự động chụp và báo cáo các lỗi Javascript phát sinh trên trình duyệt của người dùng hoặc lỗi crash trong Python script.

#### Cấu hình cho React Frontend:
1. Cài đặt SDK:
   ```bash
   npm install @sentry/react
   ```
2. Khởi tạo trong `src/main.jsx`:
   ```javascript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     integrations: [Sentry.browserTracingIntegration()],
     tracesSampleRate: 0.1, // Ghi lại 10% các giao dịch hiệu năng
   });
   ```

#### Cấu hình cho Python Background Workers:
1. Cài đặt thư viện:
   ```bash
   pip install sentry-sdk
   ```
2. Khởi tạo ở đầu file `worker_v2.py` hoặc `fetch_outages.py`:
   ```python
   import sentry_sdk
   import os

   sentry_sdk.init(
       dsn=os.getenv("SENTRY_DSN"),
       traces_sample_rate=0.1
   )
   ```

---

## 3. Triển khai và Duy trì Background Workers (Python Scrapers)

Các background workers thực hiện cào lịch mất điện EVN, cập nhật giá dầu, và gửi tin nhắn Viber/Telegram cần được cấu hình chạy liên tục.

### 3.1. Chạy thông qua systemd (Khuyên dùng trên Linux Server)
Tạo file cấu hình dịch vụ `/etc/systemd/system/tvt3-worker.service`:
```ini
[Unit]
Description=TVT3 Background Worker Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/Users/cang_it/Antigravity/TVT3
ExecStart=/Users/cang_it/Antigravity/TVT3/.venv/bin/python worker_v2.py
Restart=always
RestartSec=10
EnvironmentFile=/Users/cang_it/Antigravity/TVT3/.env

[Install]
WantedBy=multi-user.target
```

**Các lệnh quản lý dịch vụ:**
- Khởi động service: `systemctl start tvt3-worker`
- Cho phép tự động chạy khi khởi động OS: `systemctl enable tvt3-worker`
- Xem log hoạt động: `journalctl -u tvt3-worker -f -n 100`

### 3.2. Chạy qua Cron Job (Nếu script chạy dạng định kỳ - Periodic)
Ví dụ chạy script cào lịch cúp điện EVN (`fetch_outages_v2.py`) cứ 30 phút một lần:
```cron
*/30 * * * * cd /Users/cang_it/Antigravity/TVT3 && .venv/bin/python fetch_outages_v2.py >> /var/log/tvt3_fetch_outages.log 2>&1
```
