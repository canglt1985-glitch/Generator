import os, requests
from dotenv import load_dotenv

load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')

# DB 1
url1 = os.getenv('VITE_SUPABASE_URL')
key1 = os.getenv('VITE_SUPABASE_ANON_KEY')
headers1 = {'apikey': key1, 'Authorization': f'Bearer {key1}'}

# DB 2
url2 = os.getenv('VITE_SUPABASE_URL_V1')
key2 = os.getenv('VITE_SUPABASE_ANON_KEY_V1')
headers2 = {'apikey': key2, 'Authorization': f'Bearer {key2}'}

print("=== DB 1 (V2) ===")
r1 = requests.get(f'{url1}/rest/v1/infrastructure_projects?select=count', headers=headers1)
print("infrastructure_projects:", r1.status_code, r1.text[:200])

r1_ds = requests.get(f'{url1}/rest/v1/datasites?select=count', headers=headers1)
print("datasites:", r1_ds.status_code, r1_ds.text[:200])

print("\n=== DB 2 (V1) ===")
r2 = requests.get(f'{url2}/rest/v1/infrastructure_projects?select=count', headers=headers2)
print("infrastructure_projects:", r2.status_code, r2.text[:200])

r2_ds = requests.get(f'{url2}/rest/v1/datasites?select=count', headers=headers2)
print("datasites:", r2_ds.status_code, r2_ds.text[:200])

# Try querying other tables in DB1 and DB2
for table in ['sites', 'planning_sites', 'csht_projects', 'stations', 'nodes']:
    r_t1 = requests.get(f'{url1}/rest/v1/{table}?select=count', headers=headers1)
    if r_t1.status_code == 200:
        print(f"DB1 {table}: {r_t1.text}")
    r_t2 = requests.get(f'{url2}/rest/v1/{table}?select=count', headers=headers2)
    if r_t2.status_code == 200:
        print(f"DB2 {table}: {r_t2.text}")

