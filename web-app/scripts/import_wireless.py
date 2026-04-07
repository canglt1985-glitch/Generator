import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Use absolute path for .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Get the DB URL
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)
Session = sessionmaker(bind=engine)

def clean_excel_data(csv_path):
    print(f"Reading CSV: {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    
    # Filter for Team 3 (Tổ 3) only as requested
    df = df[df['Team'] == 'Tổ 3']
    print(f"Filtered for Tổ 3: {len(df)} rows")
    
    # Process sites
    processed_sites = {}
    for _, row in df.iterrows():
        site_new = str(row.get('Sitename mới', '')).strip()
        if not site_new or site_new == 'nan':
            continue
            
        if site_new not in processed_sites:
            lat = row.get('Lat', None)
            lon = row.get('Long', None)
            height = row.get('Height', None)
            
            try:
                lat = float(lat) if pd.notna(lat) and str(lat).strip() else None
                lon = float(lon) if pd.notna(lon) and str(lon).strip() else None
                height = float(height) if pd.notna(height) and str(height).strip() else None
            except:
                pass
                
            processed_sites[site_new] = {
                'site_id_new': site_new,
                'site_id_old': str(row.get('Sitename cũ', '')).strip(),
                'ten_tram_moi': f"Trạm {site_new}",
                'huyen': str(row.get('Quận/Huyện', '')).strip(),
                'xa': str(row.get('Phường/Xã', '')).strip(),
                'lat': lat,
                'long': lon,
                'antenna_height': height,
                'team': 'Tổ 3', # Fixed to Tổ 3
                'zone': str(row.get('Zone', '')).strip(),
            }
            # Clean up 'nan' strings
            for k, v in processed_sites[site_new].items():
                if isinstance(v, str) and v == 'nan':
                    processed_sites[site_new][k] = ''
            # fill sync_date
            import datetime
            processed_sites[site_new]['sync_date'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # Process cells
    processed_cells = []
    import datetime
    for _, row in df.iterrows():
        cell_new = str(row.get('Cellname mới', '')).strip()
        site_new = str(row.get('Sitename mới', '')).strip()
        
        if not cell_new or cell_new == 'nan' or not site_new or site_new == 'nan':
            continue
            
        azimuth = row.get('Azimuth', None)
        tilt = row.get('Tilt', None)
        
        try:
            azimuth = float(azimuth) if pd.notna(azimuth) and str(azimuth).strip() else None
            tilt = float(tilt) if pd.notna(tilt) and str(tilt).strip() else None
        except:
            pass

        cell_data = {
            'site_id_new': site_new,
            'cell_id_new': cell_new,
            'cell_id_old': str(row.get('Cellname cũ', '')).strip(),
            'ran_type': str(row.get('RAN', '')).strip(),
            'pci_psc': str(row.get('PSC/PCI', '')).strip(),
            'node_id': str(row.get('Node-ID', '')).strip(),
            'cell_id_num': str(row.get('Cell-ID', '')).strip(),
            'azimuth': azimuth,
            'tilt': tilt,
            'vendor': str(row.get('Vendor', '')).strip(),
            'sync_date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Clean up 'nan' strings
        for k, v in cell_data.items():
            if isinstance(v, str) and v == 'nan':
                cell_data[k] = ''
                
        processed_cells.append(cell_data)

    return processed_sites, processed_cells

def import_to_db(sites, cells):
    from sqlalchemy.sql import text
    session = Session()
    try:
        print(f"Importing {len(sites)} sites...")
        site_count = 0
        from models import DsSiteRegistry, DsCellRegistry
        # actually, just use direct sql for speed and no model dependency issues
        for site_id, data in sites.items():
            # Check if exists
            res = session.execute(text("SELECT id FROM ds_site_registry WHERE site_id_new = :s"), {'s': site_id}).fetchone()
            if not res:
                # Insert
                keys = list(data.keys())
                values = [f":{k}" for k in keys]
                stmt = f"INSERT INTO ds_site_registry ({', '.join(keys)}) VALUES ({', '.join(values)})"
                session.execute(text(stmt), data)
                site_count += 1
            else:
                # Update
                keys = [k for k in data.keys() if k != 'site_id_new']
                updates = ", ".join([f"{k} = :{k}" for k in keys])
                stmt = f"UPDATE ds_site_registry SET {updates} WHERE site_id_new = :site_id_new"
                session.execute(text(stmt), data)
                
        session.commit()
        print(f"Added/Updated {len(sites)} sites. ({site_count} new)")

        print(f"Importing {len(cells)} cells...")
        cell_count = 0
        for data in cells:
            res = session.execute(text("SELECT id FROM ds_cell_registry WHERE cell_id_new = :c"), {'c': data['cell_id_new']}).fetchone()
            if not res:
                # Insert
                keys = list(data.keys())
                values = [f":{k}" for k in keys]
                stmt = f"INSERT INTO ds_cell_registry ({', '.join(keys)}) VALUES ({', '.join(values)})"
                session.execute(text(stmt), data)
                cell_count += 1
            else:
                # Update
                keys = [k for k in data.keys() if k != 'cell_id_new']
                updates = ", ".join([f"{k} = :{k}" for k in keys])
                stmt = f"UPDATE ds_cell_registry SET {updates} WHERE cell_id_new = :cell_id_new"
                session.execute(text(stmt), data)
        session.commit()
        print(f"Added/Updated {len(cells)} cells. ({cell_count} new)")

    except Exception as e:
        session.rollback()
        print(f"Error: {e}")
    finally:
        session.close()

if __name__ == '__main__':
    csv_file = r'd:\Chuyen doi so\VT3-VHKT\temp_cell_data.csv'
    sites, cells = clean_excel_data(csv_file)
    import_to_db(sites, cells)
    print("IMPORT COMPLETE!")
