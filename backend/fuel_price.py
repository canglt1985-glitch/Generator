"""
Fuel Price Scraper — PVOil API
Scrapes fuel prices from webtygia.com and updates Supabase V2 fuel_and_expenses database.
"""
import os
import json
import requests
import time
from datetime import datetime
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Environment & Supabase V2 Client Configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
# Load env
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

DATA_DIR = os.path.join(current_dir, 'data')
FUEL_PRICE_FILE = os.path.join(DATA_DIR, 'fuel_prices.json')
FUEL_PRICE_HISTORY_FILE = os.path.join(DATA_DIR, 'fuel_prices_history.json')

# Map product names to standard keys
PRODUCT_MAP = {
    'Xăng sinh học E10 RON 95-III': 'xang_ron95',
    'Xăng E10 RON 95-III': 'xang_ron95',
    'E10 RON 95-III': 'xang_ron95',
    'Xăng sinh học E10 RON 95-V': 'xang_ron95_v',
    'E10 RON 95-V': 'xang_ron95_v',
    'Xăng RON 95-III': 'xang_ron95',
    'RON 95-III': 'xang_ron95',
    'Dầu DO 0,05S-II': 'dau_do',
    'Điêzen 0,05S-II': 'dau_do',
    'DO 0,05S-II': 'dau_do',
}

# Seeded Price History for retrofitting prices
SEEDED_PRICE_HISTORY = [
    ('2025-01-01', 21000, 20000),
    ('2026-02-20', 19150, 18520),
    ('2026-02-26', 20150, 19270),
]

def _load_price_history() -> list[dict]:
    """Load price history from JSON file (sorted oldest to newest)."""
    history = []
    # Seeded data
    for date_str, xang, dau in SEEDED_PRICE_HISTORY:
        history.append({
            'effective_date': date_str,
            'xang_ron95': xang,
            'dau_do': dau,
            'source': 'seeded'
        })

    # Read config file
    if os.path.exists(FUEL_PRICE_HISTORY_FILE):
        try:
            with open(FUEL_PRICE_HISTORY_FILE, 'r', encoding='utf-8') as f:
                extra = json.load(f)
            history.extend(extra)
        except Exception:
            pass

    # Deduplicate and sort by date
    seen = {}
    for entry in history:
        seen[entry['effective_date']] = entry
    history = sorted(seen.values(), key=lambda x: x['effective_date'])

    return history

def get_fuel_price_for_date(date_str: str, fuel_type: str = 'Dầu') -> int:
    """Get the correct fuel price for a specific date using historical price table."""
    history = _load_price_history()
    if not history:
        return 20000 if 'Xăng' not in fuel_type else 19000

    matching = None
    for entry in history:
        if entry['effective_date'] <= date_str:
            matching = entry
        else:
            break

    if not matching:
        matching = history[0]

    if fuel_type and 'Xăng' in fuel_type:
        return matching.get('xang_ron95', 21000)
    else:
        return matching.get('dau_do', 20000)

def scrape_pvoil_prices():
    """Scrape current fuel prices from webtygia.com with retries."""
    url = 'https://webtygia.com/gia-xang-dau.html'
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            resp.raise_for_status()
            resp.encoding = 'utf-8'

            soup = BeautifulSoup(resp.text, 'html.parser')
            table = soup.find('table')
            if not table:
                print(f"[FuelPrice] Attempt {attempt+1}: No price table found on webtygia")
                time.sleep(1)
                continue

            prices = {}
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['th', 'td'])
                if len(cells) >= 2:
                    product_name = cells[0].get_text(strip=True)
                    price_text = cells[1].get_text(strip=True)

                    price_clean = price_text.replace('đ', '').replace('.', '').replace(',', '').strip()
                    try:
                        price_val = int(price_clean)
                    except ValueError:
                        continue

                    p_lower = product_name.lower()

                    # Match E10 / RON95 Gasoline
                    if 'e10' in p_lower or 'ron 95' in p_lower or 'ron95' in p_lower:
                        if 'e10' in p_lower:
                            prices['xang_ron95'] = price_val
                            prices['_found_e10'] = True
                        elif not prices.get('_found_e10') and 'xang_ron95' not in prices:
                            prices['xang_ron95'] = price_val

                    # Match Diesel / DO
                    elif any(k in p_lower for k in ['do 0', 'dầu do', 'điêzen', 'diezen', '0,05s']):
                        if 'dau_do' not in prices:
                            prices['dau_do'] = price_val

            prices.pop('_found_e10', None)
            if prices.get('xang_ron95') or prices.get('dau_do'):
                return prices

        except (requests.exceptions.RequestException, Exception) as e:
            print(f"[FuelPrice] Attempt {attempt+1} error: {e}")
            time.sleep(2)
            
    print("[FuelPrice] Failed to scrape prices after retries")
    return None

