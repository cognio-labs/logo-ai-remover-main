import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:5874", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # 1. Screenshot top with sidebar
        await page.screenshot(path=r"C:\Users\PC\.gemini\antigravity-ide\brain\8df23950-74cf-4309-a1be-552e24e59501\sidebar_white.png", full_page=False)

        # 2. Scroll to Video Templates Section
        await page.evaluate("""() => {
            const sections = document.querySelectorAll('section');
            for (const s of sections) {
                if (s.textContent.includes('Featured') && s.textContent.includes('UGC style')) {
                    s.scrollIntoView({ behavior: 'instant', block: 'start' });
                    break;
                }
            }
        }""")
        await page.wait_for_timeout(1500)

        # Screenshot video templates section
        await page.screenshot(path=r"C:\Users\PC\.gemini\antigravity-ide\brain\8df23950-74cf-4309-a1be-552e24e59501\video_section_white.png", full_page=False)
        print("Screenshots captured successfully!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
