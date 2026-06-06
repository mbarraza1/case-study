"""
Fully provision one appliance model for the demo: add it to the catalog with
its compatible parts, enrich those parts (price, install info, symptoms,
model cross-reference), and download their product images.

Use this to make a specific model "demo-ready" — e.g. the model the chat demo
revolves around — so compatibility checks resolve and its parts show real photos.

    python scraper/demo_model.py GNE27JYMWFFS
    python scraper/demo_model.py GNE27JYMWFFS WDT780SAEM1
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urljoin

from scrape import BASE, Browser, enrich_part, parse_part_url, scrape_model_page

DATA = Path(__file__).resolve().parent.parent / "app" / "data"
IMG_DIR = DATA / "images"

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

STRIP_JS = r"""() => {
  const img = document.querySelector("img[data-hero='1']");
  if (!img) return;
  const keep = new Set(); let n = img; while (n) { keep.add(n); n = n.parentElement; }
  const protect = e => keep.has(e) || e.contains(img);
  document.querySelectorAll('[class*=modal i],[class*=overlay i],[class*=popup i],[class*=lightbox i],[role=dialog],.mfp-bg,.modal-backdrop')
    .forEach(e => { if (!protect(e)) e.remove(); });
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


def capture_hero(page) -> bytes | None:
    loaded_check = ("() => { const i = document.querySelector(\"img[data-hero='1']\");"
                    " return i && i.naturalWidth > 120; }")
    try:
        page.wait_for_timeout(1500)               # let the page settle first
        if not page.evaluate(MARK_JS):
            return None
        # The hero is often natively lazy; nudge the viewport a few times so the
        # site's IntersectionObserver fires, polling until the image loads.
        for _ in range(5):
            try:
                page.wait_for_function(loaded_check, timeout=2500)
                break
            except Exception:
                page.evaluate("() => window.scrollBy(0, 250)")
                page.evaluate(MARK_JS)            # re-assert src in case lazy lib reset it
                page.wait_for_timeout(400)
        page.evaluate(STRIP_JS)
        page.wait_for_timeout(200)
        el = page.query_selector("img[data-hero='1']")
        if el and el.evaluate("e => e.naturalWidth > 120"):
            png = el.screenshot()
            if len(png) > 1500:
                return png
    except Exception:
        pass
    return None


def main(models: list[str]):
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    parts = json.loads((DATA / "parts.json").read_text())
    models_idx = json.loads((DATA / "models.json").read_text())
    by_ps = {p["partNumber"].upper(): p for p in parts}

    br = Browser()
    try:
        for model in models:
            print(f"== model {model} ==", flush=True)
            mp = scrape_model_page(br, model)
            if not mp or not mp["parts"]:
                print(f"  !! no parts found for {model} (blocked or unknown model?)", flush=True)
                continue
            print(f"  {len(mp['parts'])} parts", flush=True)
            ps_list = []
            for entry in mp["parts"]:
                ps = entry["ps"]
                ps_list.append(ps)
                rec = by_ps.get(ps.upper())
                if rec is None:
                    _, brand, mpn, name = parse_part_url(entry["url"])
                    rec = {
                        "partNumber": ps, "mpn": mpn, "name": name or entry["title"],
                        "brand": brand or mp["brand"], "applianceType": mp["applianceType"],
                        "partType": None, "price": None, "currency": "USD", "inStock": True,
                        "rating": None, "reviewCount": None, "difficulty": None,
                        "installTime": None, "installVideoUrl": None, "symptoms": [],
                        "description": None, "imageUrl": None,
                        "url": urljoin(BASE, entry["url"]), "compatibleModels": [],
                        "enriched": False,
                    }
                    parts.append(rec)
                    by_ps[ps.upper()] = rec
                if model.upper() not in [m.upper() for m in rec["compatibleModels"]]:
                    rec["compatibleModels"].append(model)

                # enrich (data) — separate nav
                if not rec.get("enriched"):
                    enrich_part(br, rec)
                # capture hero image
                if not (IMG_DIR / f"{ps}.png").exists():
                    page = br.get(rec["url"], settle=1500)
                    if page:
                        png = capture_hero(page)
                        br.close_page(page)
                        if png:
                            (IMG_DIR / f"{ps}.png").write_bytes(png)
                if (IMG_DIR / f"{ps}.png").exists():
                    rec["imageUrl"] = f"/static/parts/{ps}.png"
                print(f"    {ps}: enriched={rec.get('enriched')} img={'Y' if rec.get('imageUrl') else 'n'}", flush=True)

            models_idx[model.upper()] = {
                "model": model, "brand": mp["brand"],
                "applianceType": mp["applianceType"], "parts": ps_list,
            }
    finally:
        br.close()

    (DATA / "parts.json").write_text(json.dumps(parts, indent=2))
    (DATA / "models.json").write_text(json.dumps(models_idx, indent=2))
    imgs = sum(1 for m in models for ps in models_idx.get(m.upper(), {}).get("parts", [])
               if (IMG_DIR / f"{ps}.png").exists())
    print(f"\nDONE: provisioned {models}; images present for {imgs} of their parts.")


if __name__ == "__main__":
    main(sys.argv[1:] or ["GNE27JYMWFFS"])
