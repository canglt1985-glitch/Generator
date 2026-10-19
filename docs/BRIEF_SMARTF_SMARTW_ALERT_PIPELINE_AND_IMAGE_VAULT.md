# BRIEF: SMARTF-SMARTW CORRELATION PIPELINE & HỆ THỐNG QUẢN LÝ ẢNH DỰ ÁN

- **Ngày ghi nhận:** 19/10/2026
- **Tác giả ý tưởng:** anh Cương (TVT3)
- **Mục tiêu:** 
  1. Phối hợp 2 luồng SmartF (KPI suy giảm) -> SmartW (Nguyên nhân cảnh báo) -> Điều hành tự động.
  2. Kiến trúc nén, lưu trữ, mã hóa và tra cứu thông minh kho hình ảnh khổng lồ từ các dự án CSHT & VHKT.

---

## PHẦN 1: PIPELINE SMARTF ➡️ SMARTW ➡️ BÁO CÁO ĐIỀU HÀNH

```
┌─────────────────────────────────┐
│     QUÉT ĐỊNH KỲ: SMARTF        │ ➡️ Phát hiện Site/Cell kém
│  (KPI: Drop RRC/ERAB, Throughput)│    (Danh sách Target Sites)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     QUÉT ĐÀO SÂU: SMARTW        │ ➡️ Rút danh sách Alarms đang active
│(Mất điện, VSWR, Nhiệt độ, Quang)│    của đúng các Target Sites
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      TỔNG HỢP & PHÂN PHỐI       │
├─────────────────────────────────┤
│ 1. Báo cáo chung (Channel/Group)│ ➡️ Gửi ảnh Infographic tổng quan ca
│ 2. Báo cáo riêng (Direct Msg)   │ ➡️ Bot DM / Tag đích danh QLT phụ trách
│ 3. Ghi nhận Lịch sử (Obsidian)  │ ➡️ Đẩy vào Daily Note & Trang [[Mã trạm]]
└─────────────────────────────────┘
```

### Điểm đột phá:
- **Tự động đối soát nguyên nhân:** Không chỉ báo "trạm kém", mà giải thích luôn "kém do mất điện đang chạy accu" hay "kém do suy hao quang".
- **Giao việc chủ động:** QLT không cần mở tool, bot tự "gõ cửa" đúng người chịu trách nhiệm.

---

## PHẦN 2: KIẾN TRÚC MÃ HOÁ, LƯU TRỮ & TÌM KIẾM ẢNH DỰ ÁN

### 1. Nỗi đau hiện tại
- Ảnh chụp hiện trường cực nhiều (nghiệm thu CSHT, khảo sát mặt bằng, máy phát điện, bình accu, tủ nguồn, đồng hồ điện, cáp...).
- Lưu rải rác trên Zalo/Telegram/điện thoại, tên file ngẫu nhiên (`IMG_1234.jpg`).
- Dung lượng khổng lồ làm nặng máy; khi cần tìm lại ảnh cũ của trạm 1 năm trước thì "bơi" trong file.

### 2. Giải pháp Nén & Mã hóa (Image Encoding & Optimization)
- **Định dạng chuẩn:** Chuyển đổi toàn bộ sang **WebP** (chất lượng 82-85%):
  - Dung lượng giảm 70 - 80% so với JPG/PNG từ điện thoại.
  - Chi tiết kỹ thuật (số đồng hồ điện, nhãn thiết bị) vẫn sắc nét.
- **Deduplication (Chống trùng lặp bằng Content Hash SHA-256):**
  - Nhiều người cùng gửi 1 bức ảnh vào nhiều nhóm khác nhau -> tính SHA-256 của file ảnh.
  - Nếu hash đã tồn tại trong DB -> chỉ tạo link tham chiếu, không lưu đè file mới (tiết kiệm 30-40% ổ cứng).
- **Bảo toàn EXIF thông minh:**
  - Tự động trích xuất: Ngày giờ chụp thực tế + Toạ độ GPS (Kinh độ, Vĩ độ).
  - Đối chiếu GPS của ảnh với toạ độ trạm trên Supabase để tự động phát hiện ảnh thuộc trạm nào (Auto-tagging).

### 3. Cấu trúc Thư mục Lưu trữ (Local / NAS / Object Storage)
```text
photos/
└── sites/
    └── [SITE_ID]/                 # Ví dụ: DNTP31/
        ├── 2026/
        │   ├── mat_bang/
        │   │   └── DNTP31_MB_20261019_a1b2c3.webp
        │   ├── mpd/
        │   │   └── DNTP31_MPD_20261019_d4e5f6.webp
        │   └── nghiem_thu/
        └── thumbnails/            # Ảnh thu nhỏ (~300px) để xem siêu nhanh
```

### 4. Cơ chế Tìm kiếm Đa tầng (Search Engine)
1. **Tìm kiếm theo Thuộc tính (Metadata Index):**
   - Lưu vào SQLite hoặc Supabase: `site_id`, `category` (mặt bằng, máy phát, cáp, tủ nguồn), `captured_date`, `tags`.
   - Tìm kiếm: "Cho xem ảnh trạm DNTP31, mục MPĐ, chụp trong quý 3/2026".
2. **Tích hợp Obsidian & TVT3 Web:**
   - Trong trang `DNTP31.md` trên Obsidian hoặc giao diện web TVT3, tự nhúng Gallery ảnh dạng lưới mini.
3. **Tìm kiếm bằng AI Thị giác Cục bộ (Local CLIP Search - 0 Token Cloud):**
   - Dùng model AI thị giác nhỏ chạy offline trên máy Mac (`clip-ViT-B-32`):
   - Đánh chỉ mục vector cho ảnh một lần duy nhất lúc import.
   - Khi cần tìm, anh chỉ việc gõ tiếng Việt: *"ảnh tủ nguồn rỉ sét"*, *"đồng hồ điện 3 pha"*, *"cột anten ngập nước"* -> Hệ thống tự bốc đúng ảnh ra mà không cần con người phải đặt tên chi tiết từng ảnh.
