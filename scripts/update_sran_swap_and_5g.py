import os
import json
from datetime import datetime
from supabase import create_client

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://lnmoczxjweuifacqujcu.supabase.co')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI')

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Danh sách trạm Swap Đợt 1 (33 trạm)
m1 = 'DNTN28,DNTN03,DNTN04,DNTN38,DNTN44,DNTNL2,DNTN08,DNTN31,DNTN32,DNTN18,DNTN39,DNTN01,DNTN10,DNTN11,DNTN45,DNTN02,DNTN13,DNTN25,DNTN42,DNTN27,DNTN48,DNTN16,DNTN40,DNTN49,DNTN05,DNTN26,DNTN24,DNTN33,DNTN34,DNTN41,DNTN06,DNTN17,DNDQ04'.split(',')

# Danh sách trạm Phát sóng 5G (19 trạm)
m2 = 'DNTN03,DNTN04,DNTN38,DNTN44,DNTN08,DNTN31,DNTN18,DNTN39,DNTN01,DNTN10,DNTN45,DNTN02,DNTN25,DNTN49,DNTN05,DNTN06,DNDQ65,DNDQ04,DNDQ06'.split(',')

# Danh sách trạm Swap Đợt 2 (14 trạm)
m3 = 'DNLK19,DNTNL1,DNTN21,DNTN14,DNTN43,DNDQ21,DNDQ28,DNDQ65,DNDQL1,DNDQ06,DNDQ10,DNDQ12,DNDQ47,DNDQ53'.split(',')

# Tổng hợp 47 trạm Swap (M1 + M3)
swapped_sites = list(dict.fromkeys(m1 + m3))
onair_5g_sites = list(dict.fromkeys(m2))

today = '2026-09-26'
prev_day = '2026-09-25'
prev_day2 = '2026-09-24'

print(f"=== BẮT ĐẦU CẬP NHẬT SRAN 5G TRACKER ===")
print(f"• Số trạm ĐÃ SWAP: {len(swapped_sites)}")
print(f"• Số trạm PHÁT 5G (ON-AIR): {len(onair_5g_sites)}")

# Lấy dữ liệu hiện tại từ Supabase
res = sb.table('sran_5g_tracker').select('*').in_('site_id_old', swapped_sites).execute()
existing_rows = {r['site_id_old']: r for r in res.data}

updated_count = 0
for site_old in swapped_sites:
    row = existing_rows.get(site_old)
    if not row:
        print(f"⚠️ Không tìm thấy trạm {site_old} trong DB!")
        continue

    raw = row.get('raw_data') or {}
    
    # 1. Cập nhật Swap 3G/4G
    raw['Swap 3G4G'] = today
    raw['Swap_3G4G'] = today
    raw['Swap 3G/4G'] = today
    raw['4G'] = today
    if not raw.get('Integration 3G4G'):
        raw['Integration 3G4G'] = today
    if not raw.get('Installation Actual'):
        raw['Installation Actual'] = prev_day
    if not raw.get('Delivery Actual'):
        raw['Delivery Actual'] = prev_day2

    update_payload = {
        'raw_data': raw,
        'updated_at': datetime.utcnow().isoformat() + '+00:00'
    }

    if not row.get('integration_date'):
        update_payload['integration_date'] = today
    if not row.get('install_date'):
        update_payload['install_date'] = prev_day
    if not row.get('delivery_date'):
        update_payload['delivery_date'] = prev_day2

    # 2. Cập nhật Phát sóng 5G nếu nằm trong danh sách onair_5g_sites
    if site_old in onair_5g_sites:
        raw['On-air'] = today
        raw['OnAir 5G MBF'] = today
        raw['BC on-air'] = today
        raw['BC On-air'] = today
        raw['5G'] = today
        if not raw.get('Integration 5G'):
            raw['Integration 5G'] = today
        update_payload['onair_date'] = today
        print(f"  ⚡ Trạm {site_old} ({row['site_id']}): CẬP NHẬT SWAP + PHÁT 5G")
    else:
        print(f"  🔄 Trạm {site_old} ({row['site_id']}): CẬP NHẬT SWAP 3G/4G")

    # Update row in Supabase
    up_res = sb.table('sran_5g_tracker').update(update_payload).eq('id', row['id']).execute()
    if up_res.data:
        updated_count += 1

print(f"\n✅ Đã cập nhật thành công {updated_count}/{len(swapped_sites)} trạm trên Supabase sran_5g_tracker!")

# Cập nhật backend/data/sran_5g_tracker.json nếu file tồn tại
json_path = 'backend/data/sran_5g_tracker.json'
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        local_data = json.load(f)
    
    local_updated = 0
    for item in local_data:
        s_old = item.get('site_id_old')
        if s_old in swapped_sites:
            if not item.get('integration_date'):
                item['integration_date'] = today
            if not item.get('install_date'):
                item['install_date'] = prev_day
            if s_old in onair_5g_sites:
                item['onair_date'] = today
            local_updated += 1
            
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(local_data, f, ensure_ascii=False, indent=2)
    print(f"✅ Đã đồng bộ file cache {json_path} ({local_updated} trạm)!")
