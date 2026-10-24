import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        await page.goto("http://localhost:5874", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # 1. Inject stylish floating badges into the left white area
        await page.evaluate("""() => {
            const container = document.querySelector('.aspect-\\\\[2011\\\\/782\\\\]');
            if (!container) return;

            const badgeBox = document.createElement('div');
            badgeBox.id = 'hero-left-features';
            badgeBox.style.position = 'absolute';
            badgeBox.style.left = '1.2%';
            badgeBox.style.top = '50%';
            badgeBox.style.transform = 'translateY(-50%)';
            badgeBox.style.display = 'flex';
            badgeBox.style.flexDirection = 'column';
            badgeBox.style.gap = '10px';
            badgeBox.style.zIndex = '25';
            badgeBox.style.width = '10.8%';

            badgeBox.innerHTML = `
              <div style="background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: 14px; padding: 8px 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 8px; background: #FFF1F2; color: #E11D48; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0;">✨</div>
                <div style="min-width: 0; line-height: 1.2;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">AI Precision</div>
                  <div style="font-size: 9px; color: #64748B; white-space: nowrap;">Sub-pixel edges</div>
                </div>
              </div>

              <div style="background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: 14px; padding: 8px 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 8px; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0;">⚡</div>
                <div style="min-width: 0; line-height: 1.2;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Fast Speed</div>
                  <div style="font-size: 9px; color: #64748B; white-space: nowrap;">Under 3s processing</div>
                </div>
              </div>

              <div style="background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(8px); border: 1px solid rgba(226, 232, 240, 0.9); border-radius: 14px; padding: 8px 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 8px; background: #ECFDF5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; flex-shrink: 0;">🛡️</div>
                <div style="min-width: 0; line-height: 1.2;">
                  <div style="font-size: 11px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Studio Pro</div>
                  <div style="font-size: 9px; color: #64748B; white-space: nowrap;">Lossless 8K Export</div>
                </div>
              </div>
            `;
            container.appendChild(badgeBox);
        }""")
        await page.wait_for_timeout(300)
        await page.screenshot(path=r"C:\Users\PC\.gemini\antigravity-ide\brain\8df23950-74cf-4309-a1be-552e24e59501\test_hero_badges_preview.png", full_page=False)

        await browser.close()
        print("Captured test_hero_badges_preview!")

if __name__ == "__main__":
    asyncio.run(run())
