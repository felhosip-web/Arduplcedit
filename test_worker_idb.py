import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Navigating to app...")
        await page.goto("http://localhost:3000")
        await page.wait_for_timeout(2000)

        # Click Fájl menu
        await page.click("button:has-text('Fájl')")
        await page.wait_for_timeout(500)

        # Click menu item for Projekt Kezelő (Slotok)
        await page.click("text=Projekt Kezelő (Slotok)")
        await page.wait_for_timeout(1000)

        # Click slot 3 tab
        await page.evaluate('''() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const slotTab = btns.find(b => b.textContent.includes('3. Böngésző Mentési Rekeszek'));
            if (slotTab) slotTab.click();
        }''')
        await page.wait_for_timeout(1000)

        # Click slot 1 Mentés button
        await page.evaluate('''() => {
            const cards = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('#1') && d.textContent.includes('Üres Rekesz #1'));
            if (cards.length > 0) {
                const btn = cards[cards.length - 1].querySelector('button');
                if (btn) btn.click();
            }
        }''')
        await page.wait_for_timeout(1500)

        await page.screenshot(path="/home/jules/verification/verification_worker.png")
        print("Screenshot saved to /home/jules/verification/verification_worker.png")

        await browser.close()

asyncio.run(run())
