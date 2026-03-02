# 💡 BRIEF: Auto Import Thời Gian Chạy Máy Phát Điện

**Ngày tạo:** 01/03/2026
**Brainstorm session:** /brainstorm

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Hiện tại tổ trưởng phải nhập tay thời gian chạy máy phát điện (GeneratorLog) → dễ sai, thiếu sót, tốn thời gian. 
Dữ liệu chạy máy đã có sẵn trên SmartW (alarm "Generator running") nhưng chưa được tự động hóa.

## 2. GIẢI PHÁP ĐỀ XUẤT

Auto-scrape alarm MPĐ từ SmartW API → lọc → tính toán → import vào bảng GeneratorLog.
- Dữ liệu bình thường: auto-import luôn
- Dữ liệu bất thường: đưa vào trạng thái "chờ duyệt" trong cùng bảng, admin review rồi approve/sửa

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Admin / Tổ trưởng (approve + review)
- **Secondary:** Nhân viên vận hành (xem data chạy máy)

---

## 4. NGUỒN DỮ LIỆU

### SmartW — 2 endpoint khác nhau:

| Mục đích | Endpoint | Ghi chú |
|----------|----------|---------|
| **Tab MPĐ hiện tại** (active) | `alarmLog-new/data.htm?function=active&center=TTML` | Chỉ alarm đang chạy, KHÔNG có edate |
| **Reports MFĐ** (history) ✅ | `alarm/site/list.htm?type=MFD` → API: `alarm/site/data.htm?type=MFD` | Báo cáo theo ngày, CÓ thời gian kết thúc |

### Dùng endpoint Reports (alarm/site) — ĐÃ CÓ edate

**URL mẫu:**
```
alarm/site/data.htm?type=MFD&level=SITE
  &team=TVT+Đồng+Nai+3
  &sdate=28/02/2026+00:00
  &edate=28/02/2026+23:59
```

**Cần test:** ✅ ĐÃ XÁC NHẬN — `data.htm` + pagination params trả JSON.

**API JSON response structure:**
```json
[
  {"TotalRows": "7"},
  {"strWhere": ""}, {"sortfield": "null"}, {"sortorder": "null"},
  {"Rows": [
    {"siteid": "DNTN28", "alarmName": "7404|Generator running",
     "sdate": "Feb 28, 2026 4:31:44 PM", "edate": "Feb 28, 2026 9:26:19 PM",
     "minuteNumber": 295, "ne": "DNTN28", "neType": "...", 
     "network": "RAN_4G", "vendor": "NOKIA SIEMENS", ...}
  ]}
]
```

**Data fields (ĐÃ XÁC NHẬN):**

| Field SmartW | Ý nghĩa | Map → GeneratorLog |
|-------------|---------|-------------------|
| `siteid` | Mã trạm | `id_tram` |
| `sdate` | TG bắt đầu (English format) | `gio_bat_dau` |
| `edate` | TG kết thúc (English format) | `gio_ket_thuc` |
| `minuteNumber` | Thời gian (phút, integer) | `thoi_gian_hoat_dong` (÷60 → giờ) |
| `alarmName` | Loại alarm | Dùng filter "generator" |
| `ne` | Tên thiết bị | Tham khảo |

### GeneralInfo (tra cứu thêm)

| Field | Dùng để |
|-------|--------|
| `dinh_muc` | Định mức thanh toán (lít/giờ) |
| `loai_nhien_lieu` | Xăng / Dầu → áp giá PVOil |
| `may_phat_dien` | Tên máy |
| `loai_may` | Loại máy |

---

## 5. QUY TẮC XỬ LÝ

### 5.1. Lọc bỏ
- **Bỏ event < 10 phút** (chạy test, chạy ngắn)

### 5.2. Phát hiện bất thường

**Logic phân loại:**
```
if duration < 10p → BỎ (chạy test, chạy ngắn)
elif start ≥ 21:00 AND end ≤ 07:00 AND duration ≤ 600p (10h):
    → NORMAL (qua đêm hợp lý — sự cố điện đêm)
elif duration ≤ 720p (12h):
    → NORMAL 
else:
    → PENDING (treo cảnh báo / bất thường → admin review)
```

**Ví dụ phân loại:**

