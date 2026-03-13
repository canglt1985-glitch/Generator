import asyncio
from playwright.async_api import async_playwright
import json

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
            print("Skipped initial login, probably redirected to SSO already.")

        print("SSO...")
        await page.wait_for_selector('input[name="username"]', timeout=30000)
        await page.fill('input[name="username"]', 'cang.letan')
        await page.fill('input[name="password"]', 'Mobifone@123')
        await page.click('input[name="login"]')
        
        print("SDM...")
        await page.wait_for_url("**/datasite/#/home", timeout=30000)
        await page.goto("http://10.0.35.3:8080/datasite/#/list-of-area-managed/sdm")
        
        print("Selecting To Long Khanh...")
        try:
            loc = page.locator('span.k-in:has-text("TỔ Long Khánh")')
            if await loc.count() == 0:
                loc = page.locator('span:has-text("TỔ Long Khánh")').last
            await loc.click(timeout=10000)
        except Exception as e:
            print("Cannot click Long Khanh", e)
            
        print("Tai san tab...")
        await asyncio.sleep(3)
        await page.click('a.text-center:has-text("Tài sản")')
        await asyncio.sleep(3)

        print("Xuat du lieu modal...")
        await page.click('button.green-meadow:has-text("Xuất dữ liệu")')
        await page.wait_for_selector('.modal.in', timeout=10000)
        await asyncio.sleep(2)

        print("Dumping scopes...")
        scopes_data = await page.evaluate('''() => {
            const selects = Array.from(document.querySelectorAll('.modal select'));
            let results = [];
            for (let i = 0; i < selects.length; i++) {
                const sel = selects[i];
                const ngModel = sel.getAttribute('ng-model') || 'unknown';
                try {
                    const scope = angular.element(sel).scope();
                    if (!scope) continue;
                    let listObj = scope.listObj || (scope.exportData && scope.exportData.listObj) || [];
                    results.push({
                        selectIndex: i,
                        ngModel: ngModel,
                        itemCount: listObj.length,
                        items: listObj.map(o => ({id: o.id, name: o.name}))
                    });
                } catch(e) {
                    results.push({selectIndex: i, error: e.toString()});
                }
            }
            return results;
        }''')

        print(json.dumps(scopes_data, indent=2, ensure_ascii=False))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
