import unittest
import os
import sys
import tempfile

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from smartw.scraper import extract_cell_sector
from smartw.alarm_fsm import AlarmStateMachine, AlarmState


class TestSectorPromotionAndFlapping(unittest.TestCase):
    def test_extract_cell_sector(self):
        # 4G sectors
        self.assertEqual(extract_cell_sector("DNICMY09CM4CA", "DNICMY09"), "A")
        self.assertEqual(extract_cell_sector("DNICMY09CM4CB", "DNICMY09"), "B")
        self.assertEqual(extract_cell_sector("DNICMY09CM4CC", "DNICMY09"), "C")
        self.assertEqual(extract_cell_sector("DNCM25CM4CD", "DNCM25"), "D")

        # Strip tech suffix (L, UL, N)
        self.assertEqual(extract_cell_sector("DNICMY09CM4CAL", "DNICMY09"), "A")
        self.assertEqual(extract_cell_sector("DNDQ11CM4B_UL", "DNDQ11"), "B")
        self.assertEqual(extract_cell_sector("DN5G01N5A", "DN5G01"), "A")

        # 3G / 2G formats
        self.assertEqual(extract_cell_sector("DNCM01_A", "DNCM01"), "A")
        self.assertEqual(extract_cell_sector("DNCM01-B", "DNCM01"), "B")

    def test_fsm_immediate_clear_when_stabilize_cycles_1(self):
        """Khi stabilize_cycles = 1, trạm sạch alarm sẽ được CLEARED ngay, không giữ lại."""
        tmp = tempfile.NamedTemporaryFile(delete=False)
        tmp.close()
        try:
            fsm = AlarmStateMachine(
                state_file=tmp.name,
                flap_threshold=2,
                flap_window_seconds=7200,
                stabilize_cycles=1  # 1 cycle = immediate clear
            )
            site_key = "mll_DNCM25_4G"
            alarm_payload = {
                site_key: {
                    "table_type": "mll",
                    "base_id": "DNCM25",
                    "tech": "4G",
                    "sdate": "17:23"
                }
            }

            # Cycle 1: Alarm drops -> ACTIVE
            ev1 = fsm.process_cycle(alarm_payload, current_ts=1000)
            self.assertEqual(len(ev1["new_active"]), 1)
            self.assertEqual(fsm.states[site_key]["state"], AlarmState.ACTIVE)

            # Cycle 2: Alarm cleared in SmartW -> immediately NORMAL, not PENDING_CLEAR
            ev2 = fsm.process_cycle({}, current_ts=1900)
            self.assertEqual(len(ev2["new_cleared"]), 1)
            self.assertEqual(fsm.states[site_key]["state"], AlarmState.NORMAL)
        finally:
            if os.path.exists(tmp.name):
                os.remove(tmp.name)

    def test_message_formatting_contract(self):
        """Kiểm tra format tin nhắn chuẩn theo yêu cầu:
        Lần 1: • DNCM25 [4G] - 12/10 17:23
        Lần 2: • DNCM25 [4G] - 12/10 17:23 (Lần 2)
        """
        def format_line(new_id, old_id, net, sdate, drop_count):
            old_str = f" ({old_id})" if old_id and old_id != new_id else ""
            net_str = f" [{net}]" if net else ""
            count_suffix = f" (Lần {drop_count})" if drop_count >= 2 else ""
            return f"• {new_id}{old_str}{net_str} - {sdate}{countSuffix}" if 'countSuffix' in locals() else f"• {new_id}{old_str}{net_str} - {sdate}{count_suffix}"

        line_drop_1 = format_line("DNCM25", "", "4G", "12/10 17:23", 1)
        self.assertEqual(line_drop_1, "• DNCM25 [4G] - 12/10 17:23")

        line_drop_2 = format_line("DNCM25", "", "4G", "12/10 17:23", 2)
        self.assertEqual(line_drop_2, "• DNCM25 [4G] - 12/10 17:23 (Lần 2)")

        line_drop_3 = format_line("DNIDQU02", "DNDQ11", "4G", "12/10 17:23", 3)
        self.assertEqual(line_drop_3, "• DNIDQU02 (DNDQ11) [4G] - 12/10 17:23 (Lần 3)")


if __name__ == "__main__":
    unittest.main()
