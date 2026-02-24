# 💡 BRIEF: Trang Vận Hành Khai Thác (SmartW Integration)

**Ngày tạo:** 12/02/2026  
**Cập nhật:** 13/02/2026 12:15  
**Tích hợp vào:** App Flask hiện tại (web-app/)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

- Nhân viên Tổ VT3 phải mở SmartW nhiều lần/ngày để check MĐ, MLL, MPĐ
- SmartW không cấp API → phải xem bằng trình duyệt
- Không có cảnh báo chủ động khi trạm MĐ lâu mà chưa chạy MPĐ
- VHKT quét chiều hôm trước nhưng sáng hôm sau nhân viên hay quên xem
- MLL nhập nguyên nhân (Cấp 1/2/3) thường thiếu hoặc mâu thuẫn giữa 3G/4G/5G

## 2. GIẢI PHÁP

- Dùng **Playwright** headless chạy nền, login SSO SmartW
- Poll 3 bảng alarm realtime (5 phút) + VHKT 1 lần/sáng
- Lưu **file JSON tạm** (`data/smartw/`) — KHÔNG lưu DB
- Hiển thị trên trang mới `/vhkt` trong app hiện tại
- Cross-check MĐ ↔ MPĐ → cảnh báo "cần ứng cứu"
- Kiểm tra MLL: nguyên nhân thiếu, mâu thuẫn giữa mạng

## 3. ĐỐI TƯỢNG

- **Primary:** Nhân viên Tổ VT3 MobiFone Đồng Nai
- **Use case:** Giám sát trạm nhiều lần/ngày, ứng cứu nhanh

---

## 4. URL SMARTW

### Login SSO
```
https://auth-sso2fa.mobifone.vn:8080/.../openid-connect/auth
  ?client_id=TTNOC_SMARTW → redirect smartw.mobifone.vn/smartw/sso/callback.htm
```

### MĐ (Mất Điện) → `/smartw/alarm/site/list.htm`
- `type=MD, level=CELL, team=TVT+Đồng+Nai+3, sdate=DD/MM/YYYY+00:00, edate=DD/MM/YYYY+23:59`
- Khoảng thời gian: 1 tháng (không dùng `isActive`)

### MPĐ (Máy Phát Điện) → `/smartw/alarm/site/list.htm`
- `type=MFD, level=SITE, team=TVT+Đồng+Nai+3, sdate=DD/MM/YYYY+00:00, edate=DD/MM/YYYY+23:59`

### MLL (Mất Liên Lạc) → `/smartw/rp-site-v2/list.htm`
- `region=MN, team=MBF_MN_DONG_NAI_PVT_TVT3, province=Tỉnh Đồng Nai, sdate=DD/MM/YYYY+00:00, edate=DD/MM/YYYY+23:59`
- Không dùng `tramMll=on`

### VHKT (Đánh Giá) → `/smartw/rp-vhkt-md-mll/list.htm`
- `type=NGAY, tinh=Tỉnh Đồng Nai, ngay=DD/MM/YYYY`

---

## 5. COLUMN MAPPING — 4 BẢNG SMARTW

### Bảng MĐ (Mất Điện)

| Cột SmartW | Key JSON | Quan trọng |
|-----------|---------|-----------|
| Ngày | `ngay` | ✅ |
| Site ID | `site_id` | ✅ Key chính |
| Cảnh báo | `canh_bao` | ✅ (AC Failure, Main Failure...) |
| Bắt đầu | `bat_dau` | ✅ |
| Kết thúc | `ket_thuc` | ✅ |
| Số phút | `so_phut` | ✅ |
| IP OMC | -- | ❌ bỏ qua |
| Tên thiết bị | `ten_thiet_bi` | ℹ️ |
| Cell ID | `cell_id` | ℹ️ |
| UCTT đóng bao | `uctt` | ℹ️ |
| Loại thiết bị | `loai_thiet_bi` | ℹ️ |
| Loại cảnh báo | `loai_canh_bao` | ℹ️ |
| XS/Phường | `phuong` | ℹ️ |
| Tỉnh/Thành phố | `tinh` | ℹ️ |
| Tổ viễn thông | `to_vt` | ℹ️ |
| Bài viễn thông | `bai_vt` | ℹ️ |
| Mạng | `mang` | ℹ️ |
| Vendor | `vendor` | ℹ️ |

### Bảng MPĐ (Máy Phát Điện)

