"""
Authentication and Authorization Module for TVT3 Bots
"""
import logging
from typing import Optional, Set, Dict, Any
from .config import ALLOWED_USERS, ADMIN_USERS, bot_config_manager

logger = logging.getLogger("tvt3_bot.auth")

ROLE_ADMIN = "ADMIN"
ROLE_KTV = "KTV"
ROLE_QLT = "QLT"
ROLE_GUEST = "GUEST"


class AuthManager:
    """Manages Telegram user authentication and authorization with dynamic Supabase whitelist."""

    def __init__(self, allowed_users: Optional[Set[int]] = None, admin_users: Optional[Set[int]] = None):
        self.allowed_users = allowed_users if allowed_users is not None else set(ALLOWED_USERS)
        self.admin_users = admin_users if admin_users is not None else set(ADMIN_USERS)

    def _get_db_user_entry(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Look up user in dynamic Supabase whitelist."""
        whitelist = bot_config_manager.get_whitelist()
        str_id = str(user_id).strip()
        for item in whitelist:
            if str(item.get("telegram_id", "")).strip() == str_id:
                return item
        return None

    def is_authorized(self, user_id: int, username: str = "") -> bool:
        """
        Check if user has permission to use the bot.
        Priority:
        1. Explicit active/inactive status in DB whitelist
        2. Admin / Allowed env configuration
        3. If no whitelist exists at all, allow team by default.
        """
        db_user = self._get_db_user_entry(user_id)
        if db_user:
            # If explicitly set to inactive by Admin on Desktop Dashboard
            if db_user.get("status") == "inactive":
                return False
            if db_user.get("status") == "active":
                return True

        if user_id in self.admin_users or user_id in self.allowed_users:
            return True

        # Default secure: Deny access if user is not in admin, allowed, or active whitelist
        return False

    def is_admin(self, user_id: int) -> bool:
        """Check if user has administrative privileges."""
        if user_id in self.admin_users:
            return True
        db_user = self._get_db_user_entry(user_id)
        if db_user and db_user.get("status") == "active":
            return db_user.get("role") == ROLE_ADMIN
        return False

    def get_role(self, user_id: int) -> str:
        """Return the role of the user."""
        if self.is_admin(user_id):
            return ROLE_ADMIN
        db_user = self._get_db_user_entry(user_id)
        if db_user and db_user.get("status") == "active":
            return db_user.get("role", ROLE_KTV)
        if self.is_authorized(user_id):
            return ROLE_KTV
        return ROLE_GUEST

    def get_unauthorized_message(self, user_id: int, full_name: str = "") -> str:
        """Generate a user-friendly rejection message with instructions."""
        name_str = f" {full_name}" if full_name else ""
        return (
            f"🔒 <b>TRUY CẬP BỊ GIỚI HẠN</b>\n\n"
            f"Chào bạn{name_str}!\n"
            f"Hệ thống chỉ phục vụ kỹ sư và kỹ thuật viên thuộc <b>Tổ Viễn Thông 3 (TVT3)</b>.\n\n"
            f"🆔 <b>Telegram ID của bạn:</b> <code>{user_id}</code>\n\n"
            f"👉 <i>Vui lòng gửi Telegram ID này cho Quản trị viên TVT3 để được cấp quyền sử dụng.</i>"
        )


# Global instance
auth_manager = AuthManager()

