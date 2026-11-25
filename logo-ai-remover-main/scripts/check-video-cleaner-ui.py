"""Verify the local video page against a running Next application and video worker."""

import argparse
import hashlib
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:5678/gemini-video-watermark-remover")
    parser.add_argument("--browser", type=Path)
    parser.add_argument("--clip", type=Path, required=True)
    parser.add_argument("--unmarked", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    original_hash = hashlib.sha256(args.clip.read_bytes()).hexdigest()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=args.browser)
        page = browser.new_page(accept_downloads=True, viewport={"width": 1440, "height": 960})
        page.set_default_timeout(15000)
        status_responses = []

        def record_status(response):
            if "/api/video/status/" in response.url and response.ok:
                status_responses.append(response.json())

        page.on("response", record_status)
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_load_state("networkidle", timeout=30000)
        chooser = page.locator("input[type=file]").first
        with page.expect_response(lambda r: "/api/video/download/" in r.url and r.ok, timeout=180000) as export:
            chooser.set_input_files(args.clip)
            original_preview = page.get_by_text("Scanning original video", exact=True)
            expect(original_preview).to_be_visible(timeout=30000)
            expect(page.get_by_role("progressbar")).to_be_visible()

        expect(page.get_by_text("Your processed video is ready")).to_be_visible(timeout=20000)
        download = page.get_by_role("link", name="Download Processed MP4")
        with page.expect_download() as saved:
            download.click()
        output = args.output / saved.value.suggested_filename
        saved.value.save_as(output)
        assert output.read_bytes() == export.value.body(), "Download differs from worker response"
        assert hashlib.sha256(output.read_bytes()).hexdigest() != original_hash
        assert hashlib.sha256(args.clip.read_bytes()).hexdigest() == original_hash

        player = page.get_by_role("group", name="Video comparison", exact=True).first
        divider = player.locator('[role="slider"][aria-valuetext]')
        picture = player.locator(":scope > div").first
        before, after = picture.locator("video").nth(0), picture.locator("video").nth(1)
        page.wait_for_function("(picture) => [...picture.querySelectorAll('video')].every(v => v.readyState >= 2)",
                               arg=picture.element_handle())
        assert before.get_attribute("src") != after.get_attribute("src")
        layer = after.locator("..")
        clip = lambda: layer.evaluate("(element) => getComputedStyle(element).clipPath")

        divider.focus()
        divider.press("Home")
        for position in (0, 25, 50, 75, 100):
            if position:
                for _ in range(5):
                    divider.press("ArrowRight")
            expect(divider).to_have_attribute("aria-valuenow", str(position))
            assert clip() == f"inset(0px 0px 0px {position}%)"
            expect(picture.get_by_text("Original", exact=True)).to_have_count(int(position > 0))
            expect(picture.get_by_text("Processed", exact=True)).to_have_count(int(position < 100))
            picture.screenshot(path=args.output / f"split-{position:03}.png")

        player.get_by_role("button", name="Original", exact=True).click()
        assert clip() == "inset(0px 0px 0px 100%)"
        player.get_by_role("button", name="Processed", exact=True).click()
        assert clip() == "none"
        player.get_by_role("button", name="Play video", exact=True).click()
        page.wait_for_function("(v) => !v.paused && v.currentTime > 0.15", arg=after.element_handle())
        assert abs(before.evaluate("(v) => v.currentTime") - after.evaluate("(v) => v.currentTime")) < 0.15
        player.get_by_title("Pause", exact=True).click()
        assert after.evaluate("(v) => v.paused")
        player.get_by_role("slider", name="Seek video position").press("End")
        assert after.evaluate("(v) => v.currentTime") > 0
        player.get_by_role("button", name="Split", exact=False).click()
        expect(divider).to_have_attribute("aria-valuenow", "50")
        bounds = picture.bounding_box()
        assert bounds
        y = bounds["y"] + bounds["height"] / 2
        page.mouse.move(bounds["x"] + bounds["width"] / 2, y)
        page.mouse.down()
        page.mouse.move(bounds["x"] + bounds["width"] / 4, y)
        page.mouse.up()
        expect(divider).to_have_attribute("aria-valuenow", "25")

        status = status_responses[-1]
        assert status["state"] == "done" and status["progress"] == 100
        assert status["quality"]["decoded_frames_verified"] == status["frames_processed"]
        assert sorted(r["progress"] for r in status_responses) == [r["progress"] for r in status_responses]

        chooser.set_input_files(args.unmarked)
        expect(page.get_by_text("No confident Gemini sparkle was detected.", exact=False)).to_be_visible(timeout=120000)
        expect(download).to_have_count(0)
        expect(page.get_by_role("button", name="Manual position")).to_be_visible()
        browser.close()

    report = json.dumps({
        "frames": status["frames_processed"], "slider_positions": [0, 25, 50, 75, 100],
        "modes": ["Original", "Split", "Processed"], "download": str(output), "unmarked_rejected": True,
    }, indent=2)
    (args.output / "browser-results.json").write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
