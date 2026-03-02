# 💡 BRIEF: Auto Fuel Price từ PVOil API

**Ngày tạo:** 2026-03-01
**Brainstorm cùng:** Admin VT3-VHKT

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Hiện tại đơn giá xăng dầu trong app được gợi ý từ **lần mua gần nhất** (SUGGESTED_PRICE).
Giá này thường sai vì giá xăng dầu thay đổi mỗi 7-8 ngày. Nhân viên phải tra giá thủ công.

## 2. GIẢI PHÁP ĐỀ XUẤT

Tự động lấy giá xăng dầu từ **PVOil API** → auto-fill đơn giá trên form. 
Xoá bỏ hoàn toàn cơ chế "gợi nhớ giá mua gần nhất" (SUGGESTED_PRICE).

### Nguồn dữ liệu:
- **API:** `https://www.pvoil.com.vn/api/oilprice/load-view?date={dd/mm/yyyy hh:mm:ss}`
- **Mặt hàng cần lấy:**
  - ⛽ **Xăng RON 95-III** → cho trạm dùng xăng
  - 🛢️ **Dầu DO 0,05S-II** → cho trạm dùng dầu
- **Chu kỳ cập nhật:** Giá thay đổi ~7-8 ngày/lần, hiệu lực từ 15:00

### Quy tắc áp dụng giá:
| Nơi dùng | Đơn giá lấy từ | Ghi chú |
|----------|----------------|---------|
| **Đổ nhiên liệu** (FuelLedger) | Giá PVOil mới nhất | Read-only, user chỉ xem (mua theo giá niêm yết) |
| **Chạy máy** (GeneratorLog) | Giá PVOil buổi sáng ngày VH | Read-only, auto-fill theo ngày vận hành |

### Thay đổi so với hiện tại:
- ❌ **Bỏ** SUGGESTED_PRICE (giá mua gần nhất) — xoá hoàn toàn
- ❌ **Bỏ** đơn giá cho user chỉnh sửa — giá niêm yết = giá chuẩn
- ✅ **Thêm** API `/api/fuel-price` trả giá PVOil hiện tại
- ✅ **Thêm** scheduler scrape giá PVOil 2 lần/ngày
- ✅ Đơn giá **read-only** (nền xám), auto-fill từ PVOil, user chỉ xem

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Nhân viên:** Tạo phiếu đổ NL → đơn giá tự điền, chỉ cần xác nhận
- **Admin:** Nhập chạy máy → đơn giá auto theo ngày vận hành

## 4. CHI TIẾT KỸ THUẬT

### Scraper (Backend):
- Dùng `requests` (HTTP GET) — không cần Playwright
- Scrape 2 lần/ngày: **7:00 AM** + **16:00 PM**
- Parse HTML table hoặc API JSON response
- Lưu file: `data/fuel_prices.json`

### Cấu trúc dữ liệu lưu trữ:
```json
{
  "xang_ron95": 20150,
  "dau_do": 19270,
  "updated_at": "2026-02-26T15:00:00",
  "effective_date": "26/02/2026",
  "source": "pvoil",
  "scraped_at": "2026-03-01T07:00:00"
}
```

### Frontend:
- Form Đổ NL: khi chọn loại NL (Dầu/Xăng) → fetch `/api/fuel-price` → fill đơn giá
- Form Chạy Máy: khi chọn trạm → auto-fill đơn giá theo loại NL của trạm
- Đơn giá hiển thị read-only (tham khảo), user không cần chỉnh sửa

### Files cần sửa:
| File | Thay đổi |
|------|----------|
| `helpers.py` hoặc `fuel_price_scraper.py` (mới) | Scrape PVOil API |
| `app.py` | Thêm scheduler job |
| `generator/routes_fuel.py` | Bỏ SUGGESTED_PRICE, thêm API fuel-price |
| `generator/routes_info.py` | Chạy máy auto-fill giá |
| `templates/generator.html` | Bỏ SUGGESTED_PRICE JS, thêm auto-fill từ API |
| `templates/power_schedule.html` | Tương tự generator.html |
| `templates/admin_mpd.html` | Form chạy máy auto-fill giá |

## 5. TÍNH NĂNG

### 🚀 MVP (Làm ngay):
- [ ] Scraper PVOil API → lưu JSON
- [ ] Scheduler 2 lần/ngày (7AM + 4PM)
- [ ] API `/api/fuel-price` trả giá hiện tại
- [ ] Form Đổ NL: auto-fill đơn giá theo loại NL
- [ ] Form Chạy Máy: auto-fill đơn giá theo loại NL trạm
- [ ] Bỏ SUGGESTED_PRICE hoàn toàn

### 🎁 Phase 2 (Nice-to-have):
- [ ] Lịch sử giá xăng dầu (biểu đồ)
- [ ] Thông báo khi giá thay đổi

## 6. ƯỚC TÍNH SƠ BỘ

- **Độ phức tạp:** 🟢 Đơn giản — API sẵn, logic rõ ràng
- **Thời gian:** ~30-45 phút
- **Rủi ro:**
  - PVOil thay đổi cấu trúc HTML/API → cần update scraper
  - API bị block nếu gọi quá nhiều (nhưng 2 lần/ngày thì OK)

## 7. BƯỚC TIẾP THEO
→ `/plan` để tạo task list → `/code` để implement
