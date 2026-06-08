# PartSelect Assistant

An AI-powered chat agent for PartSelect.com, scoped to **Refrigerator** and **Dishwasher** parts. It helps customers find parts, verify compatibility, get installation guidance, troubleshoot symptoms, and manage a shopping cart — with results rendered as rich interactive cards.

## What it does

- **Guided onboarding** — select your appliance, then choose from common symptoms, model lookup, or part browsing
- **Find parts** by name, symptom, brand, or PartSelect (PS) number
- **Compatibility** — "Is PS11752778 compatible with my WDT780SAEM1?" → clear yes/no with confidence level
- **Model lookup** — "What parts fit my GNE27JYMWFFS?" → all compatible parts with confirmation banner
- **Installation** — difficulty rating, time estimate, and how-to video
- **Troubleshooting** — "My dishwasher won't drain" → parts that fix it, ranked by relevance
- **Shopping cart** — add parts from chat, view in slide-out panel, buy on PartSelect.com
- **Image attachments** — photograph a model tag or broken part, Claude vision identifies it
- **Scope guardrails** — politely declines anything outside refrigerator/dishwasher parts

## Architecture

```
Next.js 16 (port 3000)                    FastAPI (port 8000)
├── App Router + Tailwind CSS v4           ├── /api/chat (SSE streaming)
├── TypeScript components                  ├── /api/cart/* (cart CRUD)
├── SSE streaming client                   ├── /api/parts/{ps}
├── Static product images                  └── /api/health
└── Rewrites /api/* → FastAPI
                                           Claude Sonnet 4.6 (tool-use loop)
                                           ├── 8 tools (search, compat, troubleshoot...)
                                           └── Catalog retrieval (parts.json + models.json)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, marked |
| Backend | FastAPI, Python 3.13, Pydantic v2, uvicorn |
| AI | Claude Sonnet 4.6 (Anthropic SDK, streaming tool-use) |
| Data | Static JSON catalog (985 parts, 4,997 models) |
| Scraper | Playwright (offline, drives Chrome to bypass Akamai) |
| Testing | pytest (59 tests), Jest + Testing Library (56 tests) |

## Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Anthropic API key** (or access to a compatible proxy)

### macOS

```bash
# Clone
git clone https://github.com/mbarraza1/case-study.git
cd case-study

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env → set ANTHROPIC_API_KEY=sk-ant-...
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Windows

```powershell
# Clone
git clone https://github.com/mbarraza1/case-study.git
cd case-study

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env → set ANTHROPIC_API_KEY=sk-ant-...
cd ..

# Frontend
cd frontend
npm install
cd ..
```

## Run (two terminals)

### macOS

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

### Windows

```powershell
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

### Verify without an API key

```bash
curl http://localhost:8000/api/health        # catalog stats
curl http://localhost:8000/api/parts/PS11752778   # part details
```

## Try these

- Click **Dishwasher** → **Won't drain** (guided troubleshooting)
- `What parts do you have for my GNE27JYMWFFS?` (model lookup + compatibility banner)
- `Is PS11752778 compatible with my WDT780SAEM1?` (cross-appliance incompatibility)
- `How can I install part PS11752778?` (install guide with video)
- `The ice maker on my GE fridge isn't working` (symptom troubleshooting)
- Attach a photo of your model tag (vision identification)
- Click **Add to Cart** on any product card, then open the cart panel

## Tests

```bash
# Backend (59 tests — catalog, compatibility, tools, agent, cart, scraper)
cd backend
source .venv/bin/activate   # macOS
# .venv\Scripts\activate    # Windows
pytest

# Frontend (56 tests — components, API, SSE parsing)
cd frontend
npm test
```

Backend tests run against fixture data — no API key or network needed.

## Project Structure

```
case-study/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI endpoints (health, parts, cart, chat SSE)
│   │   ├── agent.py         # Claude streaming tool-use loop + system prompt
│   │   ├── tools.py         # 8 tool schemas + dispatch
│   │   ├── catalog.py       # Retrieval layer (search, compat, troubleshoot)
│   │   ├── cart.py          # In-memory cart storage
│   │   ├── schemas.py       # Pydantic request models
│   │   └── data/            # parts.json, models.json, images/
│   ├── scraper/             # Playwright catalog + image scrapers
│   └── tests/               # pytest suite
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (layout, page, globals.css)
│   │   ├── components/      # ChatWindow, ProductCard, CartPanel, etc.
│   │   └── lib/             # api.ts, session.ts, types.ts
│   ├── public/parts/        # Pre-cached product images (118)
│   ├── next.config.ts       # API rewrites, image config
│   └── jest.config.ts       # Test configuration
└── README.md
```

## Key Design Decisions

- **Grounded responses** — the agent can only surface data tools return from the catalog. It cannot invent part numbers, prices, or compatibility claims.
- **Prefix-stem matching** — "drain" matches "draining", "cool" matches "cooling". Fast deterministic retrieval without embeddings.
- **No filler text** — system prompt instructs Claude to call tools immediately and never narrate its search process.
- **Static images** — PartSelect's CDN is behind Akamai (403s all external requests). Images are pre-captured via Playwright and served as Next.js static files.
- **Session-based cart** — UUID in localStorage + backend in-memory store. Survives refresh, isolated per user.

## Extending

- **New tool** → add schema + handler in `backend/app/tools.py`
- **More data** → re-implement functions in `backend/app/catalog.py` (e.g., Postgres + pgvector)
- **More appliances** → widen scraper `--appliances` flag and system prompt scope
- **Production deployment** → add persistent cart storage (Redis/Postgres), proper session auth, rate limiting
