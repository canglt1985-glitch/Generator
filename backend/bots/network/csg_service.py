"""
Metro CSG (Cell Site Gateway) Network Service
Connects to Cisco / Huawei CSG routers via Telnet / SSH (Netmiko) to query port status, optics, ping, and environment.
"""
import os
import re
import json
import logging
import asyncio
import platform
import subprocess
from typing import Dict, Any, Optional, List

from netmiko import ConnectHandler
from bots.core.config import get_csg_credentials

logger = logging.getLogger("tvt3_bot.csg")

NETWORK_DIR = os.path.dirname(os.path.abspath(__file__))
BOTS_DIR = os.path.dirname(NETWORK_DIR)
DATA_DIR = os.path.join(BOTS_DIR, "data")
CSG_MAPPING_FILE = os.path.join(DATA_DIR, "csg_device_mapping.json")

CSG_MAP: Dict[str, Any] = {}
_CSG_MAP_MTIME = 0.0


def load_csg_mapping() -> Dict[str, Any]:
    global CSG_MAP, _CSG_MAP_MTIME
    try:
        if os.path.exists(CSG_MAPPING_FILE):
            mtime = os.path.getmtime(CSG_MAPPING_FILE)
            if mtime != _CSG_MAP_MTIME:
                with open(CSG_MAPPING_FILE, "r", encoding="utf-8") as f:
                    CSG_MAP = json.load(f)
                _CSG_MAP_MTIME = mtime
                logger.info(f"Loaded {len(CSG_MAP)} CSG device mappings.")
    except Exception as e:
        logger.error(f"Error loading csg_device_mapping.json: {e}")
    return CSG_MAP


load_csg_mapping()


def auto_update_device_model(device_name: str, new_model: str):
    try:
        if os.path.exists(CSG_MAPPING_FILE):
            with open(CSG_MAPPING_FILE, "r", encoding="utf-8") as f:
                mapping = json.load(f)

            if device_name in mapping and mapping[device_name].get("model") != new_model:
                mapping[device_name]["model"] = new_model
                mapping[device_name]["device_type"] = "cisco_xr" if new_model == "NCS540" else "cisco_ios_telnet"
                with open(CSG_MAPPING_FILE, "w", encoding="utf-8") as f:
                    json.dump(mapping, f, indent=4, ensure_ascii=False)
                logger.info(f"⚡ Auto updated model for {device_name} -> {new_model}")
    except Exception as e:
        logger.error(f"Error updating device model: {e}")


def format_rate(rate_bps_str: str) -> str:
    try:
        bps = int(rate_bps_str)
        if bps >= 1_000_000:
            return f"{bps / 1_000_000:.2f} Mbps"
        elif bps >= 1_000:
            return f"{bps / 1_000:.1f} Kbps"
        return f"{bps} bps"
    except Exception:
        return rate_bps_str