| Cột SmartW | Key JSON | Quan trọng |
|-----------|---------|-----------|
| Ngày | `ngay` | ✅ |
| Site ID | `site_id` | ✅ Key chính |
| Cảnh báo | `canh_bao` | ✅ (Generator Is Running, EXTERNAL_AL...) |
| Bắt đầu | `bat_dau` | ✅ |
| Kết thúc | `ket_thuc` | ✅ |
| Số phút | `so_phut` | ✅ |
| IP OMC | -- | ❌ bỏ qua |
| Tên thiết bị | `ten_thiet_bi` | ℹ️ |
| Loại thiết bị | `loai_thiet_bi` | ℹ️ (eNODEB, NodeB, PhNORA) |
| Vendor | `vendor` | ℹ️ |
| (Các cột địa chỉ, tổ VT) | | ℹ️ |

### Bảng MLL (Mất Liên Lạc) ⭐

| Cột SmartW | Key JSON | Quan trọng |
|-----------|---------|-----------|
| Site ID | `site_id` | ✅ Key chính |
| Bắt đầu | `bat_dau` | ✅ |
| Kết thúc | `ket_thuc` | ✅ |
| Số phút | `so_phut` | ✅ |
| **Mạng** | `mang` | ✅ **Quan trọng!** 1 trạm có 3G/4G/5G |
| **Nguyên nhân Cấp 1** | `nguyen_nhan_1` | ✅ ⭐ (Truyền dẫn, Phần mềm, Nguồn...) |
| **Nguyên nhân Cấp 2** | `nguyen_nhan_2` | ✅ ⭐ (thường hay trống!) |
| **Nguyên nhân Cấp 3** | `nguyen_nhan_3` | ✅ ⭐ (gần như trống hết!) |
| Ticket Id | `ticket_id` | ℹ️ |
| Is Auto Ticket | `auto_ticket` | ℹ️ |
| Giám trị | `giam_tri` | ℹ️ |
| (Các cột địa chỉ, tổ/bài VT) | | ℹ️ |

### Bảng VHKT (Tổng hợp)

| Cột SmartW | Key JSON | Quan trọng |
|-----------|---------|-----------|
| Ngày | `ngay` | ✅ |
| **Trạm** | `tram` | ✅ Key chính |
| MĐ — Số lần | `md_so_lan` | ✅ |
| MĐ — Thời gian (phút) | `md_phut` | ✅ |
| MĐ — SLA UC | `md_sla` | ✅ (Đạt/Không đạt) |
| MPĐ — Số lần | `mpd_so_lan` | ✅ |
| MPĐ — Thời gian (phút) | `mpd_phut` | ✅ |
| MLL — Số lần | `mll_so_lan` | ✅ |
| MLL — Thời gian (phút) | `mll_phut` | ✅ |
| MLL — SLA | `mll_sla` | ✅ (Đạt/Không đạt) |
| (Miền, Tỉnh, XS, Đài VT, Tổ VT) | | ℹ️ |

---

## 6. LOGIC KIỂM TRA MLL (Buổi sáng)

### Rule 1: Thiếu nguyên nhân
- Mỗi dòng MLL **phải có** Cấp 1, Cấp 2, Cấp 3
- Nếu ô nào **trống** → ⚠️ Nhắc NV bổ sung

### Rule 2: Nguyên nhân mâu thuẫn giữa các mạng
- **Key nhóm:** `Site ID` + thời gian gần nhau (cùng sự cố)
- 1 trạm có thể có 3G, 4G, 5G → nhiều dòng MLL
- Cùng trạm + thời gian gần nhau → so sánh **cả 3 cấp nguyên nhân**:
  - Nếu Cấp 1 khác nhau → ⚠️ Bất thường
  - Nếu Cấp 2 khác nhau → ⚠️ Bất thường
  - Nếu Cấp 3 khác nhau → ⚠️ Bất thường
- Đây là dấu hiệu **nhập sai**, cần kiểm tra lại

### Ví dụ minh họa:
```
Site DNL001 — MLL lúc 06:00~06:30:
  3G → Cấp 1: Truyền dẫn | Cấp 2: Đứt cáp | Cấp 3: FO đoạn A  ✅
  4G → Cấp 1: Truyền dẫn | Cấp 2: Đứt cáp | Cấp 3: FO đoạn A  ✅ OK
  5G → Cấp 1: Truyền dẫn | Cấp 2: Lỗi switch | Cấp 3: --       ⚠️ Cấp 2 khác!
```

