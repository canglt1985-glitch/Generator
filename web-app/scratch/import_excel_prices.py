import sys
sys.stdout.reconfigure(encoding='utf-8')
import pandas as pd
import re
import json

file_path = r'D:\Chuyen doi so\dongiaxangdau.xlsx'
history_file = r'd:\Chuyen doi so\VT3-VHKT\web-app\data\fuel_prices_history.json'

try:
    df = pd.read_excel(file_path)
    
    # We will collect a list of dicts:
    # {'effective_date': '2026-02-26', 'xang_ron95': 20150, 'dau_do': 19270, 'source': 'excel_import'}
    
    records = []
    current_date_str = None
    current_record = {}
    
    # Iterate over rows
    for index, row in df.iterrows():
        # Check if any cell has the date header
        for col in df.columns:
            val = str(row[col])
            if 'Giá điều chỉnh lúc' in val:
                # Extract date "dd/mm/yyyy"
                match = re.search(r'ngày (\d{2}/\d{2}/\d{4})', val)
                if match:
                    # Save previous record if it exists
                    if current_date_str and current_record:
                        current_record['effective_date'] = current_date_str
                        current_record['source'] = 'excel_import'
                        records.append(current_record)
                        
                    date_parts = match.group(1).split('/')
                    current_date_str = f"{date_parts[2]}-{date_parts[1]}-{date_parts[0]}"
                    current_record = {}
                break
                
        # If it's a data row
        mat_hang = str(row.iloc[1])
        if current_date_str:
            if 'Xăng RON 95-III' in mat_hang:
                price_str = str(row.iloc[3]).replace('đ', '').replace('.', '').replace(',', '').strip()
                try:
                    current_record['xang_ron95'] = int(price_str)
                except:
                    pass
            elif 'Dầu DO 0,05S-II' in mat_hang:
                price_str = str(row.iloc[3]).replace('đ', '').replace('.', '').replace(',', '').strip()
                try:
                    current_record['dau_do'] = int(price_str)
                except:
                    pass

    # Append the last record
    if current_date_str and current_record:
        current_record['effective_date'] = current_date_str
        current_record['source'] = 'excel_import'
        records.append(current_record)
        
    print(f"Extracted {len(records)} records from Excel:")
    for r in records:
        print(r)
        
    # Now merge with fuel_prices_history.json
    try:
        with open(history_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except:
        existing = []
        
    # Dictionary keyed by date to overwrite/merge
    history_map = {item['effective_date']: item for item in existing}
    for r in records:
        history_map[r['effective_date']] = r
        
    final_history = sorted(history_map.values(), key=lambda x: x['effective_date'])
    
    with open(history_file, 'w', encoding='utf-8') as f:
        json.dump(final_history, f, indent=4, ensure_ascii=False)
        
    print("Updated fuel_prices_history.json successfully!")
    
except Exception as e:
    import traceback
    traceback.print_exc()
