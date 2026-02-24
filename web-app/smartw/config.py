"""
SmartW Config — Encrypt/decrypt credentials using Fernet.
Credentials stored in data/smartw/config.json (encrypted).
"""
import os
import json
from cryptography.fernet import Fernet

# Config file path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'smartw')
CONFIG_FILE = os.path.join(DATA_DIR, 'config.json')
KEY_FILE = os.path.join(DATA_DIR, '.fernet_key')


def _ensure_data_dir():
    """Create data/smartw/ if not exists."""
    os.makedirs(DATA_DIR, exist_ok=True)


def _get_or_create_key():
    """Get existing Fernet key or create a new one."""
    _ensure_data_dir()
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, 'rb') as f:
            return f.read()
    else:
        key = Fernet.generate_key()
        with open(KEY_FILE, 'wb') as f:
            f.write(key)
        return key


def _get_fernet():
    """Get Fernet instance."""
    return Fernet(_get_or_create_key())


def encrypt_value(value: str) -> str:
    """Encrypt a string value."""
    f = _get_fernet()
    return f.encrypt(value.encode('utf-8')).decode('utf-8')


def decrypt_value(encrypted: str) -> str:
    """Decrypt an encrypted string value."""
    f = _get_fernet()
    return f.decrypt(encrypted.encode('utf-8')).decode('utf-8')


def save_smartw_config(username: str, password: str):
    """Save SmartW credentials encrypted to config.json."""
    _ensure_data_dir()
    config = {
        'username': encrypt_value(username),
        'password': encrypt_value(password),
        'updated_at': __import__('datetime').datetime.now().isoformat()
    }
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def load_smartw_config() -> dict:
    """Load and decrypt SmartW credentials.
    Returns: {'username': str, 'password': str, 'updated_at': str} or None if not configured.
    """
    if not os.path.exists(CONFIG_FILE):
        return None
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return {
            'username': decrypt_value(config['username']),
            'password': decrypt_value(config['password']),
            'updated_at': config.get('updated_at', '')
        }
    except Exception:
        return None


def is_smartw_configured() -> bool:
    """Check if SmartW credentials are configured."""
    return load_smartw_config() is not None
