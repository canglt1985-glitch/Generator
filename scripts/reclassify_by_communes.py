import json

with open('scripts/strict_tvt3_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

all_items = data.get('other_items', [])

tvt3_communes = [
    # Long Khánh
    'long khánh', 'bình lộc', 'bảo vinh', 'xuân tân', 'phú bình', 'suối tre', 'xuân bình', 'xuân an', 'bảo quang', 'hàng gòn',
    # Cẩm Mỹ
    'cẩm mỹ', 'xuân quế', 'nhân nghĩa', 'sông ray', 'lâm san', 'bảo bình', 'xuân đông', 'xuân tây', 'long giao', 'sông nhạn',
    # Xuân Lộc
    'xuân lộc', 'xuân hòa', 'xuân hưng', 'xuân tâm', 'xuân trường', 'xuân phú', 'xuân thọ', 'xuân định', 'bảo hòa', 'suối cao',
    # Thống Nhất
    'thống nhất', 'dầu giây', 'gia kiệm', 'gia tân', 'hưng lộc', 'lộ 25', 'quang trung', 'xuân thạnh',
    # Định Quán
    'định quán', 'la ngà', 'phú ngọc', 'phú cường', 'phú túc', 'phú tân', 'ngọc định', 'thanh sơn', 'gia canh',
    # Tân Phú
    'tân phú', 'phú lộc', 'phú thanh', 'phú lâm', 'phú bình', 'phú an', 'phú sơn', 'núi tung', 'tà lai'
]

# Explicit exclusions
non_tvt3_keywords = [
    'trảng bom', 'vĩnh cửu', 'trị an', 'phú lý', 'mã đà', 'hiếu liêm', 'bàu hàm', 'bình minh', 'an viễn', 'sông trầu',
    'long thành', 'nhơn trạch', 'phước thái', 'an phước', 'phước an', 'đại phước', 'long phước',
    'biên hòa', 'trảng dài', 'hố nai', 'trấn biên', 'long bình', 'tam phước', 'phước tân', 'long hưng', 'tân vạn', 'tân phong', 'bình an',
    'bình phước', 'chơn thành', 'minh hưng', 'bù đăng', 'bù đốp', 'đồng xoài', 'tân khai', 'phú nghĩa', 'phước long', 'đak ơ', 'thuận lợi', 'tân tiến', 'lộc quảng', 'bình tân', 'nghĩa trung', 'đồng tâm', 'đồng phú'
]

tvt3_list = []
other_list = []

for item in all_items:
    dist_str = (item.get('district') or '').lower()
    ward_str = (item.get('ward') or '').lower()
    full_loc = f"{dist_str} {ward_str}"
    
    is_tvt3 = any(tc in full_loc for tc in tvt3_communes)
    if any(ex in full_loc for ex in non_tvt3_keywords):
        is_tvt3 = False

    item_res = {
        'ma_qh': item['ma_qh'],
        'vb': item['vb'],
        'status': item['status'],
        'lat': item['lat'],
        'lng': item['lng'],
        'district': item['district'],
        'ward': item['ward']
    }

    if is_tvt3:
        tvt3_list.append(item_res)
    else:
        other_list.append(item_res)

print(f"==========================================")
print(f"KẾT QUẢ ĐỐI CHIẾU XÃ/PHƯỜNG HÀNH CHÍNH CHÍNH XÁC:")
print(f"🟢 Số trạm THỰC SỰ THUỘC TVT3 (Long Khánh, Cẩm Mỹ, Xuân Lộc, Thống Nhất, Định Quán, Tân Phú): {len(tvt3_list)} trạm")
print(f"🔴 Số trạm KHÔNG THUỘC TVT3 (Vĩnh Cửu - Trị An/Phú Lý, Trảng Bom, Long Thành, Nhơn Trạch, Biên Hòa, Bình Phước...): {len(other_list)} trạm")
print(f"==========================================\n")

print("--- DANH SÁCH {len(tvt3_list)} TRẠM THỰC SỰ THUỘC TVT3 ĐỂ TRÌNH KÝ ---")
for idx, s in enumerate(tvt3_list, 1):
    print(f"{idx:02d}. Mã QH: {s['ma_qh']}\t| VB: {s['vb']}\t| Tọa độ: {s['lat']}, {s['lng']}\t| Đơn vị hành chính: {s['district']}")