def format_single_interface_mobile(raw_output: str, device_name: str, port_name: str, trx_output: str = "") -> str:
    if not raw_output or "% error" in raw_output.lower() or "lỗi kết nối" in raw_output.lower():
        return raw_output

    status_match = re.search(r'([A-Za-z0-9\/\-\.]+)\s+is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?),\s+line protocol is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)', raw_output)
    if status_match:
        port_full = status_match.group(1)
        link_stat = status_match.group(2).strip().lower()
        proto_stat = status_match.group(3).strip().lower()
        if link_stat == "up" and proto_stat == "up":
            status_str = "🟢 UP / UP (Đang hoạt động)"
        else:
            status_str = f"🔴 {link_stat.upper()} / {proto_stat.upper()}"
    else:
        port_full = port_name
        status_str = "⚪ Không xác định"

    desc_match = re.search(r'Description:\s*([^\n\r]+)', raw_output, re.IGNORECASE)
    description = desc_match.group(1).strip() if desc_match else "No Desc"

    speed_match = re.search(r'([FullHalf\-]+\s+Duplex),\s*([0-9A-Za-z]+bps)', raw_output, re.IGNORECASE)
    speed_duplex = f"{speed_match.group(1)}, {speed_match.group(2)}" if speed_match else "Auto"

    media_match = re.search(r'media type is\s*([^\n\r\,]+)', raw_output, re.IGNORECASE)
    media_type = media_match.group(1).strip() if media_match else "N/A"

    optical_str = ""
    if trx_output and "%" not in trx_output:
        rx_match = re.search(r'(?:Optical\s+)?Rx\s+Power\s*(?:[=:\s]+)\s*([\-\d\.]+)\s*(?:dBm)?', trx_output, re.IGNORECASE)
        tx_match = re.search(r'(?:Optical\s+)?Tx\s+Power\s*(?:[=:\s]+)\s*([\-\d\.]+)\s*(?:dBm)?', trx_output, re.IGNORECASE)

        if not rx_match or not tx_match:
            lines = trx_output.strip().split('\n')
            for l in lines:
                m = re.search(r'^([A-Za-z0-9\/\-\.]+)\s+([\-\d\.]+)\s+([\-\d\.]+)\s+([\-\d\.]+)\s+([\-\d\.]+)', l.strip())
                if m:
                    tx_val = m.group(4)
                    rx_val = m.group(5)
                    optical_str = f"📡 Mức quang: Rx: {rx_val} dBm | Tx: {tx_val} dBm"
                    break
        else:
            optical_str = f"📡 Mức quang: Rx: {rx_match.group(1)} dBm | Tx: {tx_match.group(1)} dBm"

    in_rate_match = re.search(r'5 minute input rate\s*(\d+)\s*bits/sec', raw_output, re.IGNORECASE)
    out_rate_match = re.search(r'5 minute output rate\s*(\d+)\s*bits/sec', raw_output, re.IGNORECASE)
    in_rate = format_rate(in_rate_match.group(1)) if in_rate_match else "0 bps"
    out_rate = format_rate(out_rate_match.group(1)) if out_rate_match else "0 bps"

    crc_match = re.search(r'(\d+)\s*CRC', raw_output, re.IGNORECASE)
    input_err_match = re.search(r'(\d+)\s*input errors', raw_output, re.IGNORECASE)
    output_err_match = re.search(r'(\d+)\s*output errors', raw_output, re.IGNORECASE)
    drops_match = re.search(r'Total output drops:\s*(\d+)', raw_output, re.IGNORECASE)

    crc_cnt = int(crc_match.group(1)) if crc_match else 0
    in_err_cnt = int(input_err_match.group(1)) if input_err_match else 0
    out_err_cnt = int(output_err_match.group(1)) if output_err_match else 0
    drops_cnt = int(drops_match.group(1)) if drops_match else 0

    health_alerts = []
    if crc_cnt > 0:
        health_alerts.append(f"⚠️ LỖI CRC ({crc_cnt:,}): Suy hao cáp/SFP!")
    if in_err_cnt > 0:
        health_alerts.append(f"⚠️ INPUT ERRORS ({in_err_cnt:,}): Lỗi ngõ vào!")
    if out_err_cnt > 0:
        health_alerts.append(f"⚠️ OUTPUT ERRORS ({out_err_cnt:,}): Lỗi ngõ ra!")
    if drops_cnt > 0:
        health_alerts.append(f"ℹ️ OUTPUT DROPS ({drops_cnt:,}): Nghẽn/tràn hàng đợi.")

    health_status = "✅ HOÀN HẢO (0 CRC, 0 Input Errors)" if not health_alerts else " ".join(health_alerts)

    msg = [
        f"📱 **TRẠM:** `{device_name.upper()}` | Cổng `{port_full}`",
        f"⚡ **Trạng thái:** {status_str}",
        f"📝 **Mô tả:** `{description}`",
        f"🔌 **Tốc độ/Media:** {speed_duplex} | {media_type}"
    ]

    if optical_str:
        msg.append(optical_str)

    msg.extend([
        f"📊 **Lưu lượng 5p:** IN: {in_rate} | OUT: {out_rate}",
        f"🩺 **CHẨN ĐOÁN:** {health_status}"
    ])
    return "\n".join(msg)


