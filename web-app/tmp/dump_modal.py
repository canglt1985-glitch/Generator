import asyncio
from playwright.async_api import async_playwright
import sys

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        print("Logging in...")
        await page.goto("http://10.0.35.3:8080/datasite/#/login")
        try:
            await page.wait_for_selector('input[ng-model="userLogin.userName"]', timeout=5000)
            await page.fill('input[ng-model="userLogin.userName"]', 'cang.letan@mobifone.vn')
            await page.fill('input[type="password"]', 'Mobifone@123')
            await page.click('button.btn-login')
        except Exception:
            print("Skipping direct login... probably redirected to SSO.")

        print("Waiting for SSO...")
        await page.wait_for_selector('input[name="username"]', timeout=30000)
        await page.fill('input[name="username"]', 'cang.letan')
        await page.fill('input[name="password"]', 'Mobifone@123')
        await page.click('input[name="login"]')
        
        print("Waiting for dashboard redirect...")
        await page.wait_for_url("**/datasite/#/home", timeout=30000)
        
        print("Going to SDM...")
        await page.goto("http://10.0.35.3:8080/datasite/#/list-of-area-managed/sdm")
        
        print("Selecting To Long Khanh...")
        await page.wait_for_selector('.k-in:has-text("TỔ Long Khánh")', timeout=15000)
        loc = page.locator('.k-in:has-text("TỔ Long Khánh")')
        if await loc.count() > 0:
            await loc.first.click()
        await asyncio.sleep(2)
        
        print("Clicking Tai san...")
        await page.click('a.text-center:has-text("Tài sản")')
        await asyncio.sleep(2)
        
        print("Opening modal...")
        await page.click('button.green-meadow:has-text("Xuất dữ liệu")')
        await page.wait_for_selector('.modal.in', timeout=10000)
        await asyncio.sleep(2)
        
        print("Dumping HTML...")
        html = await page.evaluate('''() => {
            return document.querySelector('.modal.in').innerHTML;
        }''')
        
        # Save to file
        with open("tmp/modal_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        
        print("Saved to tmp/modal_dump.html")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
