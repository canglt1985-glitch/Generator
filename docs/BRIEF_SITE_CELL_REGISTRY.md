# 💡 BRIEF: Nâng cấp DataSite — Quản lý Vô Tuyến (Cell Registry)

**Ngày tạo:** 2026-04-04
**Cập nhật:** 2026-04-04 (Tích hợp sâu vào DataSite, chuẩn hoá 6 Tab Vận hành)
**Nguồn dữ liệu:** `D:\Chuyen doi so\datasite\Cap nhat cellname Dong Nai_V6.xlsx`

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Công ty đổi Site ID + Cell ID theo địa giới hành chính mới (Đồng Nai).
Nhân viên VHKT đã quen với ID cũ (VD: `BPBL01`) nhưng hệ thống sẽ chuyển sang ID mới (`DNIALO00`).
Cần:
1. Mapping gợi nhớ: nhìn vào ID mới → biết ngay ID cũ là gì
2. Cell Registry: tra cứu cell theo công nghệ, vùng phủ, zone để xử lý vận hành
3. Dữ liệu sẽ được cập nhật liên tục (V7, V8...)

## 2. GIẢI PHÁP ĐỀ XUẤT

Module **"Site & Cell Registry"** tích hợp vào VHKT Web App, gồm 2 tầng:

| Tầng | Mục đích chính |
|------|---------------|
| **Site** | Gợi nhớ ID cũ, xem thông tin kỹ thuật trạm |
| **Cell** | Vận hành: CellOff, cảnh báo, tra cứu phản ánh KH |

### Cấu trúc Cell Name mới (Ví dụ lấy từ sheet ChiTiet):
```
DNISRA00BM3GA
├── DNI    = Mã tỉnh (Đồng Nai)
├── SRA    = Mã phường/xã (Sông Trầu / Sông Nhạn...)
├── 00     = Số thứ tự site trong xã
├── B      = Loại thiết bị (BBU)
├── M3G    = Macro/3G/loại cell
└── A      = Hướng anten (A/B/C/D)
```

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Kỹ thuật viên VHKT — tra cứu daily, xử lý phản ánh KH
- **Secondary:** Quản lý — xem tổng quan theo khu vực/zone

## 4. DỮ LIỆU NGUỒN

| Sheet | Nội dung | Số dòng |
|-------|----------|---------|
| ChiTiet | Mapping đầy đủ 3G + 4G | ~16,624 |

**Cột quan trọng (Sheet ChiTiet):**
- Định danh: `Sitename cũ`, `Cellname cũ`, `Sitename mới`, `Cellname mới`
- Địa lý: `Tỉnh mới`, `Phường/Xã mới`
- Kỹ thuật: `Node-ID`, `Cell-ID`, `PSC/PCI`, `Vendor`, `RAN`
- Vận hành: `Vùng Phủ`, `Phân Loại Trạm`, `Team` (Filter Tổ 3), `Zone`
- GPS: `Lat`, `Long`

## 4.5. THIẾT KẾ MODULE (Quyết định kiến trúc)

### Tích hợp trực tiếp vào DataSite (`datasite_bp`)
Thay vì tạo module mới, tính năng này được nhúng hoàn toàn vào giao diện Quản lý Trạm (DataSite).
Cấu trúc quản lý DataSite sẽ được quy chuẩn hoá lại thành 6 phân hệ (Tab) rõ ràng cho mỗi Trạm:

1. 📄 **Thông tin chung**
2. 🏢 **Cơ sở hạ tầng**
3. 🔋 **Thiết bị phụ trợ** (Điện, Lạnh, Tủ Inverter...)
4. 📻 **Thiết bị viễn thông** (Tủ Rack, BBU, NodeB...)
5. 📶 **Vô tuyến** *(Chính là quy hoạch Cell Registry mới này)*: Chứa Data ID Mới/Cũ, thông số vô tuyến (Hướng, Azimuth, Tilt, PCI, 3G/4G).
6. 🔗 **Truyền dẫn** (Cáp quang, CWDM, Router, **Viba**...)

**Lợi ích:**  
- Quy về Một nguồn chân lý (Single Source of Truth). Kỹ thuật viên vào DataSite là tìm được tất cả, không phải nhớ lúc nào vào app nào.
- Sau này (kể cả khi đã quen ID mới), anh em Tối Ưu Vô Tuyến vẫn dùng Tab này để cập nhật/theo dõi thông số Azimuth, Tilt, PCI chuẩn xác nhất.

---

## 5. TÍNH NĂNG

### 🚀 MVP (Phase 1 — Bắt buộc):

#### A. Import dữ liệu
- [ ] Tạo DB model: `SiteRegistry` + `CellRegistry`
- [ ] Script import: **Chỉ filter lấy các trạm do Tổ 3 quản lý** (Team = 'Tổ 3' hoặc tương đương trong file)
- [ ] Hỗ trợ upsert (update khi có file mới, không xóa toàn bộ)
- [ ] Admin UI: Upload file Excel mới

