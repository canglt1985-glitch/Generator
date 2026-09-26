# 💡 BRIEF: AI Agent — Trợ Lý VHKT

**Ngày tạo:** 2026-02-22  
**Cập nhật:** 2026-02-23  
**Trạng thái:** Chờ triển khai

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
AE trong tổ muốn hỏi nhanh về dữ liệu nhà trạm bằng tiếng Việt, thay vì tự mở từng tab, lọc dữ liệu thủ công. DataSite có quá nhiều tab/mục phức tạp, tốn thời gian tra cứu.

## 2. GIẢI PHÁP
Chatbot AI tích hợp sẵn trong app. 3 lớp dữ liệu:
- **Lớp 1 (nhanh):** Query DB nội bộ + SmartW JSON → trả lời ngay
- **Lớp 2 (cache):** DataSite data đã sync về Supabase → trả lời nhanh
- **Lớp 3 (on-demand):** Browser Agent quét DataSite khi cần data mới

## 3. KIẾN TRÚC

```
┌──────────────┐    sync định kỳ     ┌──────────────┐
│   DataSite   │ ←── Browser Agent ──→│   Supabase   │
│  (web gốc)   │   (quét & lưu)      │  (kho cache) │
└──────────────┘                      └──────┬───────┘
                                             │
┌──────────────┐                             │ query
│  SQLite +    │─────────────────────────────→│
│  SmartW JSON │   data nội bộ        ┌──────┴───────┐
└──────────────┘                      │   AI Agent   │
                                      │  (Gemini)    │
        "Trạm X SLA bao nhiêu?" ───→ │  Function    │
                                      │  Calling     │
                                      └──────────────┘
```

- **AI Engine:** Google Gemini 2.0 Flash (free tier → trả phí khi ổn định)
- **Kiểu MCP mini** — AI chỉ gọi hàm đã code sẵn, không tự viết query
- **DataSite:** http://10.0.35.3:8080/datasite/ — login SSO (giống SmartW)

## 4. UI
- Nút chat nhỏ góc phải (kiểu chatbot hỗ trợ)
- Click → popup chat toàn màn hình
- Lịch sử chat trong phiên

## 5. TÍNH NĂNG

### 🚀 Phase 1 — MVP (data nội bộ):
- [ ] API key Gemini (Google AI Studio — miễn phí)
- [ ] Backend: endpoint `/api/chat` + function calling
- [ ] Tools (hàm query): DB nội bộ + SmartW JSON
- [ ] Frontend: chatbot popup UI
- [ ] System prompt mô tả schema cho AI

### 🎁 Phase 2 — DataSite sync:
- [ ] Setup Supabase (free tier)
- [ ] DataSite scraper cho 5-10 bảng hay dùng
- [ ] Sync định kỳ (1 lần/ngày hoặc khi cần)
- [ ] Thêm tools query Supabase cho AI

### 🔮 Phase 3 — Browser Agent (ad-hoc):
- [ ] Tích hợp Browser Agent (browser-use / Stagehand)
- [ ] AI tự lái DataSite cho câu hỏi ngoài phạm vi cache
- [ ] Xem xét ghi ngược (cần review kỹ)

### 📝 Tính năng bổ sung — "To-do DataSite":
- [ ] Lưu vết thay đổi cần cập nhật lên DataSite
- [ ] Danh sách "Chờ cập nhật DataSite" trong app
- [ ] Tick ✅ khi đã cập nhật thủ công xong
- [ ] AI gợi nhớ: "Anh có 3 mục chưa cập nhật lên DataSite"

## 6. NGUỒN DỮ LIỆU (TOOLS)

| Lớp | Nguồn | Tốc độ | Ví dụ |
|-----|-------|--------|-------|
| 1 | SQLite (nội bộ) | < 1s | GeneralInfo, FuelTransaction, PowerSchedule |
| 1 | SmartW JSON | < 1s | MĐ/MPĐ/MLL active, VHKT/SLA |
| 2 | Supabase (cache DataSite) | < 1s | Báo cáo DataSite hay dùng |
| 3 | Browser Agent → DataSite | 30-60s | Câu hỏi ad-hoc |

## 7. VÍ DỤ CÂU HỎI

**Phase 1 (data nội bộ):**
- "Trạm nào đang mất điện?"
- "Tổng nhiên liệu tháng 2?"
- "Trạm DNBH0AUL mất điện mấy lần tuần này?"

**Phase 2 (DataSite cache):**
- "Báo cáo SLA tuần 08/2026 từ DataSite"
- "Danh sách trạm tồn tại nguồn"

**To-do DataSite:**
- "Ghi nhớ: cập nhật MFĐ trạm X = Đã sửa" → lưu to-do
- "Có gì chưa cập nhật DataSite không?" → show danh sách

## 8. GHI NGƯỢC DATASITE
**Quyết định:** Không tự động ghi ngược (quá rủi ro).
- Thay vào đó: lưu "to-do" trong app → anh tự vào DataSite cập nhật
- AI gợi nhớ khi có mục chưa xử lý

## 9. CHI PHÍ

| Giai đoạn | Chi phí |
|-----------|---------|
| Phase 1 (MVP) | $0 (Gemini free: 1500 câu/ngày) |
| Phase 2 (Supabase) | $0 (free tier: 500MB) |
| Phase 3 (Browser Agent) | TBD — cần thêm API calls |
| Production | ~$5-20/tháng (tùy mức dùng) |

## 10. BƯỚC TIẾP THEO
→ Gõ `/plan` để lên thiết kế chi tiết Phase 1 (MVP) khi sẵn sàng
