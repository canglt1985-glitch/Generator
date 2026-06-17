import os
import json
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

# Set up logging
logger = logging.getLogger("sync_config")

# Environment & Supabase Client Configuration
current_dir = os.path.dirname(os.path.abspath(__file__))
# Try loading env from backend/.env
load_dotenv(os.path.join(current_dir, '.env'))
# Try loading env from tvt3_v2/.env
parent_dir = os.path.dirname(current_dir)
load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

def sync_configs():
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase credentials missing in environment variables. Cannot sync.")
        return False
        
    try:
        # Import save_smartw_config dynamically to handle import paths correctly
        import sys
        sys.path.insert(0, current_dir)
        from smartw.config import save_smartw_config
        
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Call RPC to fetch config securely
        res = supabase.rpc('get_system_config_secure', {'p_secret': 'TVT3_SECRET_SYNC_2026'}).execute()
        configs = res.data or []
        
        if not configs:
            logger.info("No configs found in Supabase system_config table.")
            return False

        # Map list of key-value pairs to a dict
        cfg_dict = {item['key']: item['value'] for item in configs}
        
        # 1. Sync SmartW Config
        smartw_user = cfg_dict.get('smartw_username')
        smartw_pass = cfg_dict.get('smartw_password')
        if smartw_user and smartw_pass and 'mock' not in smartw_user and 'mock' not in smartw_pass:
            save_smartw_config(smartw_user, smartw_pass)
            logger.info("SmartW configs synced and encrypted locally.")
        else:
            logger.info("SmartW configs from Supabase are mock or empty. Skipped local overwrite.")
            
        # 2. Sync System Config (Telegram, Gmail, Viber, etc.)
        system_cfg_keys = [
            'telegram_report_chat_id', 
            'telegram_bot_token', 
            'viber_bot_token_outages', 
            'viber_bot_token_alarms', 
            'gmail_user', 
            'gmail_app_password'
        ]
        system_cfg = {}
        for k in system_cfg_keys:
            val = cfg_dict.get(k)
            if val and 'mock' not in str(val) and str(val) != '-100987654321':
                system_cfg[k] = val
            else:
                logger.info(f"Key {k} from Supabase is mock or empty. Skipped local overwrite.")
                
        if system_cfg:
            sys_cfg_file = os.path.join(current_dir, 'data', 'system_config.json')
            os.makedirs(os.path.dirname(sys_cfg_file), exist_ok=True)
            
            # Load existing config to avoid overwriting other potential local keys
            existing = {}
            if os.path.exists(sys_cfg_file):
                try:
                    with open(sys_cfg_file, 'r', encoding='utf-8') as f:
                        existing = json.load(f)
                except Exception:
                    existing = {}
                    
            # Update values
            existing.update(system_cfg)
            
            with open(sys_cfg_file, 'w', encoding='utf-8') as f:
                json.dump(existing, f, ensure_ascii=False, indent=2)
            logger.info("System configs synced locally to data/system_config.json.")
        
        return True
            
    except Exception as e:
        logger.error(f"Error syncing configs from Supabase: {e}")
        return False

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    sync_configs()