---

## 7. TÍNH NĂNG

### 🚀 MVP:

**Scraping & Storage:**
- [ ] Playwright login SSO SmartW (user/pass, không 2FA)
- [ ] Scrape 3 bảng alarm: MĐ, MPĐ, MLL (1 tháng, không filter active)
- [ ] Scrape VHKT 1 lần/sáng (vd 7:00)
- [ ] Lưu file JSON tạm (`data/smartw/`) — KHÔNG lưu DB
- [ ] Background scheduler (APScheduler): alarm 5p, VHKT 1 lần/sáng
- [ ] Auto re-login khi session expired
- [ ] Admin config: SmartW credentials (mã hóa Fernet)

**UI — Trang `/vhkt`:**
- [ ] Dashboard summary header: `🔴 MĐ: 3 | 🟡 MPĐ: 5 | 🔵 MLL: 2 | ⚠️ Ứng cứu: 1`
- [ ] 4 tabs: MĐ, MPĐ, MLL, VHKT
- [ ] Active/Cleared phân loại bằng `ket_thuc`: trống = ACTIVE, < 2h = Vừa hết, ≥ 2h = Ẩn
- [ ] Cột MPĐ trong bảng MĐ: cross-check trạm MĐ có chạy MPĐ chưa
- [ ] MLL: highlight dòng thiếu nguyên nhân + mâu thuẫn giữa mạng
- [ ] Responsive mobile (dùng ngoài hiện trường)
- [ ] Hiện thời gian cập nhật + trạng thái worker
- [ ] Tabler UI style (giống app hiện tại)

### 🎁 Phase 2:
- [ ] Cảnh báo ứng cứu: MĐ > 30p mà chưa có MPĐ → ⚠️ highlight
- [ ] 🔔 Âm thanh + highlight khi có alarm MỚI xuất hiện
- [ ] PAKH (Phản Ánh Khách Hàng) — khi có URL
- [ ] Cross-check MĐ ↔ lịch cúp điện (planned vs unplanned)
- [ ] Cross-check MPĐ ↔ generator log (đã nhập đổ dầu chưa)
- [ ] Auto-tạo công việc hàng ngày từ alarm data
- [ ] Export data ra Excel

### 💭 Phase 3 (Backlog):
- [ ] Auto-tạo file import MPĐ → generator log (giảm thủ công)
- [ ] Push notification Telegram khi alarm mới
- [ ] Thêm alarm types khác từ SmartW

---

## 8. KIẾN TRÚC LƯU TRỮ

```
data/smartw/
├── md.json              ← MĐ (1 tháng, cả active + cleared)
├── mpd.json             ← MPĐ (1 tháng, cả active + cleared)
├── mll.json             ← MLL (1 tháng, cả active + cleared)
├── vhkt.json            ← VHKT sáng nay
└── scrape_status.json   ← trạng thái worker (last_run, errors)
```

> **Logic ACTIVE/CLEARED:** Check `ket_thuc` field — trống = ACTIVE, có giờ + < 2h = Vừa hết, ≥ 2h = Ẩn.
> Không cần file `previous.json` hay `cleared.json` riêng.

---

## 9. ĐÁNH GIÁ

| Phần | Mức | Ghi chú |
|------|-----|---------|
| Login SSO | 🟡 | OAuth redirect + cookies |
| Parse HTML | 🟢 | CSS selector bảng |
| Clear detection | 🟢 | Check `ket_thuc` field (không cần so sánh 2 file) |
| Cross-check MĐ↔MPĐ | 🟢 | Match site_id |
| MLL cause validation | 🟡 | Group by site+time, compare 3 cấp |
| Scheduler | 🟡 | APScheduler trên Windows |
| UI 4 tabs + summary | 🟢 | Tái sử dụng Tabler pattern |
| **Tổng** | **🟡 Trung bình** | |

### Rủi ro:
- ⚠️ SmartW thay đổi HTML → selector hỏng (xác suất thấp)
- ⚠️ Playwright chiếm ~150MB RAM
- ⚠️ VHKT quét sáng, ae quên xem → cần nhắc trên dashboard

### Phụ thuộc cài thêm:
- `playwright` + Chromium (~150MB, cài 1 lần)
- `apscheduler` (scheduler nhẹ)
- `cryptography` (mã hóa credentials)

---

## 10. BƯỚC TIẾP THEO

→ Chạy `/plan` để lên thiết kế chi tiết
