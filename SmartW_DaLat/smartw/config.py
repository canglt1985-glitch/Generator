"""
SmartW Da Lat — Configuration Manager.
Loads settings from .env file and provides encrypted credential fallback.
"""
import os
import json
from pathlib import Path
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# Tự động nạp .env từ thư mục gốc của dự án
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')

DATA_DIR = PROJECT_ROOT / 'data' / 'smartw'
DATA_DIR.mkdir(parents=True, exist_ok=True)

LOGS_DIR = PROJECT_ROOT / 'logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_FILE = DATA_DIR / 'config.json'
KEY_FILE = DATA_DIR / '.fernet_key'


def _get_or_create_key() -> bytes:
    """Lấy hoặc tạo khóa Fernet mã hóa mật khẩu cục bộ."""
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
    key = Fernet.generate_key()
    KEY_FILE.write_bytes(key)
    return key


def _get_fernet() -> Fernet:
    return Fernet(_get_or_create_key())


def encrypt_value(value: str) -> str:
    return _get_fernet().encrypt(value.encode('utf-8')).decode('utf-8')


def decrypt_value(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode('utf-8')).decode('utf-8')


def load_smartw_config() -> dict:
    """Nạp tài khoản SmartW từ .env hoặc fallback qua config.json mã hóa."""
    username = os.getenv('SMARTW_USER')
    password = os.getenv('SMARTW_PASSWORD')
    if username and password and username != 'your_smartw_username':
        return {
            'username': username,
            'password': password,
            'updated_at': 'env'
        }

    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return {
                'username': decrypt_value(data['username']),
                'password': decrypt_value(data['password']),
                'updated_at': data.get('updated_at', '')
            }
        except Exception:
            pass

    return None


def is_smartw_configured() -> bool:
    return load_smartw_config() is not None


# ── THIẾT LẬP THAM SỐ VẬN HÀNH TỔ ĐÀ LẠT ──────────────────────────────
SMARTW_TEAM = os.getenv('SMARTW_TEAM', 'TVT Đà Lạt')
SMARTW_GROUP = os.getenv('SMARTW_GROUP', 'PVT Lâm Đồng')
SMARTW_TRUNG_TAM = os.getenv('SMARTW_TRUNG_TAM', 'MobiFone Lâm Đồng')
SMARTW_PROVINCE = os.getenv('SMARTW_PROVINCE', 'Tỉnh Lâm Đồng')
SMARTW_REGION = os.getenv('SMARTW_REGION', 'MN')

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
TELEGRAM_ADMIN_ID = os.getenv('TELEGRAM_ADMIN_ID', '')

VIBER_BOT_TOKEN = os.getenv('VIBER_BOT_TOKEN', '')
VIBER_GROUP_ID = os.getenv('VIBER_GROUP_ID', '')

SCAN_INTERVAL_SECONDS = int(os.getenv('SCAN_INTERVAL_SECONDS', '60'))
DEBUG_RETENTION_HOURS = int(os.getenv('DEBUG_RETENTION_HOURS', '2'))
MAX_ALARM_PAGESIZE = int(os.getenv('MAX_ALARM_PAGESIZE', '300'))
