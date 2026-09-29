import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, '.env'))
if not os.getenv("VITE_SUPABASE_URL"):
    parent_dir = os.path.dirname(current_dir)
    load_dotenv(os.path.join(parent_dir, 'tvt3_v2', '.env'))

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase credentials in environment variables.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def format_power(val):
    if val is None or val == "":
        return ""
    try:
        f = float(val)
        return f"{int(f)}" if f.is_integer() else f"{f}"
    except:
        return str(val)

def generate_mobile_equipment_report_text(sb: Client = None) -> str:
    """Generate the concise daily mobile equipment report text."""
    if sb is None:
        sb = get_supabase_client()

    # Query stations to map to old site IDs
    res_sites = sb.table("datasites").select("site_id, site_id_old").execute()
    sites = res_sites.data or []

    def get_site_ids(site_id):
        if not site_id:
            return {"oldId": "—", "newId": "KHO"}
        s_id = str(site_id).strip().upper()
        if s_id == "KHO":
            return {"oldId": "—", "newId": "KHO"}
        for st in sites:
            s_new = (st.get("site_id") or "").strip().upper()
            s_old = (st.get("site_id_old") or "").strip().upper()
            if s_new == s_id or s_old == s_id:
                return {
                    "oldId": st.get("site_id_old") or st.get("site_id") or "—",
                    "newId": st.get("site_id") or "—"
                }
        return {"oldId": site_id, "newId": site_id}

    def get_equip_location_label(loc):
        if not loc or loc == "KHO":
            return "KHO TVT3"
        info = get_site_ids(loc)
        if info.get("oldId") and info["oldId"] != "—":
            return info["oldId"]
        return loc

    # Query mobile equipment
    res_eq = sb.table("mobile_equipment").select("*").execute()
    equipments = res_eq.data or []

    mpds = [e for e in equipments if "MPĐ" in (e.get("type") or "").upper() or "MPD" in (e.get("equipment_code") or "")]
    pins = [e for e in equipments if "PIN" in (e.get("type") or "").upper() or "PIN" in (e.get("equipment_code") or "")]

    mpd_at_sites = [e for e in mpds if e.get("status") != "Hư" and e.get("current_location") and e.get("current_location") != "KHO"]
    mpd_at_kho = [e for e in mpds if e.get("status") != "Hư" and (not e.get("current_location") or e.get("current_location") == "KHO")]

    pin_at_sites = [e for e in pins if e.get("status") != "Hư" and e.get("current_location") and e.get("current_location") != "KHO"]
    pin_at_kho = [e for e in pins if e.get("status") != "Hư" and (not e.get("current_location") or e.get("current_location") == "KHO")]

    text = "⚡ VỊ TRÍ MPĐ & PIN LƯU ĐỘNG TVT3:\n\n"

    # 1. MPD at stations
    text += f"1️⃣ MPĐ ĐANG ỨNG TRỰC TẠI TRẠM ({len(mpd_at_sites)} máy):\n"
    if mpd_at_sites:
        sorted_mpd_sites = sorted(mpd_at_sites, key=lambda m: get_equip_location_label(m.get("current_location")))
        for m in sorted_mpd_sites:
            site_id = get_equip_location_label(m.get("current_location"))
            brand = m.get("brand") or ((m.get("specifications") or "").split("(")[0].strip() or "MPĐ")
            power_val = format_power(m.get("power_kva"))
            power = f"{power_val} kVA" if power_val else ""
            fuel = m.get("fuel_type") or "Xăng"
            spec_str = " - ".join([x for x in [brand, power] if x])
            text += f" • {site_id} ({spec_str} • {fuel})\n"
    else:
        text += " • Không có máy nào ở trạm\n"

    # 2. MPD at Kho TVT3
    text += f"\n2️⃣ MPĐ DỰ PHÒNG TẠI KHO TVT3 ({len(mpd_at_kho)} máy sẵn sàng):\n"
    if mpd_at_kho:
        sorted_mpd_kho = sorted(mpd_at_kho, key=lambda m: m.get("equipment_code") or "")
        text += " • " + ", ".join([m.get("equipment_code") for m in sorted_mpd_kho]) + "\n"
    else:
        text += " • Đã điều động hết ra trạm\n"

    # 3. Pin lưu động
    if pins:
        text += f"\n3️⃣ PIN LƯU ĐỘNG ({len(pins)} bộ):\n"
        if pin_at_sites:
            text += f" • Tại Trạm ({len(pin_at_sites)} bộ): " + ", ".join([get_equip_location_label(p.get("current_location")) for p in pin_at_sites]) + "\n"
        if pin_at_kho:
            text += f" • Tại Kho ({len(pin_at_kho)} bộ): " + ", ".join([(p.get("equipment_code") or "").replace("PIN LƯU ĐỘNG ", "PIN-") for p in pin_at_kho]) + "\n"

    return text.strip()

def send_to_viber_outages(text: str) -> bool:
    """Send report text to the Viber Outages Channel (TVT3-Lịch cúp điện)."""
    if not text:
        return False
    text = text.replace("`", "")

    config_path = os.path.join(current_dir, 'data', 'system_config.json')
    viber_token = None
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                viber_token = cfg.get('viber_bot_token_outages')
        except:
            pass
    if not viber_token:
        viber_token = os.getenv("VIBER_TOKEN") or "56a990b99bf464bd-d406c456f5380df0-770d03e18af041d0"

    payload = {
        "from": "1B+9xBdRnqEQJXfWFZr4Dg==",
        "type": "text",
        "text": text
    }
    headers = {
        "X-Viber-Auth-Token": viber_token,
        "Content-Type": "application/json"
    }

    try:
        r = requests.post("https://chatapi.viber.com/pa/post", headers=headers, json=payload, timeout=15)
        print(f"Viber Outages Channel post status: {r.status_code} - {r.text}")
        return r.status_code == 200
    except Exception as e:
        print(f"❌ Failed to send Viber mobile equipment report: {e}")
        return False

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Send Mobile Equipment Report to Outages Channel")
    parser.add_argument("--send", action="store_true", help="Send report to Viber Outages Channel")
    parser.add_argument("--dry-run", action="store_true", help="Print report without sending")
    args = parser.parse_args()

    print("📊 Generating Mobile Equipment Daily Report...")
    text = generate_mobile_equipment_report_text()
    print("\n" + text + "\n")

    if args.send:
        print("📤 Sending report to Viber Channel TVT3-Lịch cúp điện...")
        success = send_to_viber_outages(text)
        if success:
            print("✅ Successfully sent Mobile Equipment Report to Viber Outages Channel.")
        else:
            print("❌ Failed to send Mobile Equipment Report.")
    else:
        print("💡 Dry run complete. Use --send to transmit to the Viber Outages Channel.")

if __name__ == "__main__":
    main()
