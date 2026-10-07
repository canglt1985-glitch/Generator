"""
Alarm Finite State Machine (FSM) with Flapping Detection & Hysteresis
====================================================================
Quản lý vòng đời cảnh báo MĐ, MPĐ, MLL của SmartW.
Khắc phục triệt để tình trạng link truyền dẫn rung lắc / chập chờn (như trạm DNIPLA06)
bị bắn lặp thông báo ACTIVE / CLEARED liên tục gây nhiễu nhóm chat.

Định danh khóa quản lý: (table_type, base_site_id, tech)
Ví dụ: "mll_DNIPLA06_4G", "md_DNDQ01_ALL"

4 Trạng thái:
  - NORMAL: Trạm hoạt động bình thường, không có cảnh báo.
  - ACTIVE: Xuất hiện sự cố đơn lẻ lần đầu (phát cảnh báo 🚨 ACTIVE).
  - PENDING_CLEAR: SmartW không còn cảnh báo, đang trong thời gian chờ xác thực ổn định.
  - FLAPPING: Trạm bị rớt lại >= flap_threshold lần trong vòng flap_window_seconds (phát ⚠️ *Chập chờn*).
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger("smartw_alarm_fsm")

class AlarmState:
    NORMAL = "NORMAL"
    ACTIVE = "ACTIVE"
    PENDING_CLEAR = "PENDING_CLEAR"
    FLAPPING = "FLAPPING"


class AlarmStateMachine:
    def __init__(
        self,
        state_file: str,
        flap_threshold: int = 2,
        flap_window_seconds: int = 7200,          # 2 giờ
        stabilize_cycles: int = 2,                # 2 chu kỳ sạch liên tiếp (30 phút) để khôi phục
        purge_after_seconds: int = 86400          # Tự động dọn dẹp key sau 24h không hoạt động
    ):
        self.state_file = state_file
        self.flap_threshold = flap_threshold
        self.flap_window_seconds = flap_window_seconds
        self.stabilize_cycles = stabilize_cycles
        self.purge_after_seconds = purge_after_seconds
        self.states: Dict[str, Dict[str, Any]] = {}
        self._load_states()

    def _load_states(self):
        """Đọc trạng thái FSM từ file JSON cục bộ."""
        if not os.path.exists(self.state_file):
            self.states = {}
            return

        try:
            with open(self.state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    self.states = data.get("states", {})
                else:
                    self.states = {}
        except Exception as e:
            logger.warning(f"AlarmFSM: Không thể đọc file state ({e}), khởi tạo bộ nhớ mới.")
            self.states = {}

    def _save_states(self):
        """Lưu trạng thái FSM ra file JSON an toàn."""
        os.makedirs(os.path.dirname(os.path.abspath(self.state_file)), exist_ok=True)
        tmp_file = f"{self.state_file}.tmp"
        try:
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "updated_at": datetime.now().isoformat(),
                    "total_tracked": len(self.states),
                    "states": self.states
                }, f, ensure_ascii=False, indent=2)
            os.replace(tmp_file, self.state_file)
        except Exception as e:
            logger.error(f"AlarmFSM: Lỗi khi lưu file state ({e})")
            if os.path.exists(tmp_file):
                try:
                    os.remove(tmp_file)
                except Exception:
                    pass

    def _purge_old_entries(self, current_ts: float):
        """Dọn dẹp các trạm ở trạng thái NORMAL đã quá 24h không có biến động."""
        keys_to_delete = []
        for key, entry in self.states.items():
            state = entry.get("state")
            last_change = entry.get("last_state_change", 0)
            if state == AlarmState.NORMAL and (current_ts - last_change) > self.purge_after_seconds:
                keys_to_delete.append(key)
        
        for k in keys_to_delete:
            del self.states[k]
        
        if keys_to_delete:
            logger.info(f"AlarmFSM: Đã purge {len(keys_to_delete)} key NORMAL cũ (>24h).")

    def process_cycle(
        self,
        active_items_by_key: Dict[str, Dict[str, Any]],
        current_ts: Optional[float] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Xử lý 1 chu kỳ cào SmartW (chạy mỗi 15 phút).
        
        Args:
            active_items_by_key: Dict chứa các alarm hiện đang có trên SmartW:
                key -> {
                    "table_type": str,   # 'mll', 'md', 'mpd'
                    "base_id": str,      # Mã trạm chuẩn (VD: 'DNIPLA06' hoặc 'DNTN55')
                    "old_id": str,       # Mã trạm cũ
                    "tech": str,         # '4G', '3G', '2G', '5G'
                    "alarm": dict,       # Bản ghi alarm thô từ SmartW
                    "label": str,        # Tên trạm hiển thị (VD: 'DNDQ01 - DNDQ01')
                    "sdate": str,        # Thời điểm bắt đầu sự cố
                    "topology_tag": str  # Tag truyền dẫn (nếu có)
                }
            current_ts: Timestamp hiện tại (mặc định lấy time()).
            
        Returns:
            events = {
                "new_active": [ ... ],     # Danh sách cần phát 🚨 ACTIVE
                "new_flapping": [ ... ],   # Danh sách cần phát ⚠️ *Chập chờn*
                "new_cleared": [ ... ]     # Danh sách cần phát ✅ CLEARED
            }
        """
        if current_ts is None:
            current_ts = datetime.now().timestamp()

        # Dọn dẹp bản ghi cũ
        self._purge_old_entries(current_ts)

        events = {
            "new_active": [],
            "new_flapping": [],
            "new_cleared": []
        }

        all_keys = set(self.states.keys()).union(set(active_items_by_key.keys()))

        for key in all_keys:
            is_active = key in active_items_by_key
            active_info = active_items_by_key.get(key)
            entry = self.states.get(key)

            if entry is None and not is_active:
                continue

            # Khởi tạo entry mới nếu chưa từng có
            if entry is None:
                table_type = active_info.get("table_type", "unknown")
                base_id = active_info.get("base_id", "unknown")
                tech = active_info.get("tech", "")
                entry = {
                    "key": key,
                    "table_type": table_type,
                    "base_id": base_id,
                    "old_id": active_info.get("old_id", ""),
                    "tech": tech,
                    "state": AlarmState.NORMAL,
                    "drop_history": [],
                    "clean_cycles": 0,
                    "last_alarm": None,
                    "last_active_info": None,
                    "last_seen_ts": 0,
                    "last_state_change": current_ts,
                    "flapping_alert_sent": False
                }
                self.states[key] = entry

            # Luôn cập nhật thông tin metadata mới nhất nếu có
            if active_info:
                entry["last_active_info"] = active_info
                entry["last_alarm"] = active_info.get("alarm")
                entry["label"] = active_info.get("label", entry.get("label", ""))

            # Lọc drop_history: chỉ giữ các mốc rớt trong khoảng 2 giờ (flap_window_seconds)
            drop_history = [t for t in entry.get("drop_history", []) if (current_ts - t) <= self.flap_window_seconds]
            entry["drop_history"] = drop_history

            state = entry.get("state", AlarmState.NORMAL)

            # =========================================================================
            # CASE A: TRẠM ĐANG BỊ LỖI TRONG CHU KỲ HIỆN TẠI (is_active == True)
            # =========================================================================
            if is_active:
                entry["last_seen_ts"] = current_ts
                entry["clean_cycles"] = 0  # Đang có lỗi thì reset số chu kỳ sạch về 0

                if state == AlarmState.NORMAL:
                    # Lần đầu tiên rớt mạng (hoặc đã bình thường rất lâu)
                    entry["drop_history"].append(current_ts)
                    flaps = len(entry["drop_history"])

                    if flaps >= self.flap_threshold:
                        # Vừa rớt lại đã chạm ngưỡng chập chờn
                        entry["state"] = AlarmState.FLAPPING
                        entry["last_state_change"] = current_ts
                        entry["flapping_alert_sent"] = True
                        events["new_flapping"].append({
                            **entry,
                            "flaps_count": flaps,
                            "active_info": active_info
                        })
                        logger.info(f"AlarmFSM: ⚠️ {key} chuyển sang FLAPPING ({flaps} lần/2h)")
                    else:
                        # Sự cố mới bình thường
                        entry["state"] = AlarmState.ACTIVE
                        entry["last_state_change"] = current_ts
                        entry["flapping_alert_sent"] = False
                        events["new_active"].append({
                            **entry,
                            "active_info": active_info
                        })
                        logger.info(f"AlarmFSM: 🚨 {key} chuyển sang ACTIVE (Lần 1)")

                elif state == AlarmState.PENDING_CLEAR:
                    # Đang trong thời gian chờ xác minh hết lỗi thì BỊ RỚT LẠI NGAY!
                    entry["drop_history"].append(current_ts)
                    flaps = len(entry["drop_history"])

                    if flaps >= self.flap_threshold:
                        # Xác định chính xác là trạm đang rung lắc!
                        entry["state"] = AlarmState.FLAPPING
                        entry["last_state_change"] = current_ts
                        if not entry.get("flapping_alert_sent"):
                            entry["flapping_alert_sent"] = True
                            events["new_flapping"].append({
                                **entry,
                                "flaps_count": flaps,
                                "active_info": active_info
                            })
                            logger.info(f"AlarmFSM: ⚠️ {key} từ PENDING_CLEAR chuyển sang FLAPPING ({flaps} lần/2h)")
                    else:
                        # Trở lại ACTIVE mà không spam thêm tin mới (nhóm chat đã biết trạm đang lỗi)
                        entry["state"] = AlarmState.ACTIVE
                        entry["last_state_change"] = current_ts
                        logger.info(f"AlarmFSM: 🔄 {key} rớt lại trong thời gian chờ, giữ nguyên ACTIVE")

                elif state == AlarmState.FLAPPING:
                    # Đang trong chế độ rung lắc mà bị rớt tiếp
                    # Ghi nhận mốc rớt, nhưng DẬP 100% THÔNG BÁO (Noise Suppression)
                    entry["drop_history"].append(current_ts)
                    logger.debug(f"AlarmFSM: 🔇 {key} đang FLAPPING, dập tin cảnh báo.")

                elif state == AlarmState.ACTIVE:
                    # Sự cố kéo dài liên tục từ chu kỳ trước
                    # Không cần gửi thêm tin ACTIVE lặp lại
                    pass

            # =========================================================================
            # CASE B: TRẠM ĐÃ MẤT ALARM TRÊN SMARTW (is_active == False)
            # =========================================================================
            else:
                if state == AlarmState.NORMAL:
                    # Trạm vốn dĩ bình thường, tiếp tục bình thường
                    pass

                elif state == AlarmState.ACTIVE:
                    # Mới mất alarm lần đầu tiên!
                    # QUAN TRỌNG: KHÔNG BẮN CLEARED NGAY! Đưa vào PENDING_CLEAR chờ xác minh
                    entry["state"] = AlarmState.PENDING_CLEAR
                    entry["clean_cycles"] = 1
                    entry["last_state_change"] = current_ts
                    logger.info(f"AlarmFSM: ⏳ {key} mất alarm, chuyển sang PENDING_CLEAR (Chu kỳ sạch 1/{self.stabilize_cycles})")

                elif state == AlarmState.PENDING_CLEAR:
                    # Chu kỳ tiếp theo vẫn sạch alarm
                    entry["clean_cycles"] = entry.get("clean_cycles", 0) + 1
                    clean_count = entry["clean_cycles"]
                    logger.info(f"AlarmFSM: ⏳ {key} duy trì sạch chu kỳ {clean_count}/{self.stabilize_cycles}")

                    if clean_count >= self.stabilize_cycles:
                        # Đã duy trì sạch liên tục đủ số chu kỳ (mặc định 30 phút)!
                        # Xác nhận hết lỗi thực sự và gửi CLEARED dứt điểm
                        entry["state"] = AlarmState.NORMAL
                        entry["last_state_change"] = current_ts
                        entry["flapping_alert_sent"] = False
                        events["new_cleared"].append({
                            **entry,
                            "active_info": entry.get("last_active_info")
                        })
                        logger.info(f"AlarmFSM: ✅ {key} đã ổn định bền vững, chuyển sang NORMAL và phát CLEARED")

                elif state == AlarmState.FLAPPING:
                    # Đang ở chế độ chập chờn mà SmartW thấy sạch alarm
                    # Bắt đầu đếm chu kỳ ổn định
                    entry["clean_cycles"] = entry.get("clean_cycles", 0) + 1
                    clean_count = entry["clean_cycles"]
                    logger.info(f"AlarmFSM: ⏳ {key} (FLAPPING) đang chờ ổn định chu kỳ {clean_count}/{self.stabilize_cycles}")

                    if clean_count >= self.stabilize_cycles:
                        # Link đã hoàn toàn hết rung lắc và ổn định liên tục!
                        entry["state"] = AlarmState.NORMAL
                        entry["last_state_change"] = current_ts
                        entry["flapping_alert_sent"] = False
                        entry["drop_history"] = []  # Reset lịch sử rung lắc
                        events["new_cleared"].append({
                            **entry,
                            "active_info": entry.get("last_active_info"),
                            "was_flapping": True
                        })
                        logger.info(f"AlarmFSM: ✅ {key} đã hết rung lắc hoàn toàn sau {clean_count} chu kỳ sạch!")

        # Lưu lại trạng thái sau mỗi chu kỳ
        self._save_states()

        return events
