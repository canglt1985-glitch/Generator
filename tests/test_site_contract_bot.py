"""
Comprehensive Test Suite for TVT3 Site & Contract Telegram Bot
Tests Core Config, Auth, Cache, 4-Field Resolvers, Search, Keyboards, and GPS Logic.
"""
import os
import sys
import unittest

# Ensure project root & backend are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(os.path.dirname(current_dir), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from bots.core.config import get_telegram_token, get_supabase_client, bot_config_manager
from bots.core.auth import AuthManager, auth_manager
from bots.resolvers.site_cache import site_cache, haversine_distance, strip_accents
from bots.resolvers.site_formatter import (
    format_summary_card,
    format_infra_card,
    format_contract_card,
    format_access_card,
    format_proximity_card,
    format_currency,
    format_date
)
from bots.handlers.keyboards import (
    build_summary_keyboard,
    build_subtab_keyboard,
    build_multi_match_keyboard,
    build_not_found_keyboard
)


class TestSiteContractBot(unittest.TestCase):
    """Test suite covering the complete pipeline of the bot."""

    @classmethod
    def setUpClass(cls):
        """Sync in-memory cache once before all tests."""
        cls.token = get_telegram_token()
        cls.sb = get_supabase_client()
        cls.cache_ok = site_cache.sync_from_supabase()

    def test_01_config_and_token(self):
        """Verify token and Supabase credentials are valid."""
        self.assertTrue(bool(self.token), "Telegram token should not be empty")
        self.assertGreater(len(self.token), 20, "Telegram token should have valid length")
        self.assertIsNotNone(self.sb, "Supabase client should be initialized")

    def test_02_auth_manager(self):
        """Verify auth manager permissions and rejection messages."""
        auth = AuthManager(allowed_users={123456, 789012}, admin_users={123456})
        self.assertTrue(auth.is_authorized(123456))
        self.assertTrue(auth.is_admin(123456))
        self.assertTrue(auth.is_authorized(789012))
        self.assertFalse(auth.is_admin(789012))
        self.assertFalse(auth.is_authorized(999999))

        rej_msg = auth.get_unauthorized_message(999999, "Test User")
        self.assertIn("TRUY CẬP BỊ GIỚI HẠN", rej_msg)
        self.assertIn("999999", rej_msg)

    def test_03_cache_sync_and_indexing(self):
        """Verify that cache loaded sites and built fast indexes."""
        self.assertTrue(self.cache_ok, "Cache should sync from Supabase successfully")
        self.assertGreaterEqual(len(site_cache.all_sites), 400, "Should cache at least 400 sites")
        self.assertGreaterEqual(len(site_cache.sites_by_id), 400)

    def test_04_site_code_lookups(self):
        """Test lookup by new code and old code with casing insensitivity."""
        sample = site_cache.all_sites[0]
        sid = sample.get("site_id")
        sold = sample.get("site_id_old")

        # By new ID uppercase
        found_new = site_cache.find_by_code(sid)
        self.assertIsNotNone(found_new)
        self.assertEqual(found_new.get("site_id"), sid)

        # By new ID lowercase
        found_lower = site_cache.find_by_code(sid.lower())
        self.assertIsNotNone(found_lower)
        self.assertEqual(found_lower.get("site_id"), sid)

        # By old ID if present
        if sold:
            found_old = site_cache.find_by_code(sold)
            self.assertIsNotNone(found_old)
            self.assertEqual(found_old.get("site_id"), sid)

    def test_05_fuzzy_keyword_search(self):
        """Test fuzzy and unaccent search by site name or landlord name."""
        matches = site_cache.search_keyword("Long Khanh", limit=5)
        self.assertGreater(len(matches), 0, "Should find sites matching 'Long Khanh'")

        # Test with accents
        matches_accent = site_cache.search_keyword("Long Khánh", limit=5)
        self.assertGreater(len(matches_accent), 0, "Should find sites matching 'Long Khánh'")

    def test_06_haversine_and_gps_proximity(self):
        """Test Haversine distance calculation and proximity finding."""
        # Distance between (10.0, 107.0) and (10.0, 107.01) is ~1.09 km
        d = haversine_distance(10.0, 107.0, 10.0, 107.01)
        self.assertGreater(d, 1000)
        self.assertLess(d, 1200)

        # Nearest site lookup around Long Khanh city center
        nearest = site_cache.find_nearest(10.93, 107.24, max_distance_km=15.0)
        self.assertGreater(len(nearest), 0, "Should find sites near Long Khánh")
        closest_site, dist_m = nearest[0]
        self.assertLess(dist_m, 15000)

    def test_07_site_formatters_4_fields(self):
        """Test all 4 field formatters produce valid HTML strings."""
        sample = site_cache.all_sites[0]

        # 1. Summary Card
        summary = format_summary_card(sample)
        self.assertIn("TRẠM:", summary)
        self.assertIn("Hợp đồng:", summary)
        self.assertIn("Địa chỉ:", summary)

        # 2. Infra Card
        infra = format_infra_card(sample)
        self.assertIn("HẠ TẦNG & NGUỒN ĐIỆN:", infra)
        self.assertIn("ĐIỆN LƯỚI & EVN:", infra)
        self.assertIn("MÁY PHÁT ĐIỆN", infra)
        self.assertIn("ẮC QUY:", infra)

        # 3. Contract Card
        contract = format_contract_card(sample)
        self.assertIn("HỢP ĐỒNG THUÊ MẶT BẰNG:", contract)
        self.assertIn("THÔNG TIN PHÁP LÝ:", contract)
        self.assertIn("TÀI CHÍNH & ĐƠN GIÁ:", contract)
        self.assertIn("TÀI KHOẢN CHỦ NHÀ:", contract)

        # 4. Access Card
        access = format_access_card(sample)
        self.assertIn("VÀO TRẠM & CHỦ ĐẤT:", access)
        self.assertIn("CHỦ ĐẤT / CHỦ NHÀ:", access)
        self.assertIn("Ổ KHÓA & CHÌA KHÓA:", access)

        # 5. Proximity Card
        prox = format_proximity_card(sample, 45.0)
        self.assertIn("ĐÃ ĐỊNH VỊ VỊ TRÍ CỦA BẠN!", prox)
        self.assertIn("45 mét", prox)

    def test_08_keyboards_generator(self):
        """Verify keyboards generate valid structure and short callback_data payloads."""
        sid = "26DNA_LK00"
        summary_kb = build_summary_keyboard(sid, 10.93, 107.24)
        self.assertIn("inline_keyboard", summary_kb)

        # Check all callback_data lengths are < 64 bytes
        for row in summary_kb["inline_keyboard"]:
            for btn in row:
                if "callback_data" in btn:
                    self.assertLess(len(btn["callback_data"].encode("utf-8")), 64)

        sub_kb = build_subtab_keyboard(sid, "INF", 10.93, 107.24)
        for row in sub_kb["inline_keyboard"]:
            for btn in row:
                if "callback_data" in btn:
                    self.assertLess(len(btn["callback_data"].encode("utf-8")), 64)

        multi_kb = build_multi_match_keyboard(site_cache.all_sites[:4])
        self.assertEqual(len(multi_kb["inline_keyboard"]), 5)  # 4 sites + Cancel button

    def test_09_bot_config_and_dynamic_whitelist(self):
        """Test dynamic config manager and Supabase-backed whitelist RBAC."""
        features = bot_config_manager.get_features()
        self.assertIn("allow_infra_lookup", features)
        self.assertIn("allow_contract_lookup", features)
        self.assertIn("allow_access_lookup", features)
        self.assertIn("gps_max_distance_km", features)

        # Inject simulated whitelist entry
        bot_config_manager.whitelist = [
            {"telegram_id": "888888", "name": "KTV Test Active", "role": "KTV", "status": "active"},
            {"telegram_id": "999999", "name": "KTV Test Inactive", "role": "KTV", "status": "inactive"},
            {"telegram_id": "777777", "name": "Admin Test", "role": "ADMIN", "status": "active"},
        ]

        # Test active KTV
        self.assertTrue(auth_manager.is_authorized(888888))
        self.assertEqual(auth_manager.get_role(888888), "KTV")
        self.assertFalse(auth_manager.is_admin(888888))

        # Test inactive KTV (revoked)
        self.assertFalse(auth_manager.is_authorized(999999))

        # Test active Admin
        self.assertTrue(auth_manager.is_authorized(777777))
        self.assertTrue(auth_manager.is_admin(777777))
        self.assertEqual(auth_manager.get_role(777777), "ADMIN")


if __name__ == "__main__":
    unittest.main()

