import os
import json
from datetime import datetime

# Path to the data file
PAYMENT_GROUPS_FILE = r'd:\Chuyen doi so\VT3-VHKT\web-app\data\payment_groups.json'

def test_json_structure():
    print("--- Testing JSON Structure ---")
    if not os.path.exists(PAYMENT_GROUPS_FILE):
        print("❌ File not found!")
        return

    with open(PAYMENT_GROUPS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for group in ['mua_ngoai', 'cx222']:
        if group in data:
            print(f"[OK] Group '{group}' found.")
            # Check for new field (it might not exist yet until saved via UI)
            if 'tong_tien_nhan' in data[group]:
                print(f"   - tong_tien_nhan: {data[group]['tong_tien_nhan']}")
            else:
                print(f"   - tong_tien_nhan: Missing (Default will be 0)")
            print(f"   - so_tien_da_tt: {data[group].get('so_tien_da_tt')}")
        else:
            print(f"[ERROR] Group '{group}' NOT found!")

def simulate_balance_calc(tong_tien_nhan, so_tien_da_tt):
    balance = tong_tien_nhan - so_tien_da_tt
    return balance

if __name__ == "__main__":
    test_json_structure()
    
    print("\n--- Simulating Calculation Logic ---")
    # Example values
    t_nhan = 10000000
    t_da_tt = 3757270
    balance = simulate_balance_calc(t_nhan, t_da_tt)
    print(f"Nap: {t_nhan:,.0f} d")
    print(f"Da tra: {t_da_tt:,.0f} d")
    print(f"So du: {balance:,.0f} d")
    if balance == 6242730:
        print("[OK] Logic: So du = Nap - Da tra: OK")
    else:
        print("[ERROR] Logic calculation mismatch!")