def format_port_output_mobile(raw_output: str, device_name: str) -> str:
    lines = raw_output.strip().split('\n')
    physical_up_ports = []
    down_ports_with_desc = []
    down_ports_no_desc = []

    ignored_prefixes = ("nu", "null")

    for line in lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith("Interface") or line_clean.startswith("---") or line_clean.startswith("CCC") or line_clean.startswith("RP/"):
            continue

        parts = re.split(r'\s+', line_clean, maxsplit=3)
        if len(parts) < 3:
            continue

        intf = parts[0]
        status = parts[1].lower()
        proto = parts[2].lower()
        desc = parts[3].strip() if len(parts) > 3 else "No Desc"

        if any(intf.lower().startswith(p) for p in ignored_prefixes):
            continue

        is_up = (status == "up" and proto == "up")
        has_desc = desc not in ["No Desc", "down", "admin down", "up"]

        if is_up:
            physical_up_ports.append(f"🟢 `{intf}`: {desc}")
        elif has_desc:
            down_ports_with_desc.append(f"🔴 `{intf}`: {desc}")
        else:
            down_ports_no_desc.append(f"`{intf}`")

    out = [f"📱 **TRẠM CSG:** `{device_name.upper()}`"]
    out.append(f"🟢 **CỔNG ĐANG UP ({len(physical_up_ports)}):**")
    if physical_up_ports:
        out.extend(physical_up_ports[:15])
    else:
        out.append("  (Không có cổng nào UP)")

    if down_ports_with_desc:
        out.append(f"\n🔴 **CỔNG DOWN CÓ MÔ TẢ ({len(down_ports_with_desc)}):**")
        out.extend(down_ports_with_desc[:10])

    return "\n".join(out)


class BaseCSGDevice:
    def __init__(self, device: dict):
        self.device = device
        self.connection = None

    def connect(self):
        dev_params = self.device.copy()
        dev_params.setdefault('conn_timeout', 6)
        dev_params.setdefault('auth_timeout', 6)
        dev_params.setdefault('banner_timeout', 6)
        dev_params.setdefault('fast_cli', False)
        dev_params.pop('model', None)

        try:
            connection = ConnectHandler(**dev_params)
            try:
                connection.enable()
            except Exception:
                pass
            return connection
        except Exception as e:
            err_str = str(e)
            if dev_params.get('device_type') == 'cisco_xr' and ('SSHException' in err_str or 'Authentication' in err_str or 'refused' in err_str.lower()):
                fallback_params = dev_params.copy()
                fallback_params['device_type'] = 'cisco_ios_telnet'
                try:
                    conn = ConnectHandler(**fallback_params)
                    try:
                        conn.enable()
                    except Exception:
                        pass
                    return conn
                except Exception:
                    raise
            elif dev_params.get('device_type') == 'cisco_ios_telnet' and ('refused' in err_str.lower() or 'timeout' in err_str.lower()):
                fallback_params = dev_params.copy()
                fallback_params['device_type'] = 'cisco_ios'
                try:
                    conn = ConnectHandler(**fallback_params)
                    try:
                        conn.enable()
                    except Exception:
                        pass
                    return conn
                except Exception:
                    raise
            raise

    def execute_command(self, command: str) -> str:
        if not self.connection:
            self.connection = self.connect()
        try:
            return self.connection.send_command(command, read_timeout=10)
        finally:
            self.disconnect()

    def execute_multiple_commands(self, commands: list) -> list:
        if not self.connection:
            self.connection = self.connect()
        results = []
        try:
            for cmd in commands:
                results.append(self.connection.send_command(cmd, read_timeout=10))
            return results
        finally:
            self.disconnect()

    def disconnect(self):
        if self.connection:
            try:
                self.connection.disconnect()
            except Exception:
                pass
            self.connection = None


