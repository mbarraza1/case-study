"""
FastAPI entrypoint for the PartSelect chat agent.

Endpoints:
  GET  /api/health          -> catalog stats (proves data loaded without an API key)
  GET  /api/parts/{ps}       -> one part (handy for the UI / debugging)
  POST /api/chat            -> Server-Sent Events stream of the agent's reply

The agent loop lives in agent.py; this module just wires HTTP + SSE + CORS.
Images are served as static files from the Next.js frontend (public/parts/).
"""
from __future__ import annotations

import json
import os

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Load backend/.env explicitly (relative to this file) so it's found no matter
# which directory uvicorn was launched from.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from .agent import run_agent          # noqa: E402  (after load_dotenv)
from .cart import add_to_cart, get_cart, remove_from_cart  # noqa: E402
from .catalog import catalog          # noqa: E402
from .partselect_cart import add_to_partselect_cart  # noqa: E402
from .schemas import CartAddRequest, CartRemoveRequest, ChatRequest  # noqa: E402

app = FastAPI(title="PartSelect Assistant API", version="1.0.0")

# CRA dev server runs on :3000; allow it (and common alternatives).
_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ---- Cart endpoints -------------------------------------------------------- #
from fastapi import Header  # noqa: E402


def _session(x_session_id: str = Header(default="default")) -> str:
    return x_session_id or "default"


@app.get("/api/cart")
def api_get_cart(session_id: str = Header(default="default", alias="x-session-id")):
    return {"items": get_cart(session_id), "itemCount": sum(
        i.get("quantity", 1) for i in get_cart(session_id))}


@app.post("/api/cart/add")
def api_add_to_cart(req: CartAddRequest,
                    session_id: str = Header(default="default", alias="x-session-id")):
    items = add_to_cart(session_id, req.partNumber, req.quantity)
    return {"items": items, "itemCount": sum(i.get("quantity", 1) for i in items)}


@app.post("/api/cart/remove")
def api_remove_from_cart(req: CartRemoveRequest,
                         session_id: str = Header(default="default", alias="x-session-id")):
    items = remove_from_cart(session_id, req.partNumber)
    return {"items": items, "itemCount": sum(i.get("quantity", 1) for i in items)}


@app.post("/api/cart/partselect")
async def api_add_to_partselect(req: CartAddRequest):
    """Add a part to the real PartSelect.com cart. Returns a cart URL."""
    result = await add_to_partselect_cart(req.partNumber, req.quantity)
    return result




def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest,
               session_id: str = Header(default="default", alias="x-session-id")):
    history = [{"role": m.role, "content": m.content,
                 "images": [img.model_dump() for img in m.images] if m.images else None}
                for m in req.messages]

    async def stream():
        # an initial comment keeps some proxies from buffering the stream
        yield ": connected\n\n"
        async for event in run_agent(history, session_id=session_id):
            yield _sse(event)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
