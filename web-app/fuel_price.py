"""
Fuel Price Scraper — PVOil API
Scrapes fuel prices from PVOil website and saves to JSON.
Note: PVOil prices already include VAT (GTGT) and environmental tax.
      Use directly as retail price — no additional calculations needed.
"""
import os
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
FUEL_PRICE_FILE = os.path.join(DATA_DIR, 'fuel_prices.json')

PVOIL_URL = 'https://www.pvoil.com.vn/tin-gia-xang-dau'

# Map PVOil product names to our keys
PRODUCT_MAP = {
    'Xăng RON 95-III': 'xang_ron95',
    'RON 95-III': 'xang_ron95',
    'Dầu DO 0,05S-II': 'dau_do',
    'DO 0,05S-II': 'dau_do',
}


def scrape_pvoil_prices():
    """Scrape current fuel prices from PVOil website."""
    try:
        resp = requests.get(PVOIL_URL, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        resp.raise_for_status()
        resp.encoding = 'utf-8'

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Find the price table
        table = soup.find('table', class_='table')
        if not table:
            print("[FuelPrice] No price table found on PVOil page")
            return None

        prices = {}
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 3:
                product_name = cells[1].get_text(strip=True)
                price_text = cells[2].get_text(strip=True)

                # Parse price: "20.150 đ" -> 20150
                price_clean = price_text.replace('đ', '').replace('.', '').replace(',', '').strip()
                try:
                    price_val = int(price_clean)
                except ValueError:
                    continue

                # Exact match: "Xăng RON 95-III" but NOT "E10 RON 95-III" or "E5 RON 92"
                if 'RON 95' in product_name and 'E10' not in product_name and 'E5' not in product_name:
                    prices['xang_ron95'] = price_val
                elif 'DO 0,05S' in product_name:
                    prices['dau_do'] = price_val

        if not prices.get('xang_ron95') and not prices.get('dau_do'):
            print("[FuelPrice] Could not parse prices from PVOil table")
            return None

        return prices

    except Exception as e:
        print(f"[FuelPrice] Error scraping PVOil: {e}")
        return None


def save_fuel_prices(prices):
    """Save fuel prices to JSON file."""
    os.makedirs(DATA_DIR, exist_ok=True)

    data = {
        'xang_ron95': prices.get('xang_ron95', 0),
        'dau_do': prices.get('dau_do', 0),
        'updated_at': datetime.now().isoformat(),
        'source': 'pvoil'
    }

    with open(FUEL_PRICE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[FuelPrice] Saved: Xang={data['xang_ron95']:,}d, Dau={data['dau_do']:,}d")
    return data


def get_fuel_prices():
    """Get current fuel prices from cached JSON file."""
    try:
        if os.path.exists(FUEL_PRICE_FILE):
            with open(FUEL_PRICE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass

    # Default fallback
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
