"""
Backfill product image URLs into an existing parts.json.

The main crawl now captures listing-card images, but this lets you refresh just
the images for an already-built catalog without re-enriching everything: it walks
each part-type listing page and maps PS number -> product image URL (PartSelect's
Azure CDN), updating parts.json in place.

    python scraper/backfill_images.py                # default: 3 pages/category
    python scraper/backfill_images.py --max-pages 5
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from scrape import BASE, Browser, discover_categories  # noqa: E402

PS_RE = re.compile(r"PS\d+")


def collect_images(page) -> dict[str, str]:
    rows = page.evaluate(
        r"""() => [...document.querySelectorAll('.nf__part')].map(el => {
              const a = el.querySelector("a[href*='/PS']");
              const img = el.querySelector("img");
              let src = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
              if (src.startsWith('data:')) src = img.getAttribute('data-src') || '';
              return { href: a ? a.getAttribute('href') : '', src };
            })"""
    )
    out = {}
    for r in rows:
        m = PS_RE.search(r.get("href") or "")
        src = r.get("src") or ""
        if m and src.startswith("http"):
            out[m.group(0)] = src
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--appliances", nargs="+", default=["Refrigerator", "Dishwasher"])
    ap.add_argument("--max-pages", type=int, default=3)
    ap.add_argument("--data", default=str(Path(__file__).resolve().parent.parent / "app" / "data" / "parts.json"))
    ap.add_argument("--no-headless", action="store_true")
    args = ap.parse_args()

    parts_path = Path(args.data)
    parts = json.loads(parts_path.read_text())
    by_ps = {p["partNumber"].upper(): p for p in parts}

    br = Browser(headless=not args.no_headless)
    images: dict[str, str] = {}
    try:
        for appliance in args.appliances:
            for cat in discover_categories(br, appliance):
                for page_no in range(1, args.max_pages + 1):
                    url = cat["url"] if page_no == 1 else f"{cat['url']}?start={page_no}"
                    page = br.get(url, settle=1800)
                    if not page:
                        break
                    found = collect_images(page)
                    br.close_page(page)
                    if not found:
                        break
                    images.update(found)
                print(f"  {appliance} / {cat['name']}: {len(images)} images so far", flush=True)
    finally:
        br.close()

    updated = 0
    for ps, url in images.items():
        rec = by_ps.get(ps.upper())
        if rec and rec.get("imageUrl") != url:
            rec["imageUrl"] = url
            updated += 1

    parts_path.write_text(json.dumps(parts, indent=2))
    have = sum(1 for p in parts if p.get("imageUrl"))
    print(f"\nDONE: scraped {len(images)} images, updated {updated} records. "
          f"{have}/{len(parts)} parts now have an image.")


if __name__ == "__main__":
    main()
