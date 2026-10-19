# Phase 01: Database Schema (Photos & Defects) & Image Proxy

Status: ⏳ Planned  
Target Components: Supabase SQL, Backend / Serverless Proxy

---

## 🎯 Mục Tiêu
1. Thiết kế và tạo bảng `site_photos` (lưu ảnh 2 chiều + AI metadata + OCR serial) và bảng `site_defects` (theo dõi tồn tại khiếm khuyết Trước/Sau).
2. Xây dựng route Image Proxy an toàn trên Vercel để web `tvt3.vercel.app` kéo ảnh từ Telegram CDN mà không để lộ Telegram Bot Token, hỗ trợ Caching lâu dài.

---

## 📋 Chi Tiết Cấu Trúc Bảng Database (Supabase)

### 1. Bảng `site_photos` (Lưu trữ ảnh & kết quả AI phân tích)
```sql
CREATE TABLE IF NOT EXISTS public.site_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT NOT NULL,                          -- Mã trạm (vd: 'DNTP31')
    
    -- Chiều 1: Sự kiện / Đợt công việc
    event_name TEXT DEFAULT 'Khảo sát hiện trạng',  -- Khảo sát toàn trạm, Nghiệm thu móng, Bảo trì MPĐ...
    
    -- Chiều 2: Hạng mục thiết bị (AI tự gán)
    category TEXT DEFAULT 'chung',                  -- cot_anten, mpd, nguon_accu, mat_bang, cong_to, bien_ban, chung
    ai_tags TEXT[] DEFAULT '{}',                    -- Nhãn chi tiết: ['cot_day_co', 'ri_set', 'tem_may']
    ai_summary TEXT,                                -- Tóm tắt nội dung ảnh do AI sinh
    
    -- Dữ liệu OCR Tem Nhãn & Đồng hồ điện
    ocr_data JSONB DEFAULT '{}'::jsonb,             -- { "serial_number": "VK-201889", "equipment_type": "mpd", "kwh": "45230" }
    is_nameplate BOOLEAN DEFAULT FALSE,             -- Cờ đánh dấu đây là ảnh chụp cận cảnh tem nhãn thiết bị
    
    -- Dữ liệu Telegram & Lưu trữ
    tg_file_id TEXT NOT NULL,                       -- Mã file Telegram để fetch ảnh
    tg_file_unique_id TEXT UNIQUE NOT NULL,         -- Chống lưu trùng lặp ảnh (Deduplication)
    tg_message_id BIGINT,                           -- ID bài post trong Vault Channel
    
    -- Vị trí & Thời gian
    captured_at DATE DEFAULT CURRENT_DATE,          -- Ngày chụp thực tế
    lat DOUBLE PRECISION,                           -- Vĩ độ (từ EXIF hoặc lấy từ bảng datasites)
    lon DOUBLE PRECISION,                           -- Kinh độ
    location_source TEXT DEFAULT 'site_db',         -- 'gps_exif', 'telegram_live', 'site_db'
    
    -- Người nạp
    uploader_name TEXT,                             -- Tên người gửi / kỹ thuật viên
    uploader_tg_id BIGINT,                          -- Telegram ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_site_photos_site_id ON public.site_photos(site_id);
CREATE INDEX IF NOT EXISTS idx_site_photos_category ON public.site_photos(category);
CREATE INDEX IF NOT EXISTS idx_site_photos_captured_at ON public.site_photos(captured_at DESC);
```

### 2. Bảng `site_defects` (Quản lý Tồn tại / Khiếm khuyết trạm)
```sql
CREATE TABLE IF NOT EXISTS public.site_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT NOT NULL,                          -- Mã trạm
    title TEXT NOT NULL,                            -- Tên tồn tại: 'Máy lạnh 2 báo lỗi E4', 'Rỉ sét chân móng cột'
    description TEXT,                               -- Mô tả chi tiết khiếm khuyết
    severity TEXT DEFAULT 'medium',                 -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'pending',                  -- 'pending' (🔴 Chưa xử lý), 'resolved' (🟢 Đã khắc phục)
    
    -- Ảnh Before (Lúc phát hiện lỗi)
    photo_before_id UUID REFERENCES public.site_photos(id),
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    reported_by TEXT,
    
    -- Ảnh After (Sau khi khắc phục xong)
    photo_after_id UUID REFERENCES public.site_photos(id),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_defects_site_id ON public.site_defects(site_id);
CREATE INDEX IF NOT EXISTS idx_site_defects_status ON public.site_defects(status);
```

---

## 📋 Image Proxy Endpoint
* Route: `tvt3_v2/api/photo.js` (Serverless Function).
* Nhận: `GET /api/photo?file_id=AgACAg...`
* Caching Header: `Cache-Control: public, max-age=31536000, immutable` (Cache 1 năm trên máy người xem).

---

## ✅ Tiêu Chí Hoàn Thành (DoD)
- [ ] Bảng `site_photos` và `site_defects` được tạo thành công trên Supabase.
- [ ] Proxy endpoint chạy mượt mà, bảo vệ token và có header caching.