#### B. Giao diện Unified (Trạm Lồng Cell)
- [ ] Bỏ chia Tab, dùng một giao diện duy nhất: **Master-Detail (Thẻ Trạm ôm danh sách Cell)**.
- [ ] **Mức Site (Header Card):** ID Mới, Badge ID Cũ, Xã Mới, Vùng Phủ, Vendor, Node-ID, và **Độ Cao Anten (m)**. 
- [ ] **Mức Cell (Body Card):** Danh sách trực quan chứa: Cell Mới/Cũ, 3G/4G, PCI/PSC, Cell-ID, **Azimuth (Hướng)**, **Tilt**.

#### C. Tính năng Chỉnh Sửa trên App (Dành cho người đi tuyến)
- [ ] Kỹ thuật viên ở trạm có thể bấm nút **Sửa (Edit) trực tiếp trên Web App**.
- [ ] **Lưu ý Data:** Dữ liệu Excel ban đầu chưa có đủ Height, Tilt, Azimuth. Việc cho phép Edit là để ae đi trạm **cập nhật lại thực tế dần dần**.
- [ ] Lưu lịch sử người cập nhật / thời gian cập nhật.

#### D. Search Thông Minh Không Biên Giới
- [ ] Khung Search duy nhất: Gõ Site ID / Cell ID (cũ hay mới) đều được.
- [ ] Tự động map: Nhập tìm 1 Cell → Hiển thị luôn cả Trạm mẹ và toàn bộ Cells anh em bên trong.
- [ ] Có nút Copy nhanh ID cũ/mới để paste qua SmartW hoặc báo cáo.

### 🎁 Định hướng Tương Lai (Phase 2):
- [ ] **Tích hợp SmartF:** Quét và kéo thêm số liệu vận hành mạng thực tế (Thoại, Data, VLR) móc nối vào hiển thị mức Cell.
- [ ] Báo cáo số lượng trạm đã chuyển đổi ID.
- [ ] Badge ID cũ tích hợp vào trang lịch cúp điện, máy phát
- [ ] Liên kết Cell → SmartW MLL CellOff data
- [ ] Map view (có Lat/Long sẵn)
- [ ] Export danh sách theo khu vực ra PDF/Excel

### 💭 Backlog:
- [ ] Telegram Bot: `/tram DNIALO00` → trả thông tin + ID cũ
- [ ] So sánh traffic cell trước/sau đổi ID

## 6. THIẾT KẾ DATABASE (Sơ bộ)

```sql
-- Site level
SiteRegistry:
  site_id_new      VARCHAR(20) PK   -- DNIALO00
  site_id_old      VARCHAR(20)       -- BPBL01
  tinh_moi         VARCHAR(50)
  phuong_xa_moi    VARCHAR(50)
  vendor           VARCHAR(20)
  phan_loai_tram   VARCHAR(50)
  node_id          VARCHAR(20)
  antenna_height   FLOAT             -- Cập nhật từ Web App
  lat, long        FLOAT
  updated_at       TIMESTAMP

-- Cell level
CellRegistry:
  cell_id_new      VARCHAR(30) PK   -- DNIALO0000BM4CA
  cell_id_old      VARCHAR(30)       -- BPBL01M4BA
  site_id_new      FK → SiteRegistry
  ran              VARCHAR(5)        -- 3G / 4G
  vung_phu         VARCHAR(20)       -- MACRO / INDOOR
  azimuth          INTEGER           -- Hướng (A/B/C -> độ số), cập nhật trên App
  tilt             FLOAT             -- Độ nghiêng, cập nhật trên App
  zone             VARCHAR(20)
  team             VARCHAR(20)
  psc_pci          INTEGER
  cell_id_num      INTEGER
  updated_at       TIMESTAMP
```

## 7. ƯỚC TÍNH ĐỘ PHỨC TẠP

| Phần | Độ khó | Thời gian |
|------|--------|-----------|
| DB model + migration | 🟢 Dễ | 0.5 ngày |
| Import script từ Excel | 🟡 Trung bình | 1 ngày |
| Site list + filter UI | 🟢 Dễ | 1 ngày |
| Cell view + search | 🟡 Trung bình | 1.5 ngày |
| Upload/update UI | 🟡 Trung bình | 0.5 ngày |
| **Tổng Phase 1** | | **~4-5 ngày** |

## 8. RỦI RO

- **16K+ rows trong sheet ChiTiet** → Cần batch insert, tránh timeout khi import Excel.

## 9. BƯỚC TIẾP THEO

→ Chạy `/plan` để thiết kế chi tiết DB schema + API + UI
→ Chạy `/visualize` nếu muốn xem mockup trước
