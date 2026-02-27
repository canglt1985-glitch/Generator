# 💡 BRIEF: Nâng cấp MLL Scraping — Tách MLL Trạm / MLL Cell

**Ngày:** 27/02/2026
**Mục đích:** Chuyển từ endpoint cũ sang `alarmLog-new/data.htm` + tách MLL thành 2 loại

---

## 1. VẤN ĐỀ HIỆN TẠI

### Scraper MLL cũ:
```
URL:  /smartw/rp-site-v2/list.htm
Params: region, team=MBF_MN_DONG_NAI_PVT_TVT3, province, sdate, edate, tramMll=on
```
- **Vấn đề:** Endpoint cũ, không realtime
- **Thiếu:** Không phân biệt MLL Trạm (mất cả trạm) vs MLL Cell (mất 1 cell)
- Dùng `_parse_table()` — parse jqxGrid HTML page

### URL mới phát hiện:
```
Endpoint: /smartw/alarmLog-new/data.htm
Kiểu:     AJAX data endpoint (trả JSON trực tiếp cho jqxGrid)
```

---

## 2. PHÂN TÍCH 2 URL MỚI

### So sánh URL 1 (MLL Trạm) vs URL 2 (MLL Cell):

| Parameter | MLL Trạm | MLL Cell | Ghi chú |
|-----------|----------|----------|---------|
| `center` | MLL | MLL | Giống nhau |
| `sdateF` | 27/02/2026 00:00:00 | (same) | → Thay bằng dynamic (30 ngày) |
| `sdateT` | 27/02/2026 23:59:00 | (same) | → Thay bằng dynamic (hôm nay) |
| `function` | active | active | Chỉ lấy alarm đang active |
| `network` | ALL | ALL | Tất cả mạng |
| ~~`username`~~ | ~~cang.letan~~ | — | **BỎ** (dùng SSO session) |
| `team` | TVT Đồng Nai 3 | (same) | Giữ nguyên |
| `group` | PVT Đồng Nai | (same) | **MỚI** — endpoint cũ không có |
| `region` | MN | (same) | Giữ nguyên |
| **`isDownSite`** | **Y** | **N** | ⭐ **KHÁC BIỆT DUY NHẤT** |
| `trungTamFilter` | MobiFone Đồng Nai | (same) | **MỚI** — filter trung tâm |
| `pagesize` | 30 | 30 | → Thay thành **300** |
| `recordendindex` | 30 | 30 | → Thay thành **300** |

### Tóm lại sự khác biệt:
- **`isDownSite=Y`** → MLL Trạm (mất liên lạc cả trạm — nghiêm trọng)
- **`isDownSite=N`** → MLL Cell (mất liên lạc 1 cell — ít nghiêm trọng hơn)

---

## 3. URL ĐÃ CLEAN (bỏ user, 30 ngày, pagesize 300)

### MLL Trạm (isDownSite=Y):
```
/smartw/alarmLog-new/data.htm?
  center=MLL
  &sdateF={30_ngay_truoc} 00:00:00
  &sdateT={hom_nay} 23:59:00
  &edateF=&edateT=
  &bscid=&cellid=&vendor=&district=
  &function=active
  &severity=
  &network=ALL
  &province=
  &team=TVT Đồng Nai 3
  &group=PVT Đồng Nai
  &alarmType=&statusFinish=&statusView=
  &duarationF=&duarationT=
  &region=MN
  &neType=&ackStatus=&ackUserTk=&loaiCB=&ip=&active7=
  &isDownSite=Y
  &alarmName=
  &isAlarmTicketed=N
  &isAlarmNotTicketed=N
  &tienXuLyFilter=
  &trungTamFilter=MobiFone Đồng Nai
  &filterscount=0&groupscount=0
  &pagenum=0&pagesize=300
  &recordstartindex=0&recordendindex=300
```

### MLL Cell (isDownSite=N):
```
(Giống trên, chỉ thay isDownSite=N)
```

---

