# PartSelect Assistant

A chat agent for the PartSelect e-commerce site, scoped to **Refrigerator** and
**Dishwasher** parts. It answers product questions, checks part-to-model
compatibility, walks through installations, and troubleshoots symptoms — showing
results as rich product cards inline in the chat.

![stack](https://img.shields.io/badge/frontend-React-337778) ![stack](https://img.shields.io/badge/backend-FastAPI%20%2B%20Claude-1f4e4f)

## What it does

- **Find parts** by name, symptom, brand, or PartSelect (PS) number
- **Compatibility** — "Is PS11752778 compatible with my WDT780SAEM1?" → clear yes/no/uncertain
- **Installation** — difficulty, time estimate, and how-to video for a part
- **Troubleshooting** — "ice maker not working" → the parts that usually fix it
- **Stays in scope** — politely declines anything that isn't a fridge/dishwasher part

## Architecture

```
React (chat UI, product cards, SSE)  ──POST /api/chat──►  FastAPI
                                                            │
                                              Claude tool-use loop (agent.py)
                                                            │  5 tools
                                              Catalog / retrieval (catalog.py)
                                                            │
                                       parts.json + models.json  ◄── Playwright scraper
                                                                     (drives system Chrome,
                                                                      beats Akamai bot protection)
```

- **Backend**: Python + FastAPI, `claude-sonnet-4-6` with adaptive thinking and a
  manual streaming tool-use loop. The agent's only data access is through tools,
  which keeps every answer grounded in the real catalog.
- **Data**: PartSelect blocks scraping (Akamai → 403), so the catalog is built by
  a Playwright scraper that drives the locally-installed Chrome (which passes the
  bot check) and caches the result as JSON. The running app never scrapes.
- **Frontend**: the provided Create React App, rebranded to PartSelect, streaming
  responses over SSE and rendering structured cards (products, compatibility
  verdicts, install guides).

See [`backend/README.md`](backend/README.md) for backend details and the scraper.

## Run it (two terminals)

### 1 — Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # then set ANTHROPIC_API_KEY=sk-ant-...
uvicorn app.main:app --reload --port 8000
```

### 2 — Frontend

```bash
npm install
npm start                     # http://localhost:3000
```

The frontend talks to `http://localhost:8000` by default (override with
`REACT_APP_API_BASE`).

### Verify the data without a key

```bash
curl localhost:8000/api/health        # catalog stats
curl localhost:8000/api/parts/PS11752778
```

## Try these

- `How can I install part number PS11752778?`
- `Is PS11752778 compatible with my WDT780SAEM1 model?`
- `The ice maker on my Whirlpool fridge is not working. How can I fix it?`
- `My dishwasher won't drain` · `door bin for my Whirlpool refrigerator`
- `What parts do you have for my GNE27JYMWFFS?` · `Is PS304103 compatible with my GNE27JYMWFFS?`

## Tests

```bash
# Backend (43 tests — catalog, compatibility, tools, agent, scraper parsers)
cd backend && pip install -r requirements-dev.txt && pytest

# Frontend (15 tests — SSE parsing + card components)
npm test
```

Backend tests run against a fixed fixture catalog (no scrape, no API key needed).

## Extending it

- **New capability** → add a tool in `backend/app/tools.py` (schema + handler).
- **Real / bigger data** → re-implement the functions in `backend/app/catalog.py`
  (e.g. Postgres + pgvector, or a live PartSelect feed). Tools and agent are untouched.
- **More appliances** → widen the scraper's `--appliances` and the system-prompt scope.
