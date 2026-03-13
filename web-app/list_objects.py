"""Discovery: List all available objects in the DataSite Export Modal"""
import asyncio
import logging
import os
from datasite_scraper import DataSiteScraper
from app import app as flask_app

logging.basicConfig(level=logging.INFO)

async def main():
    with flask_app.app_context():
        from models import SystemConfig
        conf_user = SystemConfig.query.filter_by(key='datasite_username').first()
        conf_pass = SystemConfig.query.filter_by(key='datasite_password').first()
        user = conf_user.value if conf_user and conf_user.value else os.getenv('DATASITE_USER')
        pwd = conf_pass.value if conf_pass and conf_pass.value else os.getenv('DATASITE_PWD')

    scraper = DataSiteScraper(user, pwd)
    await scraper.start()
    try:
        await scraper.login()
        # Navigate to SDM using the correct base URL
        from datasite_scraper import DATASITE_URL
        await scraper._page.goto(f"{DATASITE_URL}/#/sdm")
        await asyncio.sleep(5)
        
        # Click Long Khanh
        await scraper._page.click("text=TỔ Long Khánh")
        await asyncio.sleep(2)
        
        # Click Tai san
        await scraper._page.click("text=Tài sản")
        await asyncio.sleep(2)
        
        # Click Export btn
        await scraper._page.click("button:has-text('Xuất dữ liệu tài sản')")
        await asyncio.sleep(2)
        
        # Extract all options
        options = await scraper._page.evaluate('''() => {
            const select = document.querySelector('.modal.in select[ng-model="objSelected"]');
            if (!select) return ["Select not found"];
            return Array.from(select.options).map(o => `${o.text} (${o.value})`);
        }''')
        
        print("\n--- AVAILABLE OBJECTS ---")
        for opt in options:
            print(opt)
        print("--------------------------\n")
        
    finally:
        await scraper.stop()

if __name__ == "__main__":
    asyncio.run(main())