| Trường hợp | Ví dụ | Status |
|-----------|-------|--------|
| Chạy ban ngày hợp lý | 09:44 → 10:40 (55p) | ✅ Normal |
| Qua đêm hợp lý | 23:13 → 00:47+1 (94p) | ✅ Normal |
| Qua đêm dài nhưng OK | 22:00 → 06:00+1 (8h) | ✅ Normal |
| Sáng → sáng mai (treo CB) | 09:00 → 09:00+1 (24h) | ⚠️ Pending |
| Chiều → trưa mai (treo CB) | 15:00 → 12:00+1 (21h) | ⚠️ Pending |
| Đêm quá lâu (treo CB) | 21:00 → 08:00+1 (11h) | ⚠️ Pending |

### 5.3. Phân loại (trong cùng bảng GeneratorLog)

| Trường hợp | Status | Xử lý |
|-----------|--------|-------|
| Normal (< 12h, có edate) | `approved` | Auto-import, tính tiền luôn |
| Bất thường (> 12h hoặc no edate) | `pending` | Hiển thị trong bảng, chờ admin sửa thời gian + approve |

### 5.4. Công thức tính toán

```
ngay_van_hanh = ngày từ sdateStr (YYYY-MM-DD)
gio_bat_dau = giờ từ sdateStr (HH:MM)
gio_ket_thuc = giờ từ edateStr (HH:MM) hoặc null
thoi_gian_hoat_dong = (edate - sdate) / 3600000  (giờ, từ unix ms)
nhien_lieu_tieu_hao = thoi_gian_hoat_dong × dinh_muc (lít/giờ từ GeneralInfo)
don_gia = giá PVOil ÷ 1.08  (trước VAT)
thanh_tien = nhien_lieu_tieu_hao × don_gia
```

Trong đó giá PVOil tra theo:
- `loai_nhien_lieu` từ GeneralInfo → Xăng (xang_ron95) hoặc Dầu (dau_do)
- Giá tại thời điểm `ngay_van_hanh` (lấy buổi sáng hôm đó)

---

## 6. THAY ĐỔI DATABASE

### GeneratorLog — Thêm fields mới:

| Field mới | Type | Mô tả |
|----------|------|-------|
| `status` | String(20) | `approved` / `pending` / `rejected` |
| `source` | String(20) | `smartw` / `manual` |
| `smartw_alarm_id` | String(50) | ID alarm gốc (chống duplicate) |

### Không tạo bảng mới — dùng chung GeneratorLog
- Record `status=pending` hiển thị highlight khác (màu vàng/cam)
- Admin click → edit thời gian → approve → status chuyển `approved`

---

## 7. SCHEDULER

- **Tần suất:** Mỗi sáng 6:00 AM (lấy data ngày hôm trước)
- **Logic:** 
  1. Scrape alarm MPĐ ngày hôm trước (sdate = hôm qua 00:00 → 23:59)
  2. Lọc chỉ giữ "Generator running"
  3. Lọc bỏ < 10 phút
  4. Check trùng lặp (smartw_alarm_id)
  5. Tra GeneralInfo → lấy dinh_muc, loai_nhien_lieu, may_phat_dien
  6. Tính toán → insert vào GeneratorLog

---

## 8. TÍNH NĂNG

### 🚀 MVP (Bắt buộc):
- [x] Scrape alarm MPĐ từ SmartW API (dùng scraper có sẵn)
- [ ] Lọc event < 10p, detect bất thường > 12h
- [x] Auto-import normal → GeneratorLog
- [ ] Flag abnormal → GeneratorLog (status=pending)
- [x] Tính toán: NL tiêu hao, đơn giá trước VAT, thành tiền
- [ ] UI: Highlight pending records, admin approve/edit
- [x] Scheduler: 6 AM hàng ngày
- [x] Summary cards (records, giờ, xăng/dầu, chi phí)
- [x] Export theo tháng filter
- [x] Smart MLL classify (site_cell_count.json)

### 🎁 Phase 2 (Sau):
- [ ] Cross-check với lịch cúp điện (MĐ alarm)
- [ ] Dashboard thống kê chạy máy theo tháng
- [ ] Alert khi phát hiện nhiều event bất thường

---

## 9. ƯỚC TÍNH

- **Độ phức tạp:** Trung bình
- **Rủi ro:** SmartW API format thay đổi (đã handle trong scraper hiện tại)
- **Phụ thuộc:** SmartW credentials đã cấu hình, GeneralInfo đã có data

## 10. BƯỚC TIẾP THEO
→ Chạy `/plan` để lên thiết kế chi tiết
→ Chạy `/code` để implement
