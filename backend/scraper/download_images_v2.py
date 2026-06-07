"""
Download PartSelect product images via Playwright network interception.

PartSelect's image CDN (azurefd.net) is behind Akamai — only a real browser
session on partselect.com can fetch images. This script:
  1. Opens each part's detail page in Chrome (passes Akamai),
  2. Intercepts the CDN response for the medium product image,
  3. Saves the raw image bytes to app/data/images/<PS>.jpg,
  4. Updates parts.json with the local imageUrl.

This is faster and more reliable than screenshotting (download_images.py) because
it captures the actual image file from the network layer.

    python scraper/download_images_v2.py                  # all missing, 4 workers
    python scraper/download_images_v2.py --limit 100 --concurrency 6
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
from pathlib import Path

from playwright.async_api import async_playwright

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

DATA = Path(__file__).resolve().parent.parent / "app" / "data"
IMG_DIR = DATA / "images"

# Match the medium-size product image from the CDN
CDN_RE = re.compile(r"azurefd\.net/.+?-1-M-.+\.jpg$")


async def worker(ctx, queue, results, lock, done, total, delay):
    page = await ctx.new_page()
    while True:
        try:
            part = queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        ps = part["partNumber"]
        ps_num = ps.replace("PS", "")
        captured = None

        async def handle_response(response):
            nonlocal captured
            url = response.url
            if captured:
                return
            # Match any medium-size image for this part (e.g. -1-M-, -2-M-, -3-M-)
            if "azurefd.net" in url and f"{ps_num}-" in url and "-M-" in url and response.status == 200:
                try:
                    body = await response.body()
                    if len(body) > 2000:  # skip tiny placeholders
                        captured = body
                except Exception:
                    pass

        page.on("response", handle_response)
        try:
            await page.goto(part["url"], wait_until="domcontentloaded", timeout=25000)
            # Wait for image to load (up to 5s)
            for _ in range(10):
                if captured:
                    break
                await page.wait_for_timeout(500)

            if captured:
                out_path = IMG_DIR / f"{ps}.jpg"
                out_path.write_bytes(captured)
                async with lock:
                    results[ps] = True
        except Exception:
            pass
        finally:
            page.remove_listener("response", handle_response)

        async with lock:
            done[0] += 1
            if done[0] % 10 == 0:
                print(f"  {done[0]}/{total} processed, {len(results)} saved", flush=True)
        if delay:
            await page.wait_for_timeout(delay)
    await page.close()


async def main_async(args):
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    parts = json.loads((DATA / "parts.json").read_text())

    # Skip parts that already have a downloaded image
    existing = {f.stem for f in IMG_DIR.glob("*.*")}
    todo = [p for p in parts if p.get("url") and p["partNumber"] not in existing]

    # Prioritize most-reviewed parts (most likely to appear in results)
    todo.sort(key=lambda p: -(p.get("reviewCount") or 0))
    if args.limit:
        todo = todo[:args.limit]
    print(f"{len(todo)} parts to download ({len(existing)} already cached, {len(parts)} total)", flush=True)

    if not todo:
        print("All images already downloaded.")
        return

    queue: asyncio.Queue = asyncio.Queue()
    for p in todo:
        queue.put_nowait(p)
    results: dict = {}
    lock = asyncio.Lock()
    done = [0]

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            channel="chrome", headless=True,
            args=["--disable-blink-features=AutomationControlled"])
        ctx = await browser.new_context(user_agent=UA, locale="en-US",
                                        viewport={"width": 1280, "height": 1000})
        await asyncio.gather(*[
            worker(ctx, queue, results, lock, done, len(todo), args.delay)
            for _ in range(args.concurrency)])
        await browser.close()

    # Update parts.json imageUrl for all parts (including existing)
    updated = 0
    for p in parts:
        ps = p["partNumber"]
        # Check for both .jpg and .png (legacy screenshots)
        img_file = None
        for ext in (".jpg", ".png"):
            f = IMG_DIR / f"{ps}{ext}"
            if f.exists():
                img_file = f
                break
        local = f"/static/parts/{img_file.name}" if img_file else None
        if p.get("imageUrl") != local:
            p["imageUrl"] = local
            updated += 1

    (DATA / "parts.json").write_text(json.dumps(parts, indent=2))
    have = sum(1 for p in parts if p.get("imageUrl"))
    print(f"\nDONE: {len(results)} new images saved, {updated} imageUrls updated. "
          f"{have}/{len(parts)} parts now have a local image.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--concurrency", type=int, default=4)
    ap.add_argument("--delay", type=int, default=200, help="ms pause between parts per worker")
    args = ap.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
