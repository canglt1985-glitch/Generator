import json, os, requests
from dotenv import load_dotenv

load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

raw_codes = """26DNa205, 26DNa214, 26DNa139, 26DNa022, 26DNa006, 26DNa023, 26DNa150, 26DNa151, 26DNa024, 26DNa025, 26DNa087, 26DNa196, 26DNa213, 26DNa093, 26DNa094, 26DNa098, 26DNa102, 26DNa155, 26DNa156, 26DNa176, 26DNa243, 26DNa235, 26DNa221, 26DNa240, 26DNa231, 26DNa211, 26DNa106, 26DNa198, 26DNa241, 26DNa108, 26DNa200, 26DNa206, 26DNa116, 26DNa117, 26DNa119, 26DNa120, 26DNa208, 26DNa220, 26DNa121, 26DNa122, 26DNa126, 26DNa233, 26DNa128, 26DNa129, 26DNa130, 26DNa236, 26DNa234, 26DNa261, 26DNa268, 26DNa252, 26DNa159, 26DNa107, 26DNa104, 26DNa118, 26DNa115, 26DNa109, 26DNa111, 26DNa112, 26DNa113, 26DNa114, 26DNa191, 26DNa193, 26DNa194, 26DNa202, 26DNa222, 26DNa225, 26DNa188, 26DNa029, 26DNa028, 26DNa181, 26DNa002, 26DNa004, 26DNa012, 26DNa013, 26DNa014, 26DNa017, 26DNa019, 26DNa021, 26DNa026, 26DNa027, 26DNa085, 26DNa088, 26DNa089, 26DNa090, 26DNa091, 26DNa092, 26DNa095, 26DNa096, 26DNa097, 26DNa099, 26DNa100, 26DNa101, 26DNa103, 26DNa105, 26DNa124, 26DNa125, 26DNa127, 26DNa131, 26DNa132, 26DNa134, 26DNa152, 26DNa153, 26DNa157, 26DNa158, 26DNa179, 26DNa217, 26DNa255, 26DNa266, 26DNa008, 26DNa032, 26DNa052, 26DNa001, 26DNa003, 26DNa038, 26DNa066, 26DNa067, 26DNa182, 26DNa190, 26DNa199, 26DNa207, 26DNa209, 26DNa212, 26DNa216, 26DNa232, 26DNa237, 26DNa248, 26DNa053, 26DNa165, 26DNa185, 26DNa197, 26DNa204, 26DNa218, 26DNa219, 26DNa230"""

codes = [c.strip() for c in raw_codes.split(',')]

# 1. Fetch infrastructure_projects
r_ip = requests.get(f'{url}/rest/v1/infrastructure_projects?select=planning_id_new,planning_id_old,district,ward,latitude_plan,longitude_plan,latitude_survey,longitude_survey,notes,site_name_plan&limit=2000', headers=headers)
infra_projects = r_ip.json() if r_ip.status_code == 200 else []

print(f"Total infra_projects in DB: {len(infra_projects)}")

ip_map = {}
for p in infra_projects:
    if isinstance(p, dict):
        p_new = (p.get('planning_id_new') or '').strip().upper()
        p_old = (p.get('planning_id_old') or '').strip().upper()
        if p_new:
            ip_map[p_new] = p
        if p_old:
            ip_map[p_old] = p

found_in_db = 0
not_in_db = 0

for c in codes:
    cu = c.upper()
    if cu in ip_map:
        p = ip_map[cu]
        found_in_db += 1
        print(f"MATCH DB: {c} -> Huyện: {p.get('district')} | Xã: {p.get('ward')} | Tên: {p.get('site_name_plan')} | Notes: {p.get('notes')}")
    else:
        not_in_db += 1

print(f"\nFound in DB: {found_in_db} / {len(codes)} | Not in DB: {not_in_db}")