def recalculate_fuel_ledger_prices(start_date='2026-02-01'):
    """Recalculate fuel prices in Supabase fuel_and_expenses table based on historical prices."""
    if not supabase:
        print("[FuelPrice] Supabase client not initialized. Cannot recalculate prices.")
        return 0
        
    history = _load_price_history()
    # Sort history by date descending
    history = sorted(history, key=lambda x: x['effective_date'], reverse=True)
    
    def get_gross_price(fuel_type, date_str):
        for entry in history:
            if entry['effective_date'] <= date_str:
                return float(entry['xang_ron95'] if 'xăng' in fuel_type.lower() else entry['dau_do'])
        return None

    try:
        res = supabase.table("fuel_and_expenses").select("*").gte("date", start_date).execute()
        records = res.data or []
        updated_count = 0
        
        for r in records:
            ft = r.get("fuel_tracking") or {}
            tx_type = ft.get("type")
            if tx_type in ['DIRECT_BUY', 'STOCK_IN']:
                date_str = r.get("date")
                fuel_type = ft.get("fuel_type") or 'Dầu'
                new_price = get_gross_price(fuel_type, date_str)
                
                old_price = float(ft.get("unit_price") or 0)
                if new_price and abs(old_price - new_price) > 1:
                    ft["unit_price"] = new_price
                    qty = float(ft.get("quantity") or 0)
                    ft["total_amount"] = round(qty * new_price)
                    
                    supabase.table("fuel_and_expenses").update({
                        "fuel_tracking": ft
                    }).eq("record_id", r["record_id"]).execute()
                    
                    updated_count += 1
                    
        return updated_count
    except Exception as e:
        print(f"[FuelPrice] Failed to recalculate prices on Supabase: {e}")
        return 0

def save_fuel_prices(prices):
    """Save fuel prices to JSON file and append to history if price changed."""
    os.makedirs(DATA_DIR, exist_ok=True)

    today = datetime.now().strftime('%Y-%m-%d')
    data = {
        'xang_ron95': prices.get('xang_ron95', 0),
        'dau_do': prices.get('dau_do', 0),
        'updated_at': datetime.now().isoformat(),
        'source': 'pvoil'
    }

    with open(FUEL_PRICE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Append to history if this is a new price for today
    _append_price_history(today, prices.get('xang_ron95', 0), prices.get('dau_do', 0))

    if supabase:
        try:
            supabase.table("system_config").upsert({
                "key": "fuel_prices",
                "value": data,
                "description": "Scraped PVOil Fuel Prices",
                "updated_at": datetime.now().isoformat(),
                "updated_by": "backend_scraper"
            }).execute()
            print("[FuelPrice] Pushed latest prices to Supabase system_config table.")
        except Exception as e:
            print(f"[FuelPrice] Failed to push to Supabase system_config table: {e}")

    print(f"[FuelPrice] Saved: Xang={data['xang_ron95']:,}d, Dau={data['dau_do']:,}d")
    return data

def _append_price_history(date_str: str, xang_ron95: int, dau_do: int):
    """Append a new price point to history file if price changed."""
    history = []
    if os.path.exists(FUEL_PRICE_HISTORY_FILE):
        try:
            with open(FUEL_PRICE_HISTORY_FILE, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except Exception:
            history = []

    existing_dates = {e['effective_date'] for e in history}
    if date_str in existing_dates:
        for entry in history:
            if entry['effective_date'] == date_str:
                entry['xang_ron95'] = xang_ron95
                entry['dau_do'] = dau_do
                entry['source'] = 'pvoil'
    else:
        history.append({
            'effective_date': date_str,
            'xang_ron95': xang_ron95,
            'dau_do': dau_do,
            'source': 'pvoil'
        })

    with open(FUEL_PRICE_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

def get_fuel_prices():
    """Get current fuel prices from cached JSON file."""
    try:
        if os.path.exists(FUEL_PRICE_FILE):
            with open(FUEL_PRICE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass

    return {
        'xang_ron95': 20000,
        'dau_do': 19000,
        'updated_at': None,
        'source': 'default'
    }

def fetch_and_save():
    """Fetch prices from PVOil and save to file. Called by scheduler."""
    print(f"[FuelPrice] Start scrape PVOil: {datetime.now()}")
    prices = scrape_pvoil_prices()
    if prices:
        return save_fuel_prices(prices)
    else:
        print("[FuelPrice] No new prices, keeping cached")
        return get_fuel_prices()

if __name__ == '__main__':
    fetch_and_save()
