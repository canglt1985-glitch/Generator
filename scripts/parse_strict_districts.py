import json

with open('scripts/strict_tvt3_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

all_items = data.get('other_items', [])

tvt3_allowed = ['long khánh', 'cẩm mỹ', 'xuân lộc', 'thống nhất', 'định quán', 'tân phú']
non_tvt3_keywords = ['trảng bom', 'vĩnh cửu', 'trị an', 'long thành', 'nhơn trạch', 'biên hòa', 'bình phước', 'chơn thành', 'hớn quản', 'lộc ninh', 'bù đăng', 'bù đốp', 'đồng xoài', 'minh hưng', 'bến cát', 'tân uyên']

tvt3_items = []
other_items = []

for item in all_items:
    dist_str = (item.get('district') or '').lower()
    
    is_tvt3 = any(td in dist_str for td in tvt3_allowed)
    if any(ex in dist_str for ex in non_tvt3_keywords):
        is_tvt3 = False

    if is_tvt3:
        tvt3_items.append(item)
    else:
        other_items.append(item)

print(f"==========================================")
print(f"KẾT QUẢ ĐỐI CHIẾU ĐỊA BÀN HÀNH CHÍNH XÃ / HUYỆN:")
print(f"🟢 Thuộc TVT3 QUẢN LÝ (Long Khánh, Cẩm Mỹ, Xuân Lộc, Thống Nhất, Định Quán, Tân Phú): {len(tvt3_items)} trạm")
print(f"🔴 KHÔNG thuộc TVT3 (Trảng Bom, Vĩnh Cửu/Trị An, Long Thành, Nhơn Trạch, Biên Hòa, Bình Phước...): {len(other_items)} trạm")
print(f"==========================================\n")

print("--- DANH SÁCH CHI TIẾT TRẠM THUỘC TVT3 ---")
for idx, s in enumerate(tvt3_items, 1):
    print(f"{idx:02d}. Mã QH: {s['ma_qh']}\t| VB: {s['vb']}\t| Tọa độ: {s['lat']}, {s['lng']}\t| Huyện/Quận: {s['district']}")

print("\n--- PHÂN LOẠI CÁC TRẠM THEO HUYỆN/QUẬN ---")
by_district = {}
for item in all_items:
    d = item.get('district') or 'Chưa xác định'
    by_district[d] = by_district.get(d, 0) + 1

for d, count in sorted(by_district.items(), key=lambda x: x[1], reverse=True):
    is_3 = "🟢 TVT3" if any(td in d.lower() for td in tvt3_allowed) and not any(ex in d.lower() for ex in non_tvt3_keywords) else "🔴 Khác"
    print(f"- {d}: {count} trạm ({is_3})")

