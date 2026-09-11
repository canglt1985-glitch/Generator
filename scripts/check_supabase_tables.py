import json, os, requests
from dotenv import load_dotenv

load_dotenv('/Users/cang_it/Antigravity/TVT3/tvt3_v2/.env')
url = os.getenv('VITE_SUPABASE_URL')
key = os.getenv('VITE_SUPABASE_ANON_KEY')
headers = {'apikey': key, 'Authorization': f'Bearer {key}'}

# Get OpenAPI schema
r = requests.get(f'{url}/rest/v1/?apikey={key}', headers=headers)
if r.status_code == 200:
    data = r.json()
    paths = list(data.get('paths', {}).keys())
    print("Available tables in Supabase:")
    for p in paths:
        print(p)
else:
    print(f"Error {r.status_code}: {r.text}")
