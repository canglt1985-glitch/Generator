import json, os, math, requests
from dotenv import load_dotenv

load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Fetch all active datasites from Supabase
r_ds = requests.get(f'{url}/rest/v1/datasites?select=site_id,site_id_old,name,location_info,management_info&limit=2000', headers=headers)
datasites = r_ds.json() if r_ds.status_code == 200 else []

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2)**2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

clean_ds = []
for d in datasites:
    if isinstance(d, dict):
        loc = d.get('location_info') or {}
        mgt = d.get('management_info') or {}
        try:
            lat = float(loc.get('vi_do') or 0)
            lng = float(loc.get('kinh_do') or 0)
            if lat > 0 and lng > 0:
                clean_ds.append({
                    'code': d.get('site_id_old') or d.get('site_id'),
                    'name': d.get('name') or '',
                    'to_ql': str(mgt.get('to_ql') or ''),
                    'huyen': str(loc.get('huyen_cu') or loc.get('huyen_moi') or ''),
                    'xa': str(loc.get('xa_moi') or loc.get('xa_cu') or ''),
                    'lat': lat,
                    'lng': lng
                })
        except:
            pass

print(f"Loaded {len(clean_ds)} active stations from DB.")

# Inspect unique huyen & to_ql in active stations
district_teams = {}
for d in clean_ds:
    h = d['huyen'].strip()
    t = d['to_ql'].strip()
    if h not in district_teams:
        district_teams[h] = set()
    district_teams[h].add(t)

print("\n--- Map Huyện -> Tổ Quản Lý trong DB ---")
for h, ts in district_teams.items():
    print(f"Huyện: '{h}' -> Tổ QL: {ts}")

