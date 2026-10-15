import os
import sys
import tempfile
import unittest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from smartw.alarm_fsm import AlarmStateMachine, AlarmState

class TestAlarmStateMachine(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.state_file = os.path.join(self.tmp_dir.name, "test_fsm.json")
        self.fsm = AlarmStateMachine(
            state_file=self.state_file,
            flap_threshold=2,
            flap_window_seconds=7200,   # 2 hours
            stabilize_cycles=2          # 2 clean cycles
        )

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_single_normal_outage_and_recovery(self):
        """Trạm rớt mạng 1 lần bình thường, sau đó khôi phục ổn định."""
        site_key = "mll_DNDQ01_4G"
        alarm_payload = {
            site_key: {
                "table_type": "mll",
                "base_id": "DNDQ01",
                "old_id": "DNDQ01",
                "tech": "4G",
                "label": "DNDQ01 - Định Quán 1",
                "sdate": "09:00"
            }
        }

        # Chu kỳ 1 (09:00): Trạm rớt lần đầu -> Phát ACTIVE
        events = self.fsm.process_cycle(alarm_payload, current_ts=1000)
        self.assertEqual(len(events["new_active"]), 1)
        self.assertEqual(events["new_active"][0]["key"], site_key)
        self.assertEqual(len(events["new_flapping"]), 0)
        self.assertEqual(len(events["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.ACTIVE)

        # Chu kỳ 2 (09:15): Trạm vẫn rớt -> Không phát thêm tin
        events = self.fsm.process_cycle(alarm_payload, current_ts=1900)
        self.assertEqual(len(events["new_active"]), 0)
        self.assertEqual(len(events["new_flapping"]), 0)
        self.assertEqual(len(events["new_cleared"]), 0)

        # Chu kỳ 3 (09:30): Mất alarm trên SmartW -> PENDING_CLEAR, KHÔNG vội phát CLEARED!
        events = self.fsm.process_cycle({}, current_ts=2800)
        self.assertEqual(len(events["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.PENDING_CLEAR)

        # Chu kỳ 4 (09:45): Chu kỳ sạch thứ 2 -> Xác nhận sạch hoàn toàn, phát CLEARED!
        events = self.fsm.process_cycle({}, current_ts=3700)
        self.assertEqual(len(events["new_cleared"]), 1)
        self.assertEqual(events["new_cleared"][0]["key"], site_key)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.NORMAL)

    def test_flapping_site_dnipla06_suppression(self):
        """Mô phỏng trạm DNIPLA06 bị rung lắc link truyền dẫn liên tục."""
        site_key = "mll_DNIPLA06_4G"
        alarm_payload = {
            site_key: {
                "table_type": "mll",
                "base_id": "DNIPLA06",
                "old_id": "DNIPLA06",
                "tech": "4G",
                "label": "DNIPLA06 - Phú Lâm 6",
                "sdate": "09:00"
            }
        }

        # T0 (09:00): Rớt lần 1 -> Phát 🚨 ACTIVE
        e0 = self.fsm.process_cycle(alarm_payload, current_ts=1000)
        self.assertEqual(len(e0["new_active"]), 1)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.ACTIVE)

        # T1 (09:15): Link tạm lên (mất alarm) -> PENDING_CLEAR, KHÔNG phát CLEARED
        e1 = self.fsm.process_cycle({}, current_ts=1900)
        self.assertEqual(len(e1["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.PENDING_CLEAR)

        # T2 (09:30): Rớt lại trong lúc PENDING_CLEAR (chưa từng phát CLEARED)
        # -> Giữ nguyên ACTIVE, không spam tin trùng, không phát ⚠️ Chập chờn
        e2 = self.fsm.process_cycle(alarm_payload, current_ts=2800)
        self.assertEqual(len(e2["new_active"]), 0)
        self.assertEqual(len(e2["new_flapping"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.ACTIVE)

        # T3 (09:45): Bắt đầu chu kỳ sạch 1 -> Chuyển PENDING_CLEAR
        e3 = self.fsm.process_cycle({}, current_ts=3700)
        self.assertEqual(len(e3["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.PENDING_CLEAR)

        # T4 (10:00): Chu kỳ sạch 2 -> Link đã ổn định bền vững -> Phát ✅ CLEARED dứt điểm!
        e4 = self.fsm.process_cycle({}, current_ts=4600)
        self.assertEqual(len(e4["new_cleared"]), 1)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.NORMAL)

        # T5 (10:30): Rớt lại lần 3 sau khi đã CLEARED (từ NORMAL) -> Phát 🚨 ACTIVE với drop_count = 3
        e5 = self.fsm.process_cycle(alarm_payload, current_ts=6400)
        self.assertEqual(len(e5["new_active"]), 1)
        self.assertEqual(len(e5["new_flapping"]), 0)
        self.assertEqual(e5["new_active"][0]["drop_count"], 3)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.ACTIVE)

if __name__ == "__main__":
    unittest.main()
