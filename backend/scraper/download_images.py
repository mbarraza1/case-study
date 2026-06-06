"""
Download real PartSelect product images and self-host them.

PartSelect's image CDN is behind Akamai: images can't be hotlinked (cross-origin
<img> 403s) and can't be fetched/replayed standalone (403). They only render as
the genuine eager load the browser makes on the part's own detail page. So the
reliable capture is to **screenshot the rendered hero <img> element** — the
browser has already painted it, so no network/CORS/Akamai issue applies.

Per part this downloader:
  1. opens the detail page in real Chrome (passes Akamai),
  2. finds the product hero <img> (src on PartSelect's image CDN),
  3. strips the signup modal/scrim and the small "BESTSELLER"/"video" badges
     that overlay it,
  4. screenshots just that element to app/data/images/<PS>.png,
  5. rewrites the part's imageUrl to "/static/parts/<PS>.png" (served by FastAPI).

Resumable (skips parts already saved) and concurrent.

    python scraper/download_images.py                  # all parts, 5 workers
    python scraper/download_images.py --limit 100 --concurrency 6
"""
from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

DATA = Path(__file__).resolve().parent.parent / "app" / "data"
IMG_DIR = DATA / "images"

# Step 1: find the product hero <img> (CDN src OR lazy data-src), force it to
# load eagerly, and mark it. Returns true if a hero candidate exists.
MARK_JS = r"""() => {
  const re = /azurefd\.net\/\d+-\d+-[A-Za-z]-/;
  const img = [...document.querySelectorAll('img')].find(
    e => re.test(e.currentSrc || '') || re.test(e.getAttribute('data-src') || '') || re.test(e.src || ''));
  if (!img) return false;
  img.setAttribute('data-hero', '1');
  img.loading = 'eager';
  const d = img.getAttribute('data-src');
  if (d && (!img.src || img.src.startsWith('data:'))) img.src = d;
  img.scrollIntoView({ block: 'center' });
  return true;
}"""

# Step 2 (after the hero has loaded): strip the signup modal/scrim and the small
# badges that overlay the image, so the element screenshot is just the product.
STRIP_JS = r"""() => {
  const img = document.querySelector("img[data-hero='1']");
  if (!img) return;
  const keep = new Set(); let n = img; while (n) { keep.add(n); n = n.parentElement; }
  const protect = e => keep.has(e) || e.contains(img);
  document.querySelectorAll(
    '[class*=modal i],[class*=overlay i],[class*=popup i],[class*=lightbox i],[role=dialog],.mfp-bg,.modal-backdrop'
  ).forEach(e => { if (!protect(e)) e.remove(); });
  [...document.querySelectorAll('body *')].forEach(e => {
    const c = getComputedStyle(e);
    if ((c.position === 'fixed' || c.position === 'sticky') && parseInt(c.zIndex || 0) >= 50 && !protect(e)) e.remove();
  });
  const r = img.getBoundingClientRect();
  [...document.querySelectorAll('body *')].forEach(e => {
    if (e === img || protect(e)) return;
    const c = getComputedStyle(e);
    if (!['absolute', 'fixed', 'sticky'].includes(c.position)) return;
    const b = e.getBoundingClientRect();
    const overlaps = !(b.right < r.left || b.left > r.right || b.bottom < r.top || b.top > r.bottom);
    if (overlaps && b.width < r.width * 0.95) e.remove();
  });
}"""


async def worker(ctx, queue, results, lock, done, total):
    page = await ctx.new_page()
    while True:
        try:
            part = queue.get_nowait()
        except asyncio.QueueEmpty:
            break
        ps = part["partNumber"]
        try:
            await page.goto(part["url"], wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(1200)
            if await page.evaluate(MARK_JS):
                # wait for the (often lazy) hero image to actually load
                try:
                    await page.wait_for_function(
                        "() => { const i = document.querySelector(\"img[data-hero='1']\");"
                        " return i && i.naturalWidth > 120; }", timeout=8000)
                except Exception:
                    pass
                await page.evaluate(STRIP_JS)
                await page.wait_for_timeout(200)
                el = await page.query_selector("img[data-hero='1']")
                if el and await el.evaluate("e => e.naturalWidth > 120"):
                    png = await el.screenshot()
                    if len(png) > 1500:
                        (IMG_DIR / f"{ps}.png").write_bytes(png)
                        async with lock:
                            results[ps] = True
        except Exception:
            pass
        async with lock:
            done[0] += 1
            if done[0] % 20 == 0:
                print(f"  {done[0]}/{total} processed, {len(results)} saved", flush=True)
    await page.close()


async def main_async(args):
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    parts = json.loads((DATA / "parts.json").read_text())
    todo = [p for p in parts if p.get("url")
            and not (IMG_DIR / f"{p['partNumber']}.png").exists()]
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(todo)} parts to download ({len(parts)} total)", flush=True)

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
            worker(ctx, queue, results, lock, done, len(todo))
            for _ in range(args.concurrency)])
        await browser.close()

    # Point imageUrl at the self-hosted file when present; clear it otherwise.
    updated = 0
    for p in parts:
        f = IMG_DIR / f"{p['partNumber']}.png"
        local = f"/static/parts/{p['partNumber']}.png" if f.exists() else None
        if p.get("imageUrl") != local:
            p["imageUrl"] = local
            updated += 1
    (DATA / "parts.json").write_text(json.dumps(parts, indent=2))
    have = sum(1 for p in parts if (IMG_DIR / f"{p['partNumber']}.png").exists())
    print(f"\nDONE: {len(results)} saved this run, {updated} imageUrls set. "
          f"{have}/{len(parts)} parts now have a local image.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--concurrency", type=int, default=5)
    args = ap.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