class CSGService:
    def __init__(self):
        pass

    def _get_device_params(self, site_name: str) -> Optional[dict]:
        load_csg_mapping()
        name_upper = site_name.strip().upper()
        info = CSG_MAP.get(name_upper)
        if not info:
            for k, v in CSG_MAP.items():
                if k.startswith(name_upper) or name_upper.startswith(k):
                    info = v
                    name_upper = k
                    break

        if not info:
            return None

        creds = get_csg_credentials()
        dev = {
            "device_type": info.get("device_type", "cisco_ios_telnet"),
            "host": info.get("ip"),
            "username": creds["username"],
            "password": creds["password"],
            "model": info.get("model", "ASR901")
        }
        return dev

    def check_ports_blocking(self, site_name: str, port_name: str = None) -> str:
        site_upper = site_name.strip().upper()
        dev_params = self._get_device_params(site_upper)
        if not dev_params or not dev_params.get("host"):
            return f"❌ Không tìm thấy thông tin IP thiết bị CSG cho trạm `{site_upper}` trong danh mục."

        if not dev_params.get("username") or not dev_params.get("password"):
            return "❌ Chưa cấu hình thông tin đăng nhập CSG (`CSG_USERNAME` / `CSG_PASSWORD`)."

        client = BaseCSGDevice(dev_params)

        try:
            if port_name:
                model = dev_params.get("model", "").upper()
                is_xr = (model == "NCS540") or ("xr" in dev_params.get("device_type", ""))
                primary_trx = f"show controllers optic {port_name}" if is_xr else f"show int {port_name} transceiver"
                raw_out = client.execute_command(f"show int {port_name}")
                trx_out = ""
                try:
                    trx_out = client.execute_command(primary_trx)
                except Exception:
                    pass

                return format_single_interface_mobile(raw_out, site_upper, port_name, trx_out)
            else:
                raw_out = client.execute_command("show int des")
                return format_port_output_mobile(raw_out, site_upper)

        except Exception as e:
            return f"❌ Lỗi kết nối CSG trạm `{site_upper}` ({dev_params.get('host')}): {e}"

    def ping_blocking(self, site_name_or_ip: str) -> str:
        target = site_name_or_ip.strip()
        site_upper = target.upper()
        ip = target

        load_csg_mapping()
        if site_upper in CSG_MAP:
            ip = CSG_MAP[site_upper].get("ip", target)

        is_win = platform.system().lower() == "windows"
        ping_cmd = ["ping", "-n", "3", "-w", "1500", ip] if is_win else ["ping", "-c", "3", "-W", "2", ip]

        try:
            output = subprocess.check_output(ping_cmd, text=True, timeout=7)
            loss_match = re.search(r'\((\d+)%\s*loss\)', output, re.IGNORECASE) or re.search(r'(\d+)%\s*packet loss', output, re.IGNORECASE)
            rtt_match = re.search(r'Average\s*=\s*(\d+ms)', output, re.IGNORECASE) or re.search(r'min/avg/max/mdev\s*=\s*[\d\.]+/([\d\.]+)/', output)

            loss_str = loss_match.group(1) if loss_match else ("0" if "ttl=" in output.lower() else "100")
            rtt_str = rtt_match.group(1) if rtt_match else "N/A"

            if loss_str == "0":
                status_icon = "🟢 ONLINE (Thông suốt)"
            elif int(loss_str) < 100:
                status_icon = f"🟡 CHẬP CHỜN (Mất gói {loss_str}%)"
            else:
                status_icon = "🔴 OFFLINE (Mất Ping / Cắt Cáp)"

            return (
                f"📱 **TRẠM / IP:** `{site_upper}` (`{ip}`)\n"
                f"📡 **Trạng thái:** {status_icon}\n"
                f"⏱️ **Độ trễ:** {rtt_str}\n"
                f"📊 **Tỷ lệ rớt gói:** {loss_str}%"
            )
        except Exception as e:
            return f"❌ Ping tới `{site_upper}` (`{ip}`) thất bại: {e}"

    async def check_ports_async(self, site_name: str, port_name: str = None) -> str:
        return await asyncio.to_thread(self.check_ports_blocking, site_name, port_name)

    async def ping_async(self, site_name_or_ip: str) -> str:
        return await asyncio.to_thread(self.ping_blocking, site_name_or_ip)


csg_service = CSGService()
