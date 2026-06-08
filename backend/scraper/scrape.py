"""
PartSelect catalog scraper (Refrigerator + Dishwasher parts).

PartSelect is protected by Akamai bot management, which 403s plain HTTP clients.
A *real* browser engine passes it, so this scraper drives the locally-installed
Google Chrome via Playwright (channel="chrome").

Pipeline
--------
1. discover_categories()  -> read each appliance landing page, collect the
   "Shop by Part Type" category URLs (e.g. /Dishwasher-Spray-Arms.htm).
2. scrape_category()      -> walk each category's listing pages (.nf__part cards),
   parse PS#, MPN, brand, name, price, stock, reviews, blurb.
3. enrich_part()          -> open each part's detail page for install difficulty,
   install time, repair video, symptoms, full description, and the model
   cross-reference (-> compatibleModels).
4. write parts.json + models.json (models.json is the inverted model->parts index).

Everything is bounded by CLI flags so it runs in minutes for a demo or for hours
for full coverage. Re-running is incremental: existing enriched parts are kept
unless --refresh is passed.

Usage
-----
    python scrape.py --appliances Refrigerator Dishwasher \
        --max-pages 3 --enrich-limit 12 --out ../app/data

    python scrape.py --full          # every category, every page, enrich all
    python scrape.py --must-have PS11752778 WDT780SAEM1   # always include these

This is the *ingestion* layer. The running app never scrapes — it reads the
JSON this produces. Swap this file out for a real PartSelect data feed/API and
nothing else in the app changes.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

BASE = "https://www.partselect.com"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# A part-type page is appliance-first (/Dishwasher-Spray-Arms.htm); a brand page
# is brand-first (/Whirlpool-Dishwasher-Parts.htm). This tells them apart.
CATEGORY_RE = re.compile(r"^/(Refrigerator|Dishwasher)-(?!Parts\.htm)[A-Za-z0-9\-]+\.htm$")
PART_URL_RE = re.compile(r"/PS\d+-[A-Za-z0-9\-]+\.htm")
PS_RE = re.compile(r"PS\d+")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# --------------------------------------------------------------------------- #
# Browser plumbing
# --------------------------------------------------------------------------- #
class Browser:
    def __init__(self, headless=True, delay=0.4):
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            channel="chrome", headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self._ctx = self._browser.new_context(
            user_agent=UA, locale="en-US", viewport={"width": 1280, "height": 1000})
        self.delay = delay

    def get(self, url, settle=2200, tries=3):
        page = self._ctx.new_page()
        try:
            for attempt in range(1, tries + 1):
                try:
                    resp = page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_timeout(settle)
                    body = page.content()
                    if resp and resp.status == 200 and "Access Denied" not in body:
                        time.sleep(self.delay)
                        return page
                    log(f"  retry {attempt} ({resp.status if resp else '??'}) {url}")
                except Exception as e:  # noqa: BLE001
                    log(f"  retry {attempt} ({type(e).__name__}) {url}")
                page.wait_for_timeout(1500 * attempt)
            return None
        finally:
            # caller closes; but if we returned None, close here
            if page.is_closed():
                pass

    def close_page(self, page):
        try:
            if page and not page.is_closed():
                page.close()
        except Exception:  # noqa: BLE001
            pass

    def close(self):
        self._browser.close()
        self._pw.stop()


# --------------------------------------------------------------------------- #
# Parsing helpers
# --------------------------------------------------------------------------- #
def parse_part_url(href: str):
    """/PS11752778-Whirlpool-WPW10321304-Refrigerator-Door-Shelf-Bin.htm
    -> (PS11752778, Whirlpool, WPW10321304, 'Refrigerator Door Shelf Bin')"""
    path = href.split("?")[0].split("#")[0].strip("/")
    stem = path[:-4] if path.endswith(".htm") else path
    toks = stem.split("-")
    ps = toks[0] if toks and toks[0].startswith("PS") else None
    brand = toks[1] if len(toks) > 1 else None
    mpn = toks[2] if len(toks) > 2 else None
    name = " ".join(toks[3:]) if len(toks) > 3 else None
    return ps, brand, mpn, name


def discover_categories(br: Browser, appliance: str):
    url = f"{BASE}/{appliance}-Parts.htm"
    page = br.get(url, settle=2500)
    if not page:
        log(f"!! could not load landing page for {appliance}")
        return []
    cats = page.eval_on_selector_all(
        "a",
        """els => els.map(e => ({t:(e.textContent||'').trim(), h:e.getAttribute('href')}))
                     .filter(x => x.h)""",
    )
    br.close_page(page)
    out, seen = [], set()
    for c in cats:
        h = c["h"].split("?")[0]
        if CATEGORY_RE.match(h) and h not in seen:
            seen.add(h)
            out.append({"name": c["t"] or h, "url": urljoin(BASE, h)})
    log(f"  {appliance}: {len(out)} part-type categories")
    return out


def scrape_card(card: dict, appliance: str, category: str):
    """card = {href, title, text} from the listing DOM."""
    href = card.get("href") or ""
    ps, brand, mpn, name_from_url = parse_part_url(href)
    if not ps:
        m = PS_RE.search(card.get("text", ""))
        ps = m.group(0) if m else None
    if not ps:
        return None
    text = re.sub(r"\s+", " ", card.get("text", "")).strip()

    price = None
    pm = re.search(r"\$\s?([\d,]+\.\d{2})", text)
    if pm:
        price = float(pm.group(1).replace(",", ""))
    reviews = None
    rm = re.search(r"(\d[\d,]*)\s+Reviews", text)
    if rm:
        reviews = int(rm.group(1).replace(",", ""))
    in_stock = "In Stock" in text
    mpn_text = None
    mm = re.search(r"Manufacturer Part Number\s+([A-Za-z0-9]+)", text)
    if mm:
        mpn_text = mm.group(1)
    # short blurb: text after the MPN
    blurb = None
    if mm:
        blurb = text[mm.end():].strip()[:280] or None

    title = (card.get("title") or name_from_url or "").strip()
    return {
        "partNumber": ps,
        "mpn": mpn_text or mpn,
        "name": title or name_from_url,
        "brand": brand,
        "applianceType": appliance,
        "partType": category,
        "price": price,
        "currency": "USD",
        "inStock": in_stock,
        "rating": None,
        "reviewCount": reviews,
        "difficulty": None,
        "installTime": None,
        "installVideoUrl": None,
        "symptoms": [],
        "description": blurb,
        "imageUrl": card.get("img"),
        "url": urljoin(BASE, href.split("#")[0]),
        "compatibleModels": [],
        "enriched": False,
    }


def scrape_category(br: Browser, cat: dict, appliance: str, max_pages: int, per_cat: int):
    found = {}
    for page_no in range(1, max_pages + 1):
        url = cat["url"] if page_no == 1 else f"{cat['url']}?start={page_no}"
        page = br.get(url, settle=2000)
        if not page:
            break
        cards = page.evaluate(
            """() => [...document.querySelectorAll('.nf__part')].map(el => {
                 const a = el.querySelector("a[href*='/PS']");
                 const title = el.querySelector('.nf__part__detail__title');
                 const img = el.querySelector("img");
                 // images are lazy-loaded: real URL is in data-src, src holds a placeholder
                 let src = img ? (img.getAttribute('data-src') || img.getAttribute('src') || '') : '';
                 if (src.startsWith('data:')) src = img.getAttribute('data-src') || '';
                 return {
                   href: a ? a.getAttribute('href') : null,
                   title: title ? title.textContent.trim() : null,
                   img: src && src.startsWith('http') ? src : null,
                   text: el.textContent,
                 };
               })"""
        )
        br.close_page(page)
        new = 0
        for c in cards:
            rec = scrape_card(c, appliance, cat["name"])
            if rec and rec["partNumber"] not in found:
                found[rec["partNumber"]] = rec
                new += 1
        log(f"    {cat['name']} p{page_no}: +{new} ({len(found)} total)")
        if new == 0:
            break
        if per_cat and len(found) >= per_cat:
            break
    return list(found.values())[:per_cat] if per_cat else list(found.values())


def scrape_model_page(br: Browser, model: str):
    """Read /Models/{MODEL}/ -> {model, brand, applianceType, parts:[{ps,url,title}]}.

    This is the authoritative compatibility source: PartSelect tells us exactly
    which parts fit a given model, which is more reliable than intersecting
    per-part cross-reference lists.
    """
    page = br.get(f"{BASE}/Models/{model}/", settle=2200)
    if not page:
        return None
    data = page.evaluate(
        r"""() => {
          const title = document.title || "";
          const seen = {}, parts = [];
          document.querySelectorAll("a[href*='/PS']").forEach(a => {
            const href = a.getAttribute("href") || "";
            const m = href.match(/PS\d+/);
            if (!m || seen[m[0]]) return;
            seen[m[0]] = 1;
            parts.push({ ps: m[0], url: href.split("#")[0],
                         title: (a.textContent || "").trim().slice(0, 90) });
          });
          return { title, parts };
        }"""
    )
    br.close_page(page)
    # title: "Whirlpool Dishwasher WDT780SAEM1 - OEM Parts..."
    title = data.get("title", "")
    brand = None
    appliance = "Dishwasher" if "Dishwasher" in title else ("Refrigerator" if "Refrigerator" in title else None)
    for b in ("Whirlpool", "GE", "Frigidaire", "Samsung", "LG", "Maytag", "KitchenAid",
              "Bosch", "Kenmore", "Amana", "Electrolux"):
        if title.startswith(b) or f" {b} " in title:
            brand = b
            break
    return {"model": model, "brand": brand, "applianceType": appliance, "parts": data.get("parts", [])}


def enrich_part(br: Browser, part: dict, max_models: int = 300):
    page = br.get(part["url"], settle=2200)
    if not page:
        return part
    data = page.evaluate(
        r"""() => {
          const out = {};
          // install difficulty: a standalone Easy/Moderate/Difficult label
          const labels = [...document.querySelectorAll("p,span,div")]
            .map(e => e.textContent.trim())
            .filter(t => /^(Very Easy|Really Easy|Easy|Moderate|Difficult|A Bit Difficult)$/.test(t));
          out.difficulty = labels[0] || null;
          // install time
          const timeEl = [...document.querySelectorAll("*")]
            .map(e => e.textContent.trim())
            .find(t => /^(Less than 15 mins|15 ?- ?30 mins|30 ?- ?60 mins|1 ?- ?2 hours|More than 2 hours)$/i.test(t));
          out.installTime = timeEl || null;
          // repair video (YouTube id) — only accept a video near the
          // install/repair section, not a generic page-level promo video.
          let video = null;
          document.querySelectorAll("[data-yt-init]").forEach(yt => {
            const id = yt.getAttribute("data-yt-init");
            if (!id || video) return;
            // Walk up to check if this video is in a repair/install context
            let node = yt;
            for (let i = 0; i < 6 && node; i++) {
              const text = (node.className || "") + " " + (node.id || "");
              if (/repair|install|video|how.?to/i.test(text)) { video = id; break; }
              node = node.parentElement;
            }
          });
          out.video = video;
          // rating
          const rv = document.querySelector("[itemprop=ratingValue]");
          out.rating = rv ? parseFloat(rv.getAttribute("content") || rv.textContent) : null;
          const rc = document.querySelector("[itemprop=reviewCount]");
          out.reviewCount = rc ? parseInt(rc.getAttribute("content") || rc.textContent) : null;
          // price
          const pr = document.querySelector("[itemprop=price]");
          out.price = pr ? parseFloat(pr.getAttribute("content") || pr.textContent.replace(/[^0-9.]/g,'')) : null;
          // symptoms this part fixes: a <ul class="list-disc"> under the
          // "fixes the following symptoms" heading. Climb from the heading until
          // an ancestor contains that list.
          let symptoms = [];
          const symHead = [...document.querySelectorAll("h2,h3,h4,p,div,section,span")]
            .find(e => /fixes the following symptoms/i.test(e.textContent || '')
                       && (e.textContent || '').length < 200);
          if (symHead) {
            let node = symHead, ul = null;
            for (let i = 0; i < 5 && node; i++) {
              ul = node.querySelector ? node.querySelector("ul.list-disc") : null;
              if (ul) break;
              node = node.parentElement;
            }
            if (ul) symptoms = [...ul.querySelectorAll("li")].map(li => li.textContent.trim());
          }
          out.symptoms = symptoms;
          // description
          const d = document.querySelector("[itemprop=description], .pd__description");
          out.description = d ? d.textContent.replace(/\s+/g,' ').trim().slice(0,600) : null;
          // model cross reference table: rows of [model, type, description]
          const models = [];
          document.querySelectorAll("table tr, .pd__crossref__list .row").forEach(tr => {
            const cells = [...tr.querySelectorAll("td, .col, a")].map(c=>c.textContent.trim()).filter(Boolean);
            if (cells.length && /^[A-Z0-9][A-Z0-9\-\/]{4,}$/i.test(cells[0])) models.push(cells[0]);
          });
          out.models = [...new Set(models)];
          // hero image
          const img = document.querySelector("img[itemprop=image], .main-image img, .pd__img img");
          out.image = img ? (img.getAttribute("src") || img.getAttribute("data-src")) : null;
          return out;
        }"""
    )
    br.close_page(page)

    if data.get("difficulty"):
        part["difficulty"] = data["difficulty"]
    if data.get("installTime"):
        part["installTime"] = data["installTime"]
    if data.get("video"):
        part["installVideoUrl"] = f"https://www.youtube.com/watch?v={data['video']}"
    if data.get("rating"):
        part["rating"] = data["rating"]
    if data.get("reviewCount"):
        part["reviewCount"] = data["reviewCount"]
    if data.get("price"):
        part["price"] = data["price"]
    if data.get("symptoms"):
        # de-dupe, keep meaningful phrases
        seen, syms = set(), []
        for s in data["symptoms"]:
            s = s.strip()
            if 3 < len(s) < 80 and s.lower() not in seen:
                seen.add(s.lower())
                syms.append(s)
        part["symptoms"] = syms[:12]
    if data.get("description"):
        part["description"] = data["description"]
    # imageUrl comes from the listing card (reliable product CDN image); the
    # detail-page hero selector can pick up A/B-test assets, so don't override.
    if data.get("models"):
        part["compatibleModels"] = data["models"][:max_models]
    part["enriched"] = True
    return part


# --------------------------------------------------------------------------- #
# Orchestration
# --------------------------------------------------------------------------- #
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--appliances", nargs="+", default=["Refrigerator", "Dishwasher"])
    ap.add_argument("--max-pages", type=int, default=2, help="listing pages per category")
    ap.add_argument("--per-category", type=int, default=20, help="cap parts kept per category (0 = no cap)")
    ap.add_argument("--max-categories", type=int, default=0, help="cap categories per appliance (0 = all)")
    ap.add_argument("--enrich-limit", type=int, default=10,
                    help="enrich this many parts per category with detail-page data (0 = none)")
    ap.add_argument("--must-have", nargs="*", default=["PS11752778"],
                    help="part numbers to always include + fully enrich")
    ap.add_argument("--model-pages", nargs="*", default=["WDT780SAEM1"],
                    help="scrape /Models/<X>/ for authoritative model->parts compatibility")
    ap.add_argument("--full", action="store_true", help="every category/page, enrich everything")
    ap.add_argument("--no-headless", action="store_true")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "app" / "data"))
    args = ap.parse_args()

    if args.full:
        args.max_pages, args.per_category, args.max_categories, args.enrich_limit = 50, 0, 0, 10**9

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    br = Browser(headless=not args.no_headless)
    catalog: dict[str, dict] = {}
    try:
      try:
        for appliance in args.appliances:
            cats = discover_categories(br, appliance)
            if args.max_categories:
                cats = cats[: args.max_categories]
            for ci, cat in enumerate(cats, 1):
                log(f"[{appliance} {ci}/{len(cats)}] {cat['name']}")
                parts = scrape_category(br, cat, appliance, args.max_pages, args.per_category)
                to_enrich = parts[: args.enrich_limit] if args.enrich_limit else []
                for part in parts:
                    catalog.setdefault(part["partNumber"], part)
                for pi, part in enumerate(to_enrich, 1):
                    log(f"      enrich {pi}/{len(to_enrich)} {part['partNumber']}")
                    enrich_part(br, catalog[part["partNumber"]])

        # must-have parts: fetch detail directly if not already present/enriched
        for ps in args.must_have:
            rec = catalog.get(ps)
            if rec is None:
                # PartSelect's search endpoint 200-redirects a bare PS number to
                # the canonical slug URL.
                page = br.get(f"{BASE}/api/search/?searchterm={ps}", settle=1500)
                real_url = page.url if page else None
                if page:
                    br.close_page(page)
                if real_url and "/PS" in real_url:
                    ps2, brand, mpn, name = parse_part_url(real_url.replace(BASE, ""))
                    rec = {
                        "partNumber": ps, "mpn": mpn, "name": name, "brand": brand,
                        "applianceType": "Refrigerator" if "Refrigerator" in real_url else
                        ("Dishwasher" if "Dishwasher" in real_url else None),
                        "partType": None, "price": None, "currency": "USD", "inStock": True,
                        "rating": None, "reviewCount": None, "difficulty": None,
                        "installTime": None, "installVideoUrl": None, "symptoms": [],
                        "description": None, "imageUrl": None, "url": real_url.split("#")[0],
                        "compatibleModels": [], "enriched": False,
                    }
                    catalog[ps] = rec
            if rec and not rec.get("enriched"):
                log(f"  must-have enrich {ps}")
                enrich_part(br, rec)

        # model pages -> authoritative compatibility. Adds the model's parts to
        # the catalog (as stubs if unseen) and tags each with this model number.
        for model in args.model_pages:
            log(f"  model page {model}")
            mp = scrape_model_page(br, model)
            if not mp or not mp["parts"]:
                log(f"    (no parts found for {model})")
                continue
            for entry in mp["parts"]:
                ps = entry["ps"]
                rec = catalog.get(ps)
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
                    catalog[ps] = rec
                if model.upper() not in [m.upper() for m in rec["compatibleModels"]]:
                    rec["compatibleModels"].append(model)
            log(f"    {model}: {len(mp['parts'])} parts tagged")
      except BaseException as e:  # noqa: BLE001 - persist partial progress on interrupt/error
        log(f"\n!! crawl interrupted ({type(e).__name__}: {e}) - writing partial catalog")
    finally:
        br.close()

    parts = sorted(catalog.values(), key=lambda p: (p["applianceType"] or "", p["partType"] or "", p["partNumber"]))

    # Build the inverted model -> parts index (the compatibility backbone).
    models: dict[str, dict] = {}
    for p in parts:
        for m in p.get("compatibleModels", []):
            key = m.upper()
            entry = models.setdefault(key, {
                "model": m, "brand": p.get("brand"),
                "applianceType": p.get("applianceType"), "parts": []})
            if p["partNumber"] not in entry["parts"]:
                entry["parts"].append(p["partNumber"])

    (out_dir / "parts.json").write_text(json.dumps(parts, indent=2))
    (out_dir / "models.json").write_text(json.dumps(models, indent=2))
    enriched = sum(1 for p in parts if p.get("enriched"))
    log(f"\nDONE: {len(parts)} parts ({enriched} enriched), "
        f"{len(models)} models -> {out_dir}/parts.json, models.json")


if __name__ == "__main__":
    main()
