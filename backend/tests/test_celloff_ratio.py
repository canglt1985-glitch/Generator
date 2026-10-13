import unittest
import os
import sys
import json

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


class TestCellOffRatioAndTag(unittest.TestCase):
    def setUp(self):
        cell_count_path = os.path.join(BACKEND_DIR, 'data', 'site_cell_count.json')
        with open(cell_count_path, 'r', encoding='utf-8') as f:
            self.cell_counts = json.load(f)

    def test_total_cell_counts_reference(self):
        """Kiểm tra tổng số cell đã cấu hình đúng thực tế (tính cả multi-carrier)."""
        # DNIXDI10: 3G có 6 cell (2 carrier 3F + 3G across 3 sectors)
        self.assertEqual(self.cell_counts.get("DNIXDI10", {}).get("3G"), 6)
        self.assertEqual(self.cell_counts.get("DNIXDI10", {}).get("4G"), 3)

        # DNILNA04: 3G có 3 cell, 4G có 4 cell
        self.assertEqual(self.cell_counts.get("DNILNA04", {}).get("3G"), 3)
        self.assertEqual(self.cell_counts.get("DNILNA04", {}).get("4G"), 4)

        # DNICMYAP: trạm CAX có 2 cell 3G
        self.assertEqual(self.cell_counts.get("DNICMYAP", {}).get("3G"), 2)

    def test_cell_off_format_cach_a(self):
        """Kiểm tra định dạng tin nhắn sao chép CELL OFF theo chuẩn Cách A:
        • {newId}{oldStr} [{techTag}] ({x}/{y}) - {dateStr}
        Hoàn toàn bỏ 'sector C', bỏ dấu hai chấm, đồng bộ form MLL.
        """
        def format_celloff(site, old_id, tech_tag, off_count, total_count, date_str):
            old_str = f" ({old_id})" if old_id and old_id != site else ""
            ratio_str = f" ({off_count}/{total_count})" if total_count else f" ({off_count}/)"
            return f"• {site}{old_str} [{tech_tag}]{ratio_str} - {date_str}"

        # 1. Trạm CAX 2 cell (rớt 1/2)
        line1 = format_celloff("DNICMYAP", "", "3G", 1, 2, "08/10 09:49")
        self.assertEqual(line1, "• DNICMYAP [3G] (1/2) - 08/10 09:49")

        # 2. Trạm 1 carrier (rớt 1/3)
        line2 = format_celloff("DNTN34", "", "4G", 1, 3, "12/10 12:41")
        self.assertEqual(line2, "• DNTN34 [4G] (1/3) - 12/10 12:41")

        # 3. Trạm có mã cũ
        line3 = format_celloff("DNIDQU02", "DNDQ11", "4G", 1, 3, "12/10 17:23")
        self.assertEqual(line3, "• DNIDQU02 (DNDQ11) [4G] (1/3) - 12/10 17:23")

        # 4. Trạm 2 carrier rớt 2 cell (2/6)
        line4 = format_celloff("DNIXDI10", "", "3G", 2, 6, "13/10 07:58")
        self.assertEqual(line4, "• DNIXDI10 [3G] (2/6) - 13/10 07:58")

        # 5. Trạm SRAN gom cả 3G và 4G -> nhãn [3G4G] và tỉ lệ 2/6
        line5 = format_celloff("DNTN34", "", "3G4G", 2, 6, "12/10 12:41")
        self.assertEqual(line5, "• DNTN34 [3G4G] (2/6) - 12/10 12:41")

        # 6. Trạm khuyết tổng cell -> hiển thị (3/)
        line6 = format_celloff("DNIXLO17L", "", "4G", 3, None, "13/10 07:59")
        self.assertEqual(line6, "• DNIXLO17L [4G] (3/) - 13/10 07:59")

    def test_promotion_when_x_equals_y(self):
        """Khi rớt x >= y (toàn bộ cell), hệ thống tự thăng hạng thành MLL Trạm."""
        def should_promote_to_mll(off_count, total_count):
            return total_count is not None and total_count > 0 and off_count >= total_count

        # DNILNA04 (3/3) -> Thăng hạng MLL Trạm
        self.assertTrue(should_promote_to_mll(3, 3))

        # DNIXDI10 (6/6) -> Thăng hạng MLL Trạm
        self.assertTrue(should_promote_to_mll(6, 6))

        # DNIXDI10 (2/6) -> Không thăng hạng, vẫn ở Cell Off
        self.assertFalse(should_promote_to_mll(2, 6))

        # DNTN34 (1/3) -> Không thăng hạng, vẫn ở Cell Off
        self.assertFalse(should_promote_to_mll(1, 3))


if __name__ == "__main__":
    unittest.main()
