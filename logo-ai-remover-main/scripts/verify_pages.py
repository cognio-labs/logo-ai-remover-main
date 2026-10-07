import asyncio
from playwright.async_api import async_playwright

async def verify():
    async with async_playwright() as p:
        # Launch edge or chrome
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        urls = [
            ("home", "http://localhost:5874/"),
            ("upscale", "http://localhost:5874/upscale"),
            ("video_enhancer", "http://localhost:5874/video-enhancer"),
            ("tools", "http://localhost:5874/tools"),
            ("bg_remover", "http://localhost:5874/background-remover"),
        ]

        for name, url in urls:
            try:
                print(f"Loading {url}...")
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(1000)
                path = f"screenshot_{name}.png"
                await page.screenshot(path=path, full_page=False)
                print(f"Captured {path}")
            except Exception as e:
                print(f"Error on {url}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify())
