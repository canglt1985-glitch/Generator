import sys
import os
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.stdout.reconfigure(encoding='utf-8')

from smartw.worker import _send_viber_report

def format_demo_message():
    """
    Simulates the final simplified format for mobile.
    """
    lines = [
        "🚨 *ACTIVE* 🚨",
        "------------",
        "⚡ *MAC:*",
        "  • *DNIGKI14* (DNTN48) - 28/04 16:37",
        "  • *DNIGKI13* (DNTN45) - 28/04 16:37",
        "",
        "📵 *MLL:*",
        "  • *DNIHGO00* (DNLK03) [3G] - 15:19",
        "------------",
        "✅ *CLEARED* ✅",
        "------------",
        "📵 *MLL:*",
        "  • *DNILKH06* (DNLK22) [4G] - 17:07",
        "",
        "🔋 *GEN:*",
        "  • *DNIXHO10* (DNXL36) - 16:52",
        "------------",
        "💡 *Note:* CELLOFF moved to 2h Summary."
    ]
    
    return lines

if __name__ == "__main__":
    print("🚀 Sending Final Simplified Viber Demo Message...")
    demo_msg = format_demo_message()
    
    try:
        _send_viber_report(demo_msg)
        print("✅ Demo message sent successfully! Please check your Viber.")
    except Exception as e:
        print(f"❌ Failed to send demo message: {e}")
