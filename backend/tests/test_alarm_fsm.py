import os
import tempfile
import unittest
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

        # T2 (09:30): Rớt lại lần 2 trong vòng 2h -> Chuyển FLAPPING, Phát ⚠️ Chập chờn
        e2 = self.fsm.process_cycle(alarm_payload, current_ts=2800)
        self.assertEqual(len(e2["new_active"]), 0)
        self.assertEqual(len(e2["new_flapping"]), 1)
        self.assertEqual(e2["new_flapping"][0]["flaps_count"], 2)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.FLAPPING)

        # T3 (09:45): Link lại chập chờn lên -> Đang FLAPPING, KHÔNG phát CLEARED
        e3 = self.fsm.process_cycle({}, current_ts=3700)
        self.assertEqual(len(e3["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.FLAPPING)

        # T4 (10:00): Link rớt lại lần 3 -> Đang FLAPPING, DẬP 100% THÔNG BÁO (IM LẶNG)
        e4 = self.fsm.process_cycle(alarm_payload, current_ts=4600)
        self.assertEqual(len(e4["new_active"]), 0)
        self.assertEqual(len(e4["new_flapping"]), 0)
        self.assertEqual(len(e4["new_cleared"]), 0)
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.FLAPPING)

        # T5 (10:15): Bắt đầu chu kỳ sạch 1
        e5 = self.fsm.process_cycle({}, current_ts=5500)
        self.assertEqual(len(e5["new_cleared"]), 0)

        # T6 (10:30): Chu kỳ sạch 2 -> Link đã ổn định bền vững -> Phát ✅ CLEARED dứt điểm!
        e6 = self.fsm.process_cycle({}, current_ts=6400)
        self.assertEqual(len(e6["new_cleared"]), 1)
        self.assertTrue(e6["new_cleared"][0].get("was_flapping"))
        self.assertEqual(self.fsm.states[site_key]["state"], AlarmState.NORMAL)

if __name__ == "__main__":
    unittest.main()
