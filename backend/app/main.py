"""
FastAPI entrypoint for the PartSelect chat agent.

Endpoints:
  GET  /api/health          -> catalog stats (proves data loaded without an API key)
  GET  /api/parts/{ps}       -> one part (handy for the UI / debugging)
  POST /api/chat            -> Server-Sent Events stream of the agent's reply

The agent loop lives in agent.py; this module just wires HTTP + SSE + CORS.
"""
from __future__ import annotations

import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

load_dotenv()  # read backend/.env (ANTHROPIC_API_KEY)

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