## 4. THAY ĐỔI KỸ THUẬT CẦN LÀM

### 4.1. Endpoint mới vs cũ:
| | Cũ | Mới |
|---|---|---|
| **URL** | `/smartw/rp-site-v2/list.htm` | `/smartw/alarmLog-new/data.htm` |
| **Kiểu data** | HTML page → parse jqxGrid | AJAX → trả JSON trực tiếp |
| **Team param** | `MBF_MN_DONG_NAI_PVT_TVT3` | `TVT Đồng Nai 3` |
| **Filter** | `tramMll=on` | `isDownSite=Y\|N`, `function=active` |
| **Phân loại** | Không | MLL Trạm / MLL Cell |
| **Pagesize** | 30 (jqxGrid default) | 300 (param trực tiếp) |

### 4.2. Approach: JSON trực tiếp
Endpoint `data.htm` là AJAX source cho jqxGrid → trả **JSON array** trực tiếp.  
Có thể dùng `page.evaluate(fetch(...))` thay vì navigate + parse HTML:

```python
# Gọi API trực tiếp qua browser fetch (giữ SSO session cookies)
response = await page.evaluate('''
    async (url) => {
        const res = await fetch(url);
        return await res.json();
    }
''', mll_url)
```

**Ưu điểm:**
- Nhanh hơn nhiều (không cần render HTML + parse jqxGrid)
- Không bị lỗi pagination  
- Data chính xác hơn (JSON gốc)

### 4.3. Phân tách output:
```
data/smartw/
├── mll.json          → MLL Trạm (isDownSite=Y) — hiện hữu, giữ tương thích
├── mll_cell.json     → MLL Cell (isDownSite=N) — MỚI
```

### 4.4. Constants mới cần thêm:
```python
GROUP_ALARM = 'PVT Đồng Nai'           # Mới
TRUNG_TAM_FILTER = 'MobiFone Đồng Nai' # Mới
MLL_PAGESIZE = 300                      # Mới
```

---

## 5. TÁC ĐỘNG ĐẾN HỆ THỐNG

### Files cần sửa:
| File | Thay đổi |
|---|---|
| `smartw/scraper.py` | Viết lại `scrape_mll()`, thêm `scrape_mll_cell()`, thêm constants |
| `smartw/routes.py` | Thêm API `/api/smartw/mll-cell`, sửa `/api/smartw/summary` |
| `smartw/worker.py` | Gọi thêm `scrape_mll_cell()` trong poll cycle |
| `templates/vhkt.html` | Thêm tab/card MLL Cell + bảng dữ liệu |

### UI Changes:
- Nav cards: thêm card **MLL Cell** (hoặc tách MLL thành 2 sub-tabs)
- Bảng MLL Cell: có thể có cột khác (cell_id, bscid...)

---

## 6. KẾ HOẠCH THỰC HIỆN

| Phase | Công việc | Effort |
|---|---|---|
| 1 | Thêm constants, viết `scrape_mll()` mới + `scrape_mll_cell()` | ~1h |
| 2 | API routes + worker integration | ~30m |
| 3 | UI: thêm tab/card MLL Cell trên trang VHKT | ~1h |
| 4 | Test end-to-end | ~30m |

**Tổng ước tính: ~3 giờ**

---

## 7. CÂU HỎI CẦN LÀM RÕ

1. **Columns MLL mới:** Endpoint `alarmLog-new` trả về những cột gì? 
   → Cần scrape thử 1 lần để xem response JSON structure
2. **MĐ/MPĐ cũng chuyển?** User đề cập "url scrape cũ không realtime cho MĐ/MPĐ/MLL"
   → Sau MLL, có chuyển MĐ/MPĐ sang `alarmLog-new` không?
3. **UI layout:** MLL Cell hiển thị ở đâu? Tab riêng hay gộp chung MLL?

---

## 8. BƯỚC TIẾP THEO
→ `/plan` để tạo Phase files chi tiết
→ `/code phase-01` để bắt đầu implement
