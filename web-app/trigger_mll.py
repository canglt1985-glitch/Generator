"""Quick trigger script — scrape only MLL to verify column mapping fix."""
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(__file__))

from smartw.config import load_smartw_config
from smartw.scraper import run_scrape_sync

config = load_smartw_config()
if not config:
    print('❌ Config not found. Run admin panel first to save SmartW credentials.')
    sys.exit(1)

print(f'🔑 Config loaded (user: {config["username"]})')
print('⏳ Triggering MLL scrape only...')

result = run_scrape_sync(
    username=config['username'],
    password=config['password'],
    tables=['mll']
)

print('\n── Result ──')
if result.get('error'):
    print(f'❌ Error: {result["error"]}')
else:
    mll = result.get('mll', [])
    print(f'✅ MLL records: {len(mll)}')
    if mll:
        print(f'📋 First record: {mll[0]}')
        print(f'📋 Last record:  {mll[-1]}')
