"""
FastAPI entrypoint for the PartSelect chat agent.

Endpoints:
  GET  /api/health          -> catalog stats (proves data loaded without an API key)
  GET  /api/parts/{ps}       -> one part (handy for the UI / debugging)
  GET  /api/image/{ps}       -> proxied product image (fetches from CDN, caches locally)
  POST /api/chat            -> Server-Sent Events stream of the agent's reply

The agent loop lives in agent.py; this module just wires HTTP + SSE + CORS.
"""
from __future__ import annotations

import json
import os

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Load backend/.env explicitly (relative to this file) so it's found no matter
# which directory uvicorn was launched from.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .agent import run_agent          # noqa: E402  (after load_dotenv)
from .catalog import catalog          # noqa: E402
from .schemas import ChatRequest      # noqa: E402

app = FastAPI(title="PartSelect Assistant API", version="1.0.0")

# CRA dev server runs on :3000; allow it (and common alternatives).
_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Self-hosted product images (downloaded by scraper/download_images.py).
# Served at /static/parts/<PS>.png — see catalog imageUrl.
_IMAGES_DIR = Path(__file__).resolve().parent / "data" / "images"
_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/parts", StaticFiles(directory=_IMAGES_DIR), name="part-images")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "catalogLoaded": catalog.loaded,
        "hasApiKey": bool(os.getenv("ANTHROPIC_API_KEY")),
        "catalog": catalog.stats(),
    }


@app.get("/api/parts/{part_number}")
def get_part(part_number: str):
    part = catalog.get_part(part_number)
    if not part:
        raise HTTPException(status_code=404, detail=f"Part {part_number} not found")
    return part


# Image proxy: serves locally-cached images, or fetches on-demand via a
# Playwright browser session (the only way past PartSelect's Akamai CDN).
_img_lock = None  # initialized lazily to avoid import-time event loop issues


def _get_img_lock():
    global _img_lock
    if _img_lock is None:
        import asyncio
        _img_lock = asyncio.Lock()
    return _img_lock


async def _fetch_image_via_browser(part: dict) -> bytes | None:
    """Fetch a product image by visiting its page and intercepting the CDN response."""
    import asyncio
    from playwright.async_api import async_playwright

    ps_num = part["partNumber"].replace("PS", "")
    captured = None

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            channel="chrome", headless=True,
            args=["--disable-blink-features=AutomationControlled"])
        ctx = await browser.new_context(
            user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
            viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()

        async def on_response(response):
            nonlocal captured
            if captured:
                return
            url = response.url
            # Match any medium-size image for this part (e.g. -1-M-, -2-M-, -3-M-)
            if "azurefd.net" in url and f"{ps_num}-" in url and "-M-" in url and response.status == 200:
                try:
                    body = await response.body()
                    if len(body) > 2000:
                        captured = body
                except Exception:
                    pass

        page.on("response", on_response)
        try:
            await page.goto(part["url"], wait_until="domcontentloaded", timeout=20000)
            for _ in range(8):
                if captured:
                    break
                await page.wait_for_timeout(500)
        except Exception:
            pass
        await browser.close()
    return captured


@app.get("/api/image/{part_number}")
async def get_image(part_number: str):
    ps = part_number.strip().upper()
    # Serve from local cache (supports both .jpg and .png from different downloaders)
    for ext in (".jpg", ".png"):
        cached = _IMAGES_DIR / f"{ps}{ext}"
        if cached.exists():
            media = "image/jpeg" if ext == ".jpg" else "image/png"
            return Response(content=cached.read_bytes(), media_type=media,
                            headers={"Cache-Control": "public, max-age=604800"})
    # Look up part
    part = catalog.get_part(ps)
    if not part or not part.get("url"):
        raise HTTPException(status_code=404, detail="No image available")
    # Fetch on-demand via browser (one at a time to avoid rate limiting)
    lock = _get_img_lock()
    async with lock:
        # Double-check cache (another request may have fetched it while we waited)
        for ext in (".jpg", ".png"):
            cached = _IMAGES_DIR / f"{ps}{ext}"
            if cached.exists():
                media = "image/jpeg" if ext == ".jpg" else "image/png"
                return Response(content=cached.read_bytes(), media_type=media,
                                headers={"Cache-Control": "public, max-age=604800"})
        img_bytes = await _fetch_image_via_browser(part)
    if img_bytes:
        out = _IMAGES_DIR / f"{ps}.jpg"
        out.write_bytes(img_bytes)
        return Response(content=img_bytes, media_type="image/jpeg",
                        headers={"Cache-Control": "public, max-age=604800"})
    raise HTTPException(status_code=502, detail="Could not fetch image from CDN")


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest):
    history = [{"role": m.role, "content": m.content} for m in req.messages]

    async def stream():
        # an initial comment keeps some proxies from buffering the stream
        yield ": connected\n\n"
        async for event in run_agent(history):
            yield _sse(event)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
