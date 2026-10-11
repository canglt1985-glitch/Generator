"""
Unit tests for site_resolver module (8-character BTS rule).
Uses python's standard unittest library.
"""

import os
import sys
import unittest

# Ensure backend directory is in python path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from smartw.site_resolver import (
    resolve_smartw_site,
    get_site_qlt_short,
    is_managed_site,
    set_datasites_cache
)

MOCK_DATASITES = [
    {
        "site_id": "DNILKH1",
        "site_id_old": "DNILKH1",
        "name": "AGG Long Khánh",
        "classification": {"loai_tram": "AGG/CSG"},
        "management_info": {"qlt": "Lê Trần Vĩnh", "to_ql": "VT3"}
    },
    {
        "site_id": "DNIDQN1",
        "site_id_old": "DNIDQN1",
        "name": "AGG Định Quán",
        "classification": {"loai_tram": "AGG/CSG"},
        "management_info": {"qlt": "Lê Trần Vĩnh", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH10",
        "site_id_old": "DNLK35",
        "name": "Long Khánh 10",
        "management_info": {"qlt": "Trần Ngọc Khuân", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH11",
        "site_id_old": "DNLK45",
        "name": "Long Khánh 11",
        "management_info": {"qlt": "Trần Ngọc Khuân", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH12",
        "site_id_old": "DNLK49",
        "name": "Long Khánh 12",
        "management_info": {"qlt": "Lê Trần Vĩnh", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH13",
        "site_id_old": "DNLK73",
        "name": "Long Khánh 13",
        "management_info": {"qlt": "Lê Thành Thái", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH14",
        "site_id_old": "DNLK75",
        "name": "Long Khánh 14",
        "management_info": {"qlt": "Trần Ngọc Khuân", "to_ql": "VT3"}
    },
    {
        "site_id": "DNILKH15",
        "site_id_old": "DNLKS1",
        "name": "Long Khánh 15",
        "management_info": {"qlt": "Trần Ngọc Khuân", "to_ql": "VT3"}
    },
    {
        "site_id": "DNIXLO16",
        "site_id_old": "DNXL35",
        "name": "Xuân Lộc 16",
        "management_info": {"qlt": "Nguyễn Văn Nam", "to_ql": "VT3"}
    },
    {
        "site_id": "DNICTP01",
        "site_id_old": "DNCM01",
        "name": "Cẩm Đường 1",
        "management_info": {"qlt": "Trần Ngọc Khuân", "to_ql": "VT3"}
    },
    {
        "site_id": "26DNa165",
        "site_id_old": "26DNa165",
        "name": "Trạm CSHT MBF Đầu Tư",
        "management_info": {"qlt": "Ban Quản Lý CSHT", "to_ql": "VT3"}
    }
]


class TestSiteResolver(unittest.TestCase):
    def setUp(self):
        set_datasites_cache(MOCK_DATASITES)

    def test_resolve_dnilkh11l_not_clobbered_by_dnilkh1(self):
        """CRITICAL: DNILKH11L must resolve to DNILKH11 (4G), NOT DNILKH1."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH11L")
        self.assertEqual(new_id, "DNILKH11")
        self.assertEqual(old_id, "DNLK45")
        self.assertEqual(tech, "4G")

        qlt = get_site_qlt_short("DNILKH11L")
        self.assertEqual(qlt, "Khuân")  # NOT Vĩnh!

    def test_resolve_dnilkh10ul(self):
        """DNILKH10UL must resolve to DNILKH10 (4G SRAN) and QLT Khuân."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH10UL")
        self.assertEqual(new_id, "DNILKH10")
        self.assertEqual(old_id, "DNLK35")
        self.assertEqual(tech, "4G SRAN")

        qlt = get_site_qlt_short("DNILKH10UL")
        self.assertEqual(qlt, "Khuân")

    def test_resolve_dnilkh13l(self):
        """DNILKH13L must resolve to DNILKH13 and QLT Thái."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH13L")
        self.assertEqual(new_id, "DNILKH13")
        self.assertEqual(old_id, "DNLK73")
        self.assertEqual(tech, "4G")

        qlt = get_site_qlt_short("DNILKH13L")
        self.assertEqual(qlt, "Thái")

    def test_resolve_dnilkh14n_5g(self):
        """DNILKH14N must resolve to DNILKH14 with 5G technology."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH14N")
        self.assertEqual(new_id, "DNILKH14")
        self.assertEqual(old_id, "DNLK75")
        self.assertEqual(tech, "5G")

    def test_resolve_isolated_agg_dnilkh1(self):
        """DNILKH1 must resolve safely to itself and QLT Vĩnh."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH1")
        self.assertEqual(new_id, "DNILKH1")
        self.assertEqual(old_id, "DNILKH1")

        qlt = get_site_qlt_short("DNILKH1")
        self.assertEqual(qlt, "Vĩnh")

    def test_resolve_isolated_agg_dnidqn1(self):
        """DNIDQN1 must resolve safely to itself."""
        new_id, old_id, tech = resolve_smartw_site("DNIDQN1")
        self.assertEqual(new_id, "DNIDQN1")
        self.assertEqual(old_id, "DNIDQN1")

        qlt = get_site_qlt_short("DNIDQN1")
        self.assertEqual(qlt, "Vĩnh")

    def test_resolve_old_bts_code_dnlk45(self):
        """Old 6-char BTS code DNLK45 should resolve to DNILKH11."""
        new_id, old_id, tech = resolve_smartw_site("DNLK45")
        self.assertEqual(new_id, "DNILKH11")
        self.assertEqual(old_id, "DNLK45")

    def test_resolve_old_bts_with_tech_suffix(self):
        """Old code DNLK45_4G should resolve to 4G."""
        new_id, old_id, tech = resolve_smartw_site("DNLK45_4G")
        self.assertEqual(new_id, "DNILKH11")
        self.assertEqual(old_id, "DNLK45")
        self.assertEqual(tech, "4G")

    def test_resolve_mbf_prefix(self):
        """Raw site with MBF_ prefix should be cleanly stripped."""
        new_id, old_id, tech = resolve_smartw_site("MBF_DNILKH11L")
        self.assertEqual(new_id, "DNILKH11")
        self.assertEqual(tech, "4G")

    def test_resolve_cell_sector_suffix(self):
        """Cell sector alarm DNILKH11L1 should resolve to DNILKH11 and 4G."""
        new_id, old_id, tech = resolve_smartw_site("DNILKH11L1")
        self.assertEqual(new_id, "DNILKH11")
        self.assertEqual(tech, "4G")

    def test_is_managed_site(self):
        """Check management boundary detection."""
        self.assertTrue(is_managed_site("DNILKH11L"))
        self.assertTrue(is_managed_site("DNILKH1"))
        self.assertTrue(is_managed_site("DNIXLO16N"))
        self.assertFalse(is_managed_site("UNKNOWN_SITE_99"))


if __name__ == "__main__":
    unittest.main()
