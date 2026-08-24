import os
import sys
import json
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

# Load environment
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
load_dotenv(os.path.join(project_dir, 'backend', '.env'))
load_dotenv(os.path.join(project_dir, 'tvt3_v2', '.env'))

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("❌ Error: Supabase credentials missing in env.")
    sys.exit(1)

supabase = create_client(supabase_url, supabase_key)

excel_path = "/Users/cang_it/Library/CloudStorage/GoogleDrive-canglt1985@gmail.com/My Drive/datasite/Cap nhat cellname Dong Nai_V6.xlsx"
if not os.path.exists(excel_path):
    print(f"❌ Error: Excel file not found at {excel_path}")
    sys.exit(1)

print(f"📖 Reading Excel file: {excel_path} (this might take a few seconds)...")
try:
    df = pd.read_excel(excel_path, sheet_name="ChiTiet")
    print(f"✅ Read {len(df)} rows from sheet ChiTiet.")
except Exception as e:
    print(f"❌ Error reading sheet: {e}")
    sys.exit(1)

# Clean and prepare rows
print("🧹 Cleaning and preparing data...")
records_to_insert = []
cell_counts_ref = {} # For site_cell_count.json

# Helper to clean float/int
def clean_int(val):
    if pd.isna(val) or val == "" or str(val).strip().lower() in ["nan", "null"]:
        return None
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return None

def clean_float(val):
    if pd.isna(val) or val == "" or str(val).strip().lower() in ["nan", "null"]:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def clean_str(val):
    if pd.isna(val) or val == "" or str(val).strip().lower() in ["nan", "null"]:
        return None
    return str(val).strip()

# Fetch existing datasites to ensure we only reference valid sites (Postgres FK constraint)
print("🔍 Fetching valid site IDs from database...")
try:
    res_sites = supabase.table("datasites").select("site_id").execute()
    valid_sites = {s['site_id'].upper() for s in res_sites.data or []}
    print(f"✅ Found {len(valid_sites)} valid sites in database.")
except Exception as e:
    print(f"❌ Error fetching sites: {e}")
    sys.exit(1)

for idx, row in df.iterrows():
    cell_id = clean_str(row.get('Cellname mới'))
    site_id = clean_str(row.get('Sitename mới'))
    
    if not cell_id or not site_id:
        continue
    
    site_id_upper = site_id.upper()
    if site_id_upper not in valid_sites:
        # Skip cells that reference a site not in datasites table to avoid foreign key violations
        continue

    cell_name_old = clean_str(row.get('Cellname cũ'))
    cell_name_new = cell_id
    ran = clean_str(row.get('RAN'))
    vendor = clean_str(row.get('Vendor'))
    pci_psc = clean_int(row.get('PSC/PCI'))
    node_id = clean_int(row.get('Node-ID'))
    cell_idx = clean_int(row.get('Cell-ID'))
    longitude = clean_float(row.get('Long'))
    latitude = clean_float(row.get('Lat'))
    
    # Metadata columns
    metadata = {
        "team": clean_str(row.get('Team')),
        "zone": clean_str(row.get('Zone')),
        "vung_phu": clean_str(row.get('Vùng Phủ')),
        "phan_loai_tram": clean_str(row.get('Phân Loại Trạm')),
        "traffic": clean_float(row.get('Traffic'))
    }
    
    # Store record
    records_to_insert.append({
        "cell_id": cell_id,
        "site_id": site_id_upper,
        "cell_name_old": cell_name_old,
        "cell_name_new": cell_name_new,
        "ran": ran,
        "vendor": vendor,
        "pci_psc": pci_psc,
        "node_id": node_id,
        "cell_idx": cell_idx,
        "longitude": longitude,
        "latitude": latitude,
        "metadata": metadata
    })
    
    # Add to reference for JSON
    if ran:
        ran_upper = ran.upper()
        if '3G' in ran_upper or 'UTRAN' in ran_upper:
            net_key = '3G'
        elif '4G' in ran_upper or 'LTE' in ran_upper or 'EUTRAN' in ran_upper:
            net_key = '4G'
        elif '5G' in ran_upper or 'NR' in ran_upper:
            net_key = '5G'
        else:
            net_key = None
            
        if net_key:
            if site_id_upper not in cell_counts_ref:
                cell_counts_ref[site_id_upper] = {}
            cell_counts_ref[site_id_upper][net_key] = cell_counts_ref[site_id_upper].get(net_key, 0) + 1

print(f"✅ Prepared {len(records_to_insert)} records for upserting.")

# Batch upsert to Supabase
batch_size = 500
total_records = len(records_to_insert)
print(f"🚀 Upserting into 'datacells' table in batches of {batch_size}...")

for i in range(0, total_records, batch_size):
    batch = records_to_insert[i:i+batch_size]
    try:
        supabase.table("datacells").upsert(batch).execute()
        print(f"  Processed {min(i+batch_size, total_records)} / {total_records} records...")
    except Exception as e:
        print(f"❌ Error upserting batch {i//batch_size + 1}: {e}")
        # Print first row of failed batch for debugging
        if batch:
            print(f"  Sample row: {batch[0]}")
        sys.exit(1)

print("🎉 Upsert to Supabase completed successfully!")

# Write site_cell_count.json to backend/data/ and web-app/data/
json_paths = [
    os.path.join(project_dir, 'backend', 'data', 'site_cell_count.json'),
    os.path.join(project_dir, 'web-app', 'data', 'site_cell_count.json')
]

for p in json_paths:
    try:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(cell_counts_ref, f, ensure_ascii=False, indent=2)
        print(f"💾 Saved cell counts reference to: {p}")
    except Exception as e:
        print(f"⚠️ Warning: Failed to save to {p}: {e}")

print("✅ All tasks done!")
