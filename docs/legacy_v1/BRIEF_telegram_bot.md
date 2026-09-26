# 💡 BRIEF: Telegram Bot — Network Device Monitor & Data Query

**Ngày tạo:** 2026-02-24
**Cập nhật:** 2026-02-24 (v2 — thêm Device Bot)
**Trạng thái:** Brainstorm xong, chờ /plan

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Nhân viên viễn thông khi đi hiện trường cần:
- **Check thiết bị nhanh** (Cisco router/switch, Ericsson) mà không cần mở laptop SSH
- **Tra cứu dữ liệu dự án** (alarm SmartW, nhiên liệu, thông tin trạm) mà không cần mở web app
- Nhận **thông báo sự cố** tự động (MĐ, MPĐ, MLL)

Hiện tại phải: mở laptop → kết nối VPN → SSH/Telnet vào thiết bị → gõ lệnh. Rất bất tiện ngoài hiện trường.

## 2. GIẢI PHÁP ĐỀ XUẤT

**Telegram Bot** chạy trên máy nội bộ (cùng server web app), cung cấp 2 nhóm tính năng:

| Nhóm | Mô tả | Ưu tiên |
|------|--------|---------|
| **A. Device Bot** | SSH/Telnet vào thiết bị Cisco & Ericsson, chạy lệnh quen thuộc | 🥇 Làm trước |
| **B. Data Bot** | Tra cứu DB dự án (SmartW, NL, trạm) + push alarm | 🥈 Làm sau |

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Nhân viên kỹ thuật viễn thông (2-5 người trong tổ)
- **Secondary:** Tổ trưởng (xem báo cáo, nhận alarm)

## 4. CHI TIẾT TÍNH NĂNG

### 🤖 NHÓM A — DEVICE BOT (MVP)

**Mục tiêu:** Từ Telegram, gõ mã trạm + lệnh → bot SSH/Telnet vào thiết bị → trả kết quả.

#### Luồng hoạt động:
```
User gõ: /check VTL001
Bot:  "🏗️ VTL001 — Chọn thiết bị:"
      [Router Cisco] [Switch Cisco] [Ericsson]

User bấm: [Router Cisco]
Bot:  "📡 Chọn lệnh:"
      [Interface Status] [IP Brief] [Ping WAN] [Uptime] [Show Run]

User bấm: [Interface Status]
Bot:  "⏳ Đang kết nối VTL001 Router..."
Bot:  "✅ Kết quả:
       Gi0/0  192.168.1.1  up/up
       Gi0/1  10.0.0.1     up/up
       Se0/0  172.16.0.1   down/down ⚠️"
```

#### Thiết bị hỗ trợ:
| Hãng | Loại | Kết nối | Lệnh phổ biến |
|------|------|---------|---------------|
| **Cisco** | Router (ISR) | SSH/Telnet | `show ip int brief`, `show interface status`, `show run`, `ping`, `show ip route` |
| **Cisco** | Switch (Catalyst) | SSH/Telnet | `show interface status`, `show vlan brief`, `show mac address-table`, `show port-security` |
| **Ericsson** | Radio/Transport | SSH/Telnet | TBD — cần anh cung cấp lệnh cụ thể |

#### Database thiết bị:
Cần bảng lưu thông tin kết nối:
```
DeviceRegistry:
  id_tram      — mã trạm (liên kết GeneralInfo)
  device_type  — cisco_router / cisco_switch / ericsson
  host         — IP/hostname
  port         — 22 (SSH) hoặc 23 (Telnet)
  protocol     — ssh / telnet
  username     — tài khoản đăng nhập
  password     — mật khẩu (encrypted)
  enable_pass  — enable password (Cisco)
```

#### Bảo mật:
- Chỉ user được duyệt (whitelist Telegram ID) mới dùng được
- Lệnh giới hạn trong danh sách cho phép (KHÔNG cho chạy `configure terminal` hay lệnh ghi)
- Password thiết bị mã hóa Fernet (dùng chung key với SmartW)
- Log mọi lệnh đã chạy (ai, lúc nào, trạm nào, lệnh gì)

---

### 📊 NHÓM B — DATA BOT (Phase 2)

**Mục tiêu:** Tra cứu nhanh dữ liệu dự án từ Telegram.

#### Tính năng:
- Tra cứu SmartW: MĐ/MPĐ/MLL đang active
- Tra cứu trạm: thông tin chung, tồn NL, lịch sử MPĐ
- Tra cứu NL: tồn kho kho trung tâm (Dầu/Xăng)
- Push alarm: MĐ mới, chưa MPĐ 30', MLL mới

---

## 5. PHÂN CHIA PHASES

### 🚀 Phase 1 — Device Bot MVP (~3-5 ngày)
- [ ] Setup Telegram Bot (BotFather, token, webhook)
- [ ] Bảng DeviceRegistry + giao diện quản lý (web)
- [ ] SSH connector (netmiko/paramiko cho Cisco)
- [ ] Telnet connector (telnetlib cho thiết bị cũ)
- [ ] Inline keyboard: chọn trạm → chọn thiết bị → chọn lệnh
- [ ] Command whitelist (chỉ cho chạy lệnh đọc)
- [ ] User whitelist (Telegram ID)
- [ ] Logging (ai chạy lệnh gì, khi nào)

### 🎁 Phase 2 — Data Bot (~2-3 ngày)
- [ ] Inline keyboard tra cứu SmartW/NL/Trạm
- [ ] Push notifications (MĐ, MPĐ, MLL)
- [ ] Render bảng dữ liệu → hình PNG gửi qua Telegram

### 💭 Phase 3 — Mở rộng (Backlog)
- [ ] Ericsson device support (cần tìm hiểu lệnh)
- [ ] Batch check: kiểm tra nhiều trạm cùng lúc
- [ ] Scheduled health check (cron 6h sáng → gửi báo cáo)
- [ ] Config backup: lưu `show run` vào file tự động

## 6. TECH STACK

| Thành phần | Công nghệ | Lý do |
|------------|-----------|-------|
| Bot framework | `python-telegram-bot` (async) | Mature, async, inline keyboard support |
| SSH | `netmiko` | Hỗ trợ sẵn Cisco IOS/IOS-XE, auto-detect device type |
| Telnet | `telnetlib3` hoặc netmiko telnet | Fallback cho thiết bị cũ |
| Encryption | Fernet (đã có) | Mã hóa password thiết bị |
| Webhook | Flask route `/telegram/webhook` | Tích hợp vào web app hiện tại |

## 7. ƯỚC TÍNH SƠ BỘ

- **Độ phức tạp:** Trung bình
- **Effort Phase 1:** ~3-5 ngày
- **Chi phí:** $0 (tự host, Telegram miễn phí)
- **Rủi ro:**
  - Thiết bị Ericsson có thể cần protocol đặc biệt → cần test
  - Telnet timeout/unstable → cần retry logic
  - Bảo mật: phải chặt command whitelist, không cho sửa config

## 8. BƯỚC TIẾP THEO

→ `/plan` để thiết kế chi tiết Phase 1 (Device Bot)
→ Cần anh cung cấp: danh sách lệnh Ericsson thường dùng
