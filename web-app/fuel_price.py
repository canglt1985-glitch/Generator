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
FUEL_PRICE_HISTORY_FILE = os.path.join(DATA_DIR, 'fuel_prices_history.json')

PVOIL_URL = 'https://www.pvoil.com.vn/tin-gia-xang-dau'

# Map PVOil product names to our keys
PRODUCT_MAP = {
    'Xăng RON 95-III': 'xang_ron95',
    'RON 95-III': 'xang_ron95',
    'Dầu DO 0,05S-II': 'dau_do',
    'DO 0,05S-II': 'dau_do',
}

# ── Seeded Price History (manually verified from PVOil announcements) ─────
# Format: (effective_date_str, xang_ron95, dau_do)
# Prices are full retail including VAT in VND/liter
# Sorted oldest to newest — used by get_fuel_price_for_date()
SEEDED_PRICE_HISTORY = [
    ('2025-01-01', 21000, 20000),  # Baseline fallback
    ('2026-02-20', 19150, 18520),  # CV1162
    ('2026-02-26', 20150, 19270),  # GBL mới 26/02/2026
]


def _load_price_history() -> list[dict]:
    """Load price history from JSON file (sorted oldest to newest)."""
    history = []
    # Start from seeded data
    for date_str, xang, dau in SEEDED_PRICE_HISTORY:
        history.append({
            'effective_date': date_str,
            'xang_ron95': xang,
            'dau_do': dau,
            'source': 'seeded'
        })

    # Overlay with any recorded changes from our history file
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
    """Get the correct PVOil fuel price for a specific date.

    Uses historical price table — finds the price entry that was effective
    on or before the given date (i.e., the last price change before that date).

    Args:
        date_str: Date in 'YYYY-MM-DD' format.
        fuel_type: 'Xăng' or 'Dầu'.

    Returns:
        Price per liter as integer (VND).
    """
    history = _load_price_history()
    if not history:
        return 20000 if 'Xăng' not in fuel_type else 19000

    # Walk history from latest to find the last entry on or before date_str
    matching = None
    for entry in history:
        if entry['effective_date'] <= date_str:
            matching = entry
        else:
            break

    if not matching:
        matching = history[0]  # Fallback: use oldest known price

    if fuel_type and 'Xăng' in fuel_type:
        return matching.get('xang_ron95', 21000)
    else:
        return matching.get('dau_do', 20000)


def scrape_pvoil_prices():
    """Scrape current fuel prices from webtygia.com (Vùng 1)."""
    try:
        url = 'https://webtygia.com/gia-xang-dau.html'
        resp = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        })
        resp.raise_for_status()
        resp.encoding = 'utf-8'

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Find the first table which contains the fuel prices
        table = soup.find('table')
        if not table:
            print("[FuelPrice] No price table found on webtygia")
            return None

        prices = {}
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['th', 'td'])
            if len(cells) >= 2:
                product_name = cells[0].get_text(strip=True)
                price_text = cells[1].get_text(strip=True) # Vùng 1 is column 1

                # Parse price: "20.150" -> 20150
                price_clean = price_text.replace('đ', '').replace('.', '').replace(',', '').strip()
                try:
                    price_val = int(price_clean)
                except ValueError:
                    continue

                if 'RON 95-III' in product_name and 'E10' not in product_name:
                    prices['xang_ron95'] = price_val
                elif 'DO 0,05S-II' in product_name:
                    prices['dau_do'] = price_val

        if not prices.get('xang_ron95') and not prices.get('dau_do'):
            print("[FuelPrice] Could not parse prices from webtygia table")
            return None

        return prices

    except Exception as e:
        print(f"[FuelPrice] Error scraping webtygia: {e}")
        return None


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

    # Only append if price changed (avoid duplicates for same day)
    existing_dates = {e['effective_date'] for e in history}
    if date_str in existing_dates:
        # Update the existing entry for today
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
