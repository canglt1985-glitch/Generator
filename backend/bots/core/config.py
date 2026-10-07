"""
Core Configuration Module for TVT3 Bots
"""
import os
import json
import time
import logging
from typing import Set, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logger
logger = logging.getLogger("tvt3_bot.config")

# Resolve directories
CORE_DIR = os.path.dirname(os.path.abspath(__file__))
BOTS_DIR = os.path.dirname(CORE_DIR)
BACKEND_DIR = os.path.dirname(BOTS_DIR)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DATA_DIR = os.path.join(BACKEND_DIR, "data")
LOGS_DIR = os.path.join(BACKEND_DIR, "logs")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# 1. Load env files
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
if not os.getenv("VITE_SUPABASE_URL") and not os.getenv("SUPABASE_URL"):
    load_dotenv(os.path.join(PROJECT_ROOT, "tvt3_v2", ".env"))


def get_supabase_client() -> Optional[Client]:
    """Initialize and return Supabase Client."""
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

    if not url or not key:
        logger.error("Supabase credentials missing in environment variables.")
        return None

    try:
        client = create_client(url, key)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def get_telegram_token() -> str:
    """Retrieve Telegram Bot Token with graceful fallbacks."""
    # Priority 1: Specific env variable for this bot
    token = os.getenv("SITE_CONTRACT_BOT_TOKEN") or os.getenv("TELEGRAM_TOKEN")
    if token and token.strip():
        return token.strip()

    # Priority 2: system_config.json in backend/data/
    cfg_path = os.path.join(DATA_DIR, "system_config.json")
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                token = cfg.get("telegram_bot_token")
                if token and token.strip():
                    return token.strip()
        except Exception as e:
            logger.warning(f"Error reading system_config.json: {e}")

    # Priority 3: Supabase system_config table
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("system_config").select("value").eq("key", "telegram_bot_token").maybe_single().execute()
            if res.data and res.data.get("value"):
                token = str(res.data.get("value")).strip()
                if token:
                    return token
        except Exception as e:
            logger.debug(f"Could not load token from Supabase system_config: {e}")

    logger.warning("No Telegram Bot token configured in environment or database.")
    return ""


def get_allowed_user_ids() -> Set[int]:
    """Retrieve set of authorized Telegram numeric user IDs."""
    raw = os.getenv("TELEGRAM_ALLOWED_USERS", "")
    allowed: Set[int] = set()
    if raw.strip():
        for item in raw.split(","):
            item = item.strip()
            if item.isdigit():
                allowed.add(int(item))
    return allowed


def get_admin_user_ids() -> Set[int]:
    """Retrieve set of admin Telegram numeric user IDs."""
    raw = os.getenv("TELEGRAM_ADMIN_USERS", "")
    admins: Set[int] = set()
    if raw.strip():
        for item in raw.split(","):
            item = item.strip()
            if item.isdigit():
                admins.add(int(item))
    return admins


class BotConfigManager:
    """Manages dynamic feature toggles and whitelist loaded from Supabase system_config."""

    DEFAULT_FEATURES = {
        "allow_infra_lookup": True,
        "allow_contract_lookup": True,
        "allow_access_lookup": True,
        "allow_gps_lookup": True,
        "allow_fuzzy_search": True,
        "gps_max_distance_km": 1.0,
        "contract_warning_days": 45,
        "cache_refresh_minutes": 60,
        "last_force_sync": None
    }

    def __init__(self):
        self.features = dict(self.DEFAULT_FEATURES)
        self.whitelist = []
        self.last_fetch_time = 0.0
        self.cache_ttl = 30.0  # Check DB every 30 seconds
        self.last_applied_force_sync = None

    def fetch_dynamic_config(self, force: bool = False) -> None:
        """Fetch latest bot_features_config and bot_whitelist_users from Supabase system_config."""
        now = time.time()
        if not force and (now - self.last_fetch_time < self.cache_ttl):
            return

        sb = get_supabase_client()
        if not sb:
            return

        try:
            res = sb.table("system_config").select("*").in_("key", ["bot_features_config", "bot_whitelist_users"]).execute()
            if res.data:
                for row in res.data:
                    k = row.get("key")
                    val = row.get("value")
                    if k == "bot_features_config" and isinstance(val, dict):
                        self.features.update(val)
                    elif k == "bot_whitelist_users" and isinstance(val, list):
                        self.whitelist = val
            self.last_fetch_time = now
        except Exception as e:
            logger.warning(f"Error fetching dynamic bot config from system_config: {e}")

    def get_features(self) -> dict:
        self.fetch_dynamic_config()
        return self.features

    def get_whitelist(self) -> list:
        self.fetch_dynamic_config()
        return self.whitelist

    def check_force_sync_needed(self) -> bool:
        """Returns True if last_force_sync changed and requires cache rebuild."""
        self.fetch_dynamic_config()
        sync_ts = self.features.get("last_force_sync")
        if sync_ts and sync_ts != self.last_applied_force_sync:
            self.last_applied_force_sync = sync_ts
            return True
        return False


bot_config_manager = BotConfigManager()
TELEGRAM_TOKEN = get_telegram_token()
ALLOWED_USERS = get_allowed_user_ids()
ADMIN_USERS = get_admin_user_ids()

