import urllib.request
import ssl
import json
import math
import pandas as pd

SUPABASE_URL = "https://lnmoczxjweuifacqujcu.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW9jenhqd2V1aWZhY3F1amN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MzcxOTYsImV4cCI6MjA5NDIxMzE5Nn0.C0Si7ChY4T_mxLylSkDNJOUcj9D0uuGW_L4t7p9yONI"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

def main():
    # 1. Load active datasites with verified ward info
    url_sites = f'{SUPABASE_URL}/rest/v1/datasites?select=site_id,name,location_info&limit=1000'
    req = urllib.request.Request(url_sites, headers=headers)
    with urllib.request.urlopen(req, context=ctx) as resp:
        active_sites = json.loads(resp.read().decode())

    active_list = []
    for s in active_sites:
        loc = s.get('location_info') or {}
        lat = loc.get('vi_do')
        lon = loc.get('kinh_do')
        xa_moi = loc.get('xa_moi') or loc.get('xa_cu')
        huyen = loc.get('huyen_cu') or loc.get('district') or loc.get('thanh_pho')
        if lat and lon and xa_moi:
            try:
                active_list.append({
                    'site_id': s.get('site_id'),
                    'lat': float(lat),
                    'lon': float(lon),
                    'xa_moi': str(xa_moi).strip(),
                    'huyen': str(huyen).strip() if huyen else ''
                })
            except:
                pass

    def find_nearest_ward(lat, lon):
        if lat is None or lon is None:
            return None, None, None
        try:
            lat = float(lat)
            lon = float(lon)
        except:
            return None, None, None

        min_dist = float('inf')
        best = None
        for a in active_list:
            d = math.sqrt((lat - a['lat'])**2 + (lon - a['lon'])**2)
            if d < min_dist:
                min_dist = d
                best = a
        dist_km = min_dist * 111.0
        if best:
            return best['xa_moi'], best['huyen'], round(dist_km, 2)
        return None, None, None

    # 2. Load infrastructure projects
    tvt3_districts = ['Cẩm Mỹ', 'Thống Nhất', 'Xuân Lộc', 'Long Khánh', 'Định Quán', 'Tân Phú', 'TVT3']
    url_p = f'{SUPABASE_URL}/rest/v1/infrastructure_projects?select=*&limit=1000'
    req_p = urllib.request.Request(url_p, headers=headers)
    with urllib.request.urlopen(req_p, context=ctx) as resp:
        all_projs = json.loads(resp.read().decode())

    tvt3_projs = [r for r in all_projs if r.get('district') in tvt3_districts or (r.get('planning_id_new') and r.get('planning_id_new').startswith(('TVT3_', 'VTV3_', 'VKD3_')))]

    print(f"Total TVT3 projects to process: {len(tvt3_projs)}")

    update_records = []
    summary_list = []

    for p in tvt3_projs:
        pid = p.get('planning_id_new')
        huyen = p.get('district') or ''

        lat_p = p.get('latitude_plan')
        lon_p = p.get('longitude_plan')
        lat_s = p.get('latitude_survey')
        lon_s = p.get('longitude_survey')

        ward_p, huyen_p, dist_p = find_nearest_ward(lat_p, lon_p)
        ward_s, huyen_s, dist_s = find_nearest_ward(lat_s, lon_s)

        # Primary ward to save in DB
        primary_ward = ward_s or ward_p or 'Chưa xác định'

        summary_list.append({
            'planning_id_new': pid,
            'district': huyen or huyen_p or 'TVT3',
            'latitude_plan': lat_p,
            'longitude_plan': lon_p,
            'ward_plan': ward_p or 'Chưa rõ',
            'latitude_survey': lat_s,
            'longitude_survey': lon_s,
            'ward_survey': ward_s or 'Chấp thuận dùng chung / Chưa có tọa độ KS',
            'skhcn_status': p.get('skhcn_status') or 'Chờ xử lý',
            'deployment_package': p.get('deployment_package') or 'Chưa phân gói'
        })

        # Record to update DB
        update_records.append({
            'planning_id_new': pid,
            'ward': primary_ward,
            'address': f"{primary_ward}, {huyen or huyen_p or ''}".strip(', ')
        })

    # Save summary dataframe to JSON & CSV for reporting
    df_sum = pd.DataFrame(summary_list)
    df_sum.to_json('/Users/cang_it/Antigravity/TVT3/scratch/tvt3_wards_summary.json', orient='records', force_ascii=False, indent=2)
    print(f"Saved summary of {len(summary_list)} sites to scratch/tvt3_wards_summary.json")

    # Bulk update DB `ward` field via upsert
    headers_upsert = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }

    url_upsert = f'{SUPABASE_URL}/rest/v1/infrastructure_projects?on_conflict=planning_id_new'
    chunk_size = 50
    for i in range(0, len(update_records), chunk_size):
        chunk = update_records[i:i + chunk_size]
        body = json.dumps(chunk, ensure_ascii=False).encode('utf-8')
        req_u = urllib.request.Request(url_upsert, data=body, headers=headers_upsert, method='POST')
        try:
            with urllib.request.urlopen(req_u, context=ctx) as resp:
                print(f"Updated ward chunk {i//chunk_size + 1}")
        except Exception as e:
            print(f"Error updating ward chunk {i}: {e}")

if __name__ == '__main__':
    main()
