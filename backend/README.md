# PartSelect Assistant — Backend

FastAPI service exposing a Claude-powered chat agent for **Refrigerator** and
**Dishwasher** parts, grounded in a locally-cached PartSelect catalog.

```
app/
  main.py      FastAPI app — /api/health, /api/parts/{ps}, POST /api/chat (SSE)
  agent.py     Claude (claude-sonnet-4-6) streaming tool-use loop + system prompt
  tools.py     6 agent tools (search / details / compatibility / parts-for-model / install / troubleshoot)
  catalog.py   retrieval layer over the catalog (the "RAG" backbone)
  schemas.py   request models
  data/        parts.json + models.json  (produced by the scraper)
scraper/
  scrape.py    Playwright catalog ingester (drives system Chrome to beat Akamai)
```

## 1. Install

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate     # optional but recommended
pip install -r requirements.txt
```

## 2. Add your API key

```bash
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## 3. (If `app/data/parts.json` is missing) build the catalog

The catalog is produced by the scraper. PartSelect is behind Akamai bot
protection, so the scraper drives the **locally-installed Google Chrome** via
Playwright (which passes it). A snapshot is committed, but to (re)build:

```bash
# Playwright is in requirements.txt; it uses your system Chrome (channel="chrome")
python scraper/scrape.py                 # bounded demo crawl (~minutes)
python scraper/scrape.py --full          # every category, deep enrichment (longer)
python scraper/scrape.py --help          # all flags
```

Outputs `app/data/parts.json` and `app/data/models.json`.

### Product images

PartSelect's image CDN is behind Akamai — images can't be hotlinked
(cross-origin `<img>` 403s) or fetched standalone. `download_images.py` captures
them by screenshotting the rendered hero image on each part's detail page and
self-hosts them at `/static/parts/<PS>.png` (served by FastAPI). Parts without a
cached image fall back to a generated tile in the UI.

```bash
python scraper/download_images.py                  # all parts, resumable
python scraper/download_images.py --limit 100 --concurrency 3
```

## 4. Run

```bash
uvicorn app.main:app --reload --port 8000
```

Check it (works **without** an API key — proves the catalog loaded):

```bash
curl localhost:8000/api/health
curl localhost:8000/api/parts/PS11752778
```

## API

| Method | Path                | Description                                   |
| ------ | ------------------- | --------------------------------------------- |
| GET    | `/api/health`       | status + catalog stats + whether a key is set |
| GET    | `/api/parts/{ps}`   | full record for one part                      |
| POST   | `/api/chat`         | `{messages:[{role,content}]}` → SSE event stream |

### SSE event types (POST /api/chat)

```
{"type":"text","text":"…"}                  incremental assistant text
{"type":"tool_start","label":"Searching…"}  status pill
{"type":"products","items":[card,…]}        product cards
{"type":"compatibility","result":{…}}       compatibility verdict
{"type":"install_guide","guide":{…}}        installation guide
{"type":"done"} | {"type":"error","message":"…"}
```

## Tests

Deterministic unit tests run against a fixed fixture catalog (`tests/fixtures/`),
so they don't depend on the live scrape or an API key:

```bash
pip install -r requirements-dev.txt
pytest                      # 43 tests: catalog, compatibility, tools, agent, scraper parsers
```

Coverage: keyword search + appliance/brand filters, all compatibility branches
(confirmed / appliance-mismatch / same-appliance-not-listed / unknown model /
unknown part), troubleshooting, every tool's payload + UI events, the agent's
message-sanitization and no-key error paths, and the scraper's pure URL/card
parsers. (The full Claude tool-use loop and the live Playwright crawl need a key /
network and are exercised manually.)

## Design notes

- **Grounding:** the agent can only surface data the tools return from the
  catalog — it can't invent a part number, price, or model fit.
- **Extensibility:** `catalog.py` is the only place that knows where data lives.
  Swap the JSON for Postgres/pgvector or a live PartSelect feed and nothing in
  `tools.py` / `agent.py` changes. Adding a capability = adding one tool.
- **Scope guardrails:** enforced in the system prompt (refrigerator + dishwasher
  parts only); off-topic requests are politely redirected.
