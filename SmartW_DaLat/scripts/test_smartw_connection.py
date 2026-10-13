"""
SmartW Da Lat — Connection & Environment Diagnostic Tool.
Kiểm tra đăng nhập SSO, cấu hình .env, và quét thử dữ liệu SmartW của Tổ Đà Lạt.
"""
import os
import sys
import asyncio
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from smartw.config import (
    load_smartw_config,
    SMARTW_TEAM,
    SMARTW_GROUP,
    SMARTW_TRUNG_TAM,
    SMARTW_PROVINCE,
    SMARTW_REGION,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID
)
from smartw.scraper import SmartWScraper


async def run_diagnostics():
    print("=" * 60)
    print("🚀 SMARTW ĐÀ LẠT - KIỂM TRA MÔI TRƯỜNG & KẾT NỐI")
    print("=" * 60)

    # 1. Kiểm tra cấu hình
    cfg = load_smartw_config()
    if not cfg:
        print("❌ LỖI: Chưa cấu hình SMARTW_USER và SMARTW_PASSWORD trong file .env!")
        print("👉 Vui lòng tạo file .env từ .env.example và điền thông tin tài khoản.")
        return

    print("✅ Đã nạp cấu hình từ .env:")
    print(f"   • User SmartW:  {cfg['username']}")
    print(f"   • Tổ (Team):    {SMARTW_TEAM}")
    print(f"   • Nhóm (Group): {SMARTW_GROUP}")
    print(f"   • Trung tâm:    {SMARTW_TRUNG_TAM}")
    print(f"   • Tỉnh:         {SMARTW_PROVINCE} (Miền: {SMARTW_REGION})")
    print(f"   • Telegram Bot: {'Đã cấu hình' if TELEGRAM_BOT_TOKEN else 'Chưa cấu hình (Bỏ qua nếu chỉ test)'}")

    # 2. Khởi động Scraper và đăng nhập SSO
    print("\n🌐 Đang khởi động trình duyệt và đăng nhập SSO SmartW...")
    scraper = SmartWScraper(cfg['username'], cfg['password'])
    await scraper.start()

    try:
        logged_in = await scraper.login()
        if not logged_in:
            print("❌ ĐĂNG NHẬP THẤT BẠI: Vui lòng kiểm tra lại Username/Mật khẩu hoặc kiểm tra OTP 2FA nếu có.")
            return

        print("🎉 ĐĂNG NHẬP SSO THÀNH CÔNG!")

        # 3. Quét thử cảnh báo của Tổ Đà Lạt
        print(f"\n📡 Đang quét thử cảnh báo cho Tổ '{SMARTW_TEAM}'...")
        alarms_raw = await scraper.scrape_all_alarms()
        print(f"✅ Quét thành công! Tìm thấy {len(alarms_raw)} cảnh báo active.")

        if alarms_raw:
            print("\n📋 3 cảnh báo mới nhất:")
            for idx, a in enumerate(alarms_raw[:3], 1):
                site = a.get('site') or a.get('ne') or 'N/A'
                alarm = a.get('alarmName') or 'N/A'
                time_str = a.get('sdate') or 'N/A'
                print(f"   {idx}. Trạm: {site:<10} | Cảnh báo: {alarm:<25} | Thời gian: {time_str}")
        else:
            print(f"ℹ️ Hiện tại không có cảnh báo nào active cho Tổ '{SMARTW_TEAM}'.")

    except Exception as e:
        print(f"❌ XẢY RA LỖI KHI CÀO DỮ LIỆU: {e}")
    finally:
        await scraper.stop()
        print("\n🔚 Đã đóng phiên làm việc.")


if __name__ == '__main__':
    asyncio.run(run_diagnostics())
