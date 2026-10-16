import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime
from backend import smartw_worker

class TestMllTopologyAndDropCount(unittest.TestCase):
    def setUp(self):
        smartw_worker._reset_topology_cache()
        smartw_worker._today_mll_drop_counts = {}
        smartw_worker._today_mll_drop_date = ""
        smartw_worker._last_today_mll_drop_fetch = 0.0

    def tearDown(self):
        smartw_worker._reset_topology_cache()

    def test_lsw_bypass_tag_cach_2(self):
        """Kiểm tra tag topology Cách 2: trạm kết nối LSW hiển thị [CSG_HUB - PARTNER] thay vì [LSW]."""
        mock_datasites = [
            {
                "site_id": "DNILNA04",
                "site_id_old": "DNDQ14",
                "technical_info": {
                    "csg": "CSG-DNDQ31",
                    "thiet_bi_csg": "LSW",
                    "chu_dau_tu_cap": "MBG",
                    "don_vi_van_hanh_cap": "Cáp Local",
                    "last_mile_primary": "Local LSW"
                },
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIDQU31",
                "site_id_old": "DNDQ31",
                "technical_info": {
                    "thiet_bi_csg": "CSG",
                    "last_mile_primary": "Local CSG"
                },
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIBVI01",
                "site_id_old": "DNLK02",
                "technical_info": {
                    "csg": "CSG-DNLK46",
                    "thiet_bi_csg": "LSW",
                    "chu_dau_tu_cap": "TPCOMS",
                    "don_vi_van_hanh_cap": "Cáp Local",
                    "last_mile_primary": "Local LSW"
                },
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIXHO10",
                "site_id_old": "DNXL36",
                "technical_info": {
                    "csg": "LSW-DNXL36",
                    "thiet_bi_csg": "LSW",
                    "chu_dau_tu_cap": "VTC",
                    "don_vi_van_hanh_cap": "Cáp Local",
                    "last_mile_primary": "Local LSW"
                },
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIDQU01",
                "site_id_old": "DNDQ01",
                "technical_info": {
                    "thiet_bi_csg": "CSG",
                    "last_mile_primary": "Local CSG"
                },
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIXLO45",
                "site_id_old": "DNXL45",
                "technical_info": {
                    "csg": "CSG-DNXL32",
                    "thiet_bi_csg": "FO",
                    "chu_dau_tu_cap": "VNPT",
                    "don_vi_van_hanh_cap": "VNPT",
                    "last_mile_primary": "DNXL45-DNXL32"
                },
                "management_info": {"tram_main": "KHÔNG"}
            }
        ]

        with patch.object(smartw_worker, '_get_datasites_list', return_value=mock_datasites):
            # 1. Trạm LSW có trạm đích CSG-DNDQ31 và đối tác MBG
            tag1 = smartw_worker._get_mll_topology_tag("DNILNA04")
            self.assertEqual(tag1, "[DNDQ31 - MBG]")

            # Truy vấn bằng mã trạm cũ DNDQ14 cũng phải ra chính xác
            tag1_old = smartw_worker._get_mll_topology_tag("DNDQ14")
            self.assertEqual(tag1_old, "[DNDQ31 - MBG]")

            # 2. Trạm LSW DNLK02 kéo về DNLK46 qua TPCOMS (chuẩn hóa thành TPC)
            tag2 = smartw_worker._get_mll_topology_tag("DNIBVI01")
            self.assertEqual(tag2, "[DNLK46 - TPC]")

            # 3. Trạm LSW đặt tại chỗ (hub là chính nó: LSW-DNXL36) có đối tác VTC
            tag3 = smartw_worker._get_mll_topology_tag("DNIXHO10")
            self.assertEqual(tag3, "[VTC]")

            # 4. Trạm Local CSG thuần
            tag4 = smartw_worker._get_mll_topology_tag("DNIDQU01")
            self.assertEqual(tag4, "[CSG]")

            # 5. Trạm FO macro kéo cáp thông thường
            tag5 = smartw_worker._get_mll_topology_tag("DNIXLO45")
            self.assertEqual(tag5, "[VNPT]")

    def test_partner_normalization_and_dnixlo32(self):
        """Kiểm tra tag topology cho DNIXLO32 và loại bỏ hoàn toàn chữ generic 'Đối tác ngoài'."""
        mock_datasites = [
            {
                "site_id": "DNIXLO02",
                "site_id_old": "DNXL07",
                "technical_info": {},
                "management_info": {"tram_main": "KHÔNG"}
            },
            {
                "site_id": "DNIXLO32",
                "site_id_old": "DNIXLO32",
                "technical_info": {
                    "tram_main_tx": "DNIXLO02 (DNXL07)",
                    "don_vi_van_hanh_cap": "TPC",
                    "chu_dau_tu_cap": "TPC"
                },
                "management_info": {}
            },
            {
                "site_id": "DNIXLO99",
                "site_id_old": "DNXL99",
                "technical_info": {
                    "tram_main_tx": "DNIXLO02 (DNXL07)",
                    "don_vi_van_hanh_cap": "Đối tác ngoài",
                    "chu_dau_tu_cap": "TPCOMS"
                },
                "management_info": {}
            },
            {
                "site_id": "DNIXLO88",
                "site_id_old": "DNXL88",
                "technical_info": {
                    "tram_main_tx": "DNIXLO02 (DNXL07)",
                    "don_vi_van_hanh_cap": "Local",
                    "chu_dau_tu_cap": "MobiFone"
                },
                "management_info": {}
            }
        ]

        with patch.object(smartw_worker, '_get_datasites_list', return_value=mock_datasites):
            # 1. DNIXLO32 với TPC -> [MAIN: DNXL07 - TPC]
            tag32 = smartw_worker._get_mll_topology_tag("DNIXLO32")
            self.assertEqual(tag32, "[MAIN: DNXL07 - TPC]")

            # 2. DNIXLO99 có 'Đối tác ngoài' -> Tự fallback sang chu_dau_tu_cap 'TPCOMS' và chuẩn hóa thành TPC
            tag99 = smartw_worker._get_mll_topology_tag("DNIXLO99")
            self.assertEqual(tag99, "[MAIN: DNXL07 - TPC]")
            self.assertNotIn("Đối tác ngoài", tag99)

            # 3. DNIXLO88 có 'Local' -> Trạm CRAN nội bộ TVT3, không gắn thêm tag đối tác
            tag88 = smartw_worker._get_mll_topology_tag("DNIXLO88")
            self.assertEqual(tag88, "[MAIN: DNXL07]")

            # 4. Kiểm tra format station lines với 3G4G
            grp = {
                'label': 'DNIXLO32',
                'nets': ['3G', '4G'],
                't': '14:10',
                'drop_count': 1
            }
            lines = smartw_worker._format_mll_station_lines("DNIXLO32", grp)
            self.assertEqual(lines[0], "• DNIXLO32 [3G4G]")
            self.assertEqual(lines[1], "  ↳ 14:10 • [MAIN: DNXL07 - TPC]")

    def test_mll_drop_count_and_format_lines(self):
        """Kiểm tra bổ sung số lần rớt trong ngày (Lần X) vào dòng báo cáo MLL."""
        mock_datasites = [
            {
                "site_id": "DNILNA04",
                "site_id_old": "DNDQ14",
                "technical_info": {
                    "csg": "CSG-DNDQ31",
                    "thiet_bi_csg": "LSW",
                    "chu_dau_tu_cap": "MBG",
                    "don_vi_van_hanh_cap": "Cáp Local",
                    "last_mile_primary": "Local LSW"
                },
                "management_info": {"tram_main": "KHÔNG"}
            }
        ]

        with patch.object(smartw_worker, '_get_datasites_list', return_value=mock_datasites):
            # Test khi trạm rớt 17 lần
            grp_17 = {
                'label': 'DNILNA04 (DNDQ14)',
                'nets': ['3G'],
                't': '13:05',
                'drop_count': 17
            }
            lines = smartw_worker._format_mll_station_lines("DNILNA04", grp_17)
            self.assertEqual(len(lines), 2)
            self.assertEqual(lines[0], "• DNILNA04 (DNDQ14) [3G] (Lần 17)")
            self.assertEqual(lines[1], "  ↳ 13:05 • [DNDQ31 - MBG]")

            # Test khi trạm rớt 1 lần: không hiển thị (Lần 1)
            grp_1 = {
                'label': 'DNILNA04 (DNDQ14)',
                'nets': ['3G'],
                't': '08:30',
                'drop_count': 1
            }
            lines_single = smartw_worker._format_mll_station_lines("DNILNA04", grp_1)
            self.assertEqual(lines_single[0], "• DNILNA04 (DNDQ14) [3G]")
            self.assertEqual(lines_single[1], "  ↳ 08:30 • [DNDQ31 - MBG]")

    def test_mll_drop_count_from_supabase_alarms(self):
        """Kiểm tra logic gom alarm thành sự cố rớt mạng (nhóm các alarm cách nhau > 10 phút)."""
        now = datetime.now()
        base_dt = datetime(now.year, now.month, now.day, 8, 0, 0)
        
        # 3 sự cố riêng biệt: 08:00 (có 2 alarm lặp), 08:30, 09:15
        mock_alarms = [
            {"site": "DNILNA04", "network": "3G", "alarm_type": "mll", "sdate": "2026-10-13T08:00:00+07:00"},
            {"site": "DNILNA04", "network": "3G", "alarm_type": "mll_cell", "sdate": "2026-10-13T08:05:00+07:00"}, # Gom vào 08:00 (<10p)
            {"site": "DNILNA04", "network": "3G", "alarm_type": "mll", "sdate": "2026-10-13T08:30:00+07:00"},
            {"site": "DNILNA04", "network": "3G", "alarm_type": "mll", "sdate": "2026-10-13T09:15:00+07:00"},
            {"site": "DNDQ05", "network": "4G", "alarm_type": "mll", "sdate": "2026-10-13T09:00:00+07:00"} # 1 lần
        ]

        mock_res = MagicMock()
        mock_res.data = mock_alarms
        mock_table = MagicMock()
        mock_table.select.return_value.gte.return_value.or_.return_value.execute.return_value = mock_res
        mock_supabase = MagicMock()
        mock_supabase.table.return_value = mock_table

        with patch.object(smartw_worker, 'supabase', mock_supabase):
            count_ilna = smartw_worker._get_mll_drop_count("DNILNA04")
            self.assertEqual(count_ilna, 3)

            count_dq05 = smartw_worker._get_mll_drop_count("DNDQ05")
            self.assertEqual(count_dq05, 1)

if __name__ == '__main__':
    unittest.main()
