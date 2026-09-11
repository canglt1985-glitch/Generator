import os
import math
import json
import pandas as pd
import requests
from dotenv import load_dotenv

load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL', 'https://lnmoczxjweuifacqujcu.supabase.co')
SUPABASE_KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

excel_path = '/Users/cang_it/Desktop/Hạ tầng Mobi.xlsx'
df = pd.read_excel(excel_path, header=4)

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

def fetch_all(table_name):
    all_rows = []
    page = 0
    page_size = 1000
    has_more = True
    while has_more:
        offset = page * page_size
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?limit={page_size}&offset={offset}"
        try:
            r = requests.get(url, headers=headers)
            if r.status_code == 200:
                data = r.json()
                if data:
                    all_rows.extend(data)
                    if len(data) < page_size:
                        has_more = False
                    else:
                        page += 1
                else:
                    has_more = False
            else:
                print(f"Error fetching {table_name}: {r.status_code} {r.text}")
                has_more = False
        except Exception as e:
            print(f"Exception fetching {table_name}: {e}")
            has_more = False
    return all_rows

print("Fetching SRAN 5G tracker & datasites from Supabase...")
sran_data = fetch_all("sran_5g_tracker")
datasites = fetch_all("datasites")

print(f"Fetched {len(sran_data)} SRAN records and {len(datasites)} datasites.")

sran_coords = []
for s in sran_data:
    raw = s.get('raw_data') or {}
    try:
        lat = float(raw.get('Lat') or raw.get('lat') or 0)
        lng = float(raw.get('Long') or raw.get('long') or 0)
        if lat > 0 and lng > 0:
            sran_coords.append({
                'site_id': s.get('site_id'),
                'site_id_old': s.get('site_id_old'),
                'scope_5g': s.get('scope_5g'),
                'config_5g': s.get('config_5g'),
                'onair': s.get('onair_date'),
                'integration': s.get('integration_date'),
                'install': s.get('install_date'),
                'district': s.get('district'),
                'raw': raw,
                'lat': lat,
                'lng': lng
            })
    except:
        pass

datasite_coords = []
for d in datasites:
    loc = d.get('location_info') or {}
    try:
        lat = float(loc.get('vi_do') or 0)
        lng = float(loc.get('kinh_do') or 0)
        if lat > 0 and lng > 0:
            datasite_coords.append({
                'site_id': d.get('site_id'),
                'site_id_old': d.get('site_id_old'),
                'name': d.get('name'),
                'lat': lat,
                'lng': lng
            })
    except:
        pass

results = []

for idx, row in df.iterrows():
    mobi_code = str(row.get('Mã nhà trạm') or '').strip()
    mobi_tech = str(row.get('Công nghệ nhà trạm') or '').strip()
    mobi_5g = str(row.get('Đã triển khai lắp 5G') or '').strip()
    huyen = str(row.get('Quận/huyện') or '').strip()
    addr = str(row.get('Địa chỉ chi tiết nhà trạm') or '').strip()
    
    try:
        mobi_lat = float(row.get('Vĩ độ'))
        mobi_lng = float(row.get('Kinh độ'))
    except:
        continue

    # Find closest SRAN site
    min_sran_dist = float('inf')
    closest_sran = None
    for s in sran_coords:
        dist = haversine_m(mobi_lat, mobi_lng, s['lat'], s['lng'])
        if dist < min_sran_dist:
            min_sran_dist = dist
            closest_sran = s

    # Find closest Datasite
    min_ds_dist = float('inf')
    closest_ds = None
    for d in datasite_coords:
        dist = haversine_m(mobi_lat, mobi_lng, d['lat'], d['lng'])
        if dist < min_ds_dist:
            min_ds_dist = dist
            closest_ds = d

    # 5G Status analysis
    has_5g = False
    sran_code = ''
    sran_5g_scope = ''
    onair_status = ''

    if closest_sran and min_sran_dist <= 300:
        sran_code = closest_sran.get('site_id_old') or closest_sran.get('site_id')
        scope = str(closest_sran.get('scope_5g') or '').strip()
        raw_5g = str((closest_sran.get('raw') or {}).get('5G_Scope') or '').strip()
        onair = closest_sran.get('onair')
        integ = closest_sran.get('integration')
        inst = closest_sran.get('install')

        sran_5g_scope = scope if scope and scope != '-' else raw_5g
        
        if onair or integ or inst:
            has_5g = True
            onair_status = f"Phát sóng: {onair or integ or inst}"
        elif scope and scope.upper() != 'NONE' and scope != '-':
            has_5g = True
            onair_status = "Đã quy hoạch 5G (Đang triển khai)"
    elif closest_ds and min_ds_dist <= 300:
        sran_code = closest_ds.get('site_id_old') or closest_ds.get('site_id')

    results.append({
        'STT': idx + 1,
        'Mã Mobifone': mobi_code,
        'Địa bàn (Phường/Xã)': huyen,
        'Địa chỉ': addr,
        'Công nghệ Mobi': mobi_tech,
        'Mã Trạm TVT3': sran_code or 'Không khớp (<300m)',
        'Khoảng cách (m)': round(min_sran_dist) if closest_sran and min_sran_dist <= 300 else (round(min_ds_dist) if closest_ds and min_ds_dist <= 300 else None),
        'Trạng thái 5G': 'CÓ 5G / QUY HOẠCH 5G' if has_5g else 'Chưa có 5G',
        'Chi tiết SRAN 5G': sran_5g_scope or 'Không',
        'Tình trạng phát sóng': onair_status or 'Chưa triển khai 5G'
    })

res_df = pd.DataFrame(results)
print(f"\nTotal analyzed sites: {len(res_df)}")
sites_5g = res_df[res_df['Trạng thái 5G'] == 'CÓ 5G / QUY HOẠCH 5G']
print(f"Sites with 5G / Planned 5G: {len(sites_5g)}")

print("\n--- DETAILED LIST OF SITES WITH 5G / PLANNED 5G ---")
for idx, r in sites_5g.iterrows():
    print(f"#{r['STT']} | {r['Mã Mobifone']} ({r['Địa bàn (Phường/Xã)']}) ➔ Mã Trạm TVT3: {r['Mã Trạm TVT3']} (cách {r['Khoảng cách (m)']}m) | {r['Chi tiết SRAN 5G']} | {r['Tình trạng phát sóng']}")

output_excel = '/Users/cang_it/Desktop/Bao_Cao_Kiem_Tra_5G_Ha_Tang_Mobi.xlsx'
res_df.to_excel(output_excel, index=False)
print(f"\nSaved detailed Excel report to: {output_excel}")
