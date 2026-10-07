# Phase 02: In-Memory Snapshot Cache & 4-Field Site Resolver

Status: ✅ Complete  
Target Directory: `backend/bots/resolvers/`

---

## 🎯 Mục tiêu
1. Xây dựng bộ đệm In-Memory Snapshot Cache nạp toàn bộ 412 trạm từ bảng `datasites` của Supabase vào RAM khi khởi động.
2. Tích hợp thuật toán Haversine tính cự ly GPS để phục vụ tính năng tìm trạm lân cận.
3. Xây dựng bộ giải mã `SiteContractResolver` để bóc tách và định dạng 4 Trường Dữ Liệu theo mẫu thiết kế đã duyệt (`FIELD_SITE_ID`, `FIELD_INFRA`, `FIELD_CONTRACT`, `FIELD_ACCESS`).

---

## 📝 Chi tiết công việc

- [x] **2.1. Xây dựng `backend/bots/resolvers/site_cache.py`:**
  - Class `SiteCacheManager`:
    - `sync_all_sites()`: Fetch dữ liệu từ Supabase `datasites` (bao gồm `contract_number`, `contract_info`).
    - Lập các chỉ mục tìm kiếm siêu tốc:
      * `index_by_id`: `{ "26DNA_LK00": site }`
      * `index_by_old_id`: `{ "DNLK00": site }`
      * `index_unaccent`: `{ "long khanh": [site, ...] }`
      * `coordinates_list`: Danh sách `(site_id, lat, lon)` phục vụ tính khoảng cách.
    - Phương thức `find_by_code(code)`: Tìm kiếm theo mã mới hoặc mã cũ.
    - Phương thức `find_by_keyword(keyword)`: Tìm kiếm mờ theo tên trạm hoặc chủ đất.
    - Phương thức `find_nearest(lat, lon, max_distance_km=1.0)`: Tìm trạm gần nhất theo công thức Haversine.
    - Cơ chế tự động làm mới (Background auto-refresh mỗi 60 phút) + Lưu snapshot cục bộ `sites_cache_snapshot.json` để phòng khi mất mạng Internet.

- [x] **2.2. Xây dựng bộ định dạng `backend/bots/resolvers/site_formatter.py`:**
  - Viết các hàm format tin nhắn Telegram Markdown/HTML:
    - `format_summary_card(site)`: Thẻ tóm tắt trạm (Mã, Tên, Địa chỉ, QLT, Cột/Nhà, Tình trạng HĐ).
    - `format_infra_card(site)`: Thẻ hạ tầng & nguồn (Mã PE EVN click-to-copy, MPD & định mức L/h, Ắc quy Lithium/Axit, Hướng truyền dẫn trạm nguồn).
    - `format_contract_card(site)`: Thẻ hợp đồng & tài chính (Số HĐ, Thời hạn còn lại, Tiền thuê, Tiền điện khoán, Đã thanh toán đến ngày nào, STK ngân hàng click-to-copy).
    - `format_access_card(site)`: Thẻ vào trạm & chủ đất (SĐT chủ nhà, Mật khẩu ổ khóa số click-to-copy, Người giữ chìa, Ghi chú đường vào).
    - `format_proximity_card(site, distance_meters)`: Thẻ định vị hiện trường khi KTV gửi GPS.
  - Xử lý triệt để các trường dữ liệu `None`/rỗng, tránh tuyệt đối lỗi crash chuỗi.

---

## ✅ Tiêu chí hoàn thành (Acceptance Criteria)
* Load thành công 412 trạm vào bộ nhớ trong < 1.0 giây, bộ nhớ tiêu thụ < 5MB RAM.
* Tìm kiếm theo mã `DNLK00` hay `26DNa_LK00` đều trả về đúng trạm trong < 0.01 giây.
* Tính toán chuẩn xác khoảng cách GPS từ tọa độ kiểm thử.
* Cả 4 hàm format đều xuất ra văn bản Telegram Markdown chuẩn đẹp, không lỗi cú pháp.
