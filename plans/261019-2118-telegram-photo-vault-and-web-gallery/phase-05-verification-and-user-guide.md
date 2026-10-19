# Phase 05: Verification & End-to-End User Guide

Status: ⏳ Planned  
Target File: `docs/GUIDE_PHOTO_VAULT.md`, Tests

---

## 🎯 Mục Tiêu
1. Kiểm thử tích hợp toàn diện (E2E Integration Test):
   * Gửi ảnh từ Telegram cá nhân -> Bot nhận -> AI dán nhãn 2 chiều & đọc serial -> Ghi Supabase -> Mở Web thấy album và tem máy.
   * Gửi báo tồn tại `ton_tai` và khắc phục `da_khac_phuc` -> Kiểm tra cập nhật thẻ Trước/Sau trên web.
   * Thử nghiệm phát hiện lệch serial và bấm 1-chạm sửa database.
2. Hoàn thiện Cẩm nang Hướng dẫn Bỏ túi 1 Trang (`docs/GUIDE_PHOTO_VAULT.md`).

---

## 📋 Nội Dung Cẩm Nang Bỏ Túi 1 Trang (`GUIDE_PHOTO_VAULT.md`)
1. **Gửi ảnh thông thường (Khảo sát toàn trạm):**
   - Chọn chùm ảnh trên Zalo ➡️ Chia sẻ sang Bot Telegram TVT3 ➡️ Caption: `[Mã trạm] khao sat`.
2. **Báo lỗi / Tồn tại tại trạm:**
   - Chụp ảnh chỗ hỏng ➡️ Gửi Bot: `[Mã trạm] ton_tai [Mô tả ngắn lỗi]`.
   - Khi đã sửa xong ➡️ Chụp ảnh nghiệm thu ➡️ Gửi Bot: `[Mã trạm] da_khac_phuc [Mô tả kết quả]`.
3. **Chụp tem nhãn để chuẩn hóa số serial:**
   - Chụp cận cảnh tem máy phát điện / bình ắc quy / công tơ điện ➡️ Gửi Bot kèm mã trạm.
   - Hệ thống tự động đọc và đối soát vào hồ sơ trạm.
4. **Tra cứu nhanh:**
   - Trên Telegram: Gõ `/anh [Mã trạm]` hoặc `/tontai [Mã trạm]`.
   - Trên Web `tvt3.vercel.app`: Mở trạm ➡️ Tab "📸 Thư viện ảnh".

---

## ✅ Tiêu Chí Hoàn Thành (DoD)
- [ ] Luồng nạp ảnh, tồn tại Trước/Sau và đối soát serial chạy hoàn hảo.
- [ ] Tài liệu cẩm nang ngắn gọn, súc tích, ai đọc 30 giây cũng dùng được ngay.
