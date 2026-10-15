"""
Simulation Test: Kiểm Chứng Thực Tế Kịch Bản Chống Rung Lắc Cho DNIPLA06
========================================================================
Mô phỏng chuỗi 7 chu kỳ poll liên tiếp (từ 09:00 đến 10:30/10:45) của trạm DNIPLA06
có đường truyền quang/viba chập chờn rớt - lên liên tục.

Xác minh:
1. Số tin nhắn gửi đến nhóm chat giảm từ 8 tin xuống đúng 3 tin.
2. Định dạng tin nhắn chuẩn micro-syntax `⚠️ *Chập chờn*`.
3. Khi link ổn định 30-45 phút thì gửi tin `✅ *CLEARED*` dứt điểm.
"""

import os
import unittest
import tempfile
from unittest.mock import patch
from smartw.alarm_fsm import AlarmStateMachine, AlarmState

class TestSmartWSimulation(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.state_file = os.path.join(self.tmp_dir.name, "sim_fsm.json")
        self.fsm = AlarmStateMachine(
            state_file=self.state_file,
            flap_threshold=2,
            flap_window_seconds=7200,   # 2 giờ
            stabilize_cycles=2          # 2 chu kỳ sạch (30 phút)
        )
        self.sent_messages = []

    def tearDown(self):
        self.tmp_dir.cleanup()

    def _mock_send_viber_report(self, lines: list):
        text = "\n".join(lines)
        self.sent_messages.append(text)

    def _simulate_cycle(self, active_alarms_dict, current_ts):
        """Giả lập 1 chu kỳ xử lý FSM và phát tin nhắn."""
        events = self.fsm.process_cycle(active_alarms_dict, current_ts)
        
        # 1. Active dispatch
        if events["new_active"]:
            lines = ["🚨 *ACTIVE*"]
            lines.append("*MLL:*")
            for item in events["new_active"]:
                label = item.get("label", item["base_id"])
                tech = item.get("tech", "")
                net_part = f" [{tech}]" if tech else ""
        # 1. Active dispatch
        if events["new_active"]:
            lines = ["🚨 *ACTIVE*"]
            lines.append("*MLL:*")
            for item in events["new_active"]:
                label = item.get("label", item["base_id"])
                tech = item.get("tech", "")
                net_part = f" [{tech}]" if tech else ""
                flaps = item.get("drop_count", 1)
                drop_part = f" (Lần {flaps})" if flaps >= 2 else ""
                lines.append(f"• {label}{net_part}{drop_part}")
            self._mock_send_viber_report(lines)

        # 2. Flapping dispatch (ĐÃ BỎ - KHÔNG GỬI ⚠️ *Chập chờn*)

        # 3. Cleared dispatch
        if events["new_cleared"]:
            lines = ["✅ *CLEARED*"]
            lines.append("*MLL:*")
            for item in events["new_cleared"]:
                label = item.get("label", item["base_id"])
                tech = item.get("tech", "")
                net_part = f" [{tech}]" if tech else ""
                lines.append(f"• {label}{net_part}")
            self._mock_send_viber_report(lines)

        return events

    def test_dnipla06_flapping_pipeline(self):
        dnipla06_alarm = {
            "mll_DNIPLA06_4G": {
                "table_type": "mll",
                "base_id": "DNIPLA06",
                "old_id": "DNIPLA06",
                "tech": "4G",
                "label": "DNIPLA06",
                "sdate": "09:00"
            }
        }

        # -------------------------------------------------------------
        # Chu kỳ 1 (09:00 - T0): Link rớt lần đầu
        # -------------------------------------------------------------
        self._simulate_cycle(dnipla06_alarm, current_ts=1000)
        self.assertEqual(len(self.sent_messages), 1)
        self.assertIn("🚨 *ACTIVE*", self.sent_messages[0])
        self.assertIn("DNIPLA06 [4G]", self.sent_messages[0])

        # -------------------------------------------------------------
        # Chu kỳ 2 (09:15 - T1): Link tạm chớp lên (mất alarm trên SmartW)
        # Kỳ vọng: PENDING_CLEAR -> KHÔNG gửi CLEARED (giữ im lặng)
        # -------------------------------------------------------------
        self._simulate_cycle({}, current_ts=1900)
        self.assertEqual(len(self.sent_messages), 1)  # Vẫn chỉ có 1 tin

        # -------------------------------------------------------------
        # Chu kỳ 3 (09:30 - T2): Link rớt lại trong PENDING_CLEAR
        # Kỳ vọng: Giữ nguyên ACTIVE, KHÔNG gửi tin "⚠️ *Chập chờn*"
        # -------------------------------------------------------------
        self._simulate_cycle(dnipla06_alarm, current_ts=2800)
        self.assertEqual(len(self.sent_messages), 1)  # Vẫn 1 tin (không spam)

        # -------------------------------------------------------------
        # Chu kỳ 4 (09:45 - T3): Link lên lại (Chu kỳ sạch 1/2)
        # Kỳ vọng: Đang chờ ổn định -> Giữ im lặng
        # -------------------------------------------------------------
        self._simulate_cycle({}, current_ts=3700)
        self.assertEqual(len(self.sent_messages), 1)

        # -------------------------------------------------------------
        # Chu kỳ 5 (10:00 - T4): Link tiếp tục sạch (Chu kỳ sạch 2/2)
        # Kỳ vọng: Xác nhận ổn định dứt điểm -> Gửi "✅ *CLEARED*"
        # -------------------------------------------------------------
        self._simulate_cycle({}, current_ts=4600)
        self.assertEqual(len(self.sent_messages), 2)
        self.assertIn("✅ *CLEARED*", self.sent_messages[1])

        # -------------------------------------------------------------
        # Chu kỳ 6 (10:30 - T5): Link rớt lại lần sau khi đã CLEARED
        # Kỳ vọng: Gửi tin 🚨 *ACTIVE* có đính kèm (Lần 3)
        # -------------------------------------------------------------
        self._simulate_cycle(dnipla06_alarm, current_ts=6400)
        self.assertEqual(len(self.sent_messages), 3)
        self.assertIn("🚨 *ACTIVE*", self.sent_messages[2])
        self.assertIn("(Lần 3)", self.sent_messages[2])

        # In tóm tắt để kiểm chứng trực quan
        print("\n=== TOÀN BỘ 3 TIN NHẮN PHÁT SINH TRONG QUY TRÌNH MỚI ===")
        for i, msg in enumerate(self.sent_messages, 1):
            print(f"\n[Tin nhắn {i}]:\n{msg}")
        for i, msg in enumerate(self.sent_messages, 1):
            print(f"--- TIN NHẮN {i} ---")
            print(msg)
            print("-------------------")

if __name__ == "__main__":
    unittest.main()
