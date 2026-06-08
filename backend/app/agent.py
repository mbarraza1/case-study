"""
The PartSelect chat agent: a streaming Claude tool-use loop.

run_agent() is an async generator that yields UI events:
  {"type":"text","text":...}            incremental assistant text
  {"type":"tool_start","label":...}     a "Searching parts…" status pill
  {"type":"products"|"compatibility"|"install_guide", ...}  structured cards
  {"type":"done"} | {"type":"error","message":...}

Model: claude-sonnet-4-6 with adaptive thinking. The loop streams text, runs any
tools Claude calls (grounding every fact in the catalog), forwards the card
events, and continues until Claude stops calling tools.
"""
from __future__ import annotations

import os
from typing import AsyncIterator

import httpx
from anthropic import AsyncAnthropic

from .tools import TOOLS, run_tool

MODEL = "claude-sonnet-4-6"
MAX_TOOL_TURNS = 6
MAX_TOKENS = 2048

# Reuse a single HTTP client across requests (connection pooling)
_http_client = httpx.AsyncClient(verify=False)

SYSTEM_PROMPT = """You are the PartSelect Assistant, the chat agent on PartSelect.com — a retailer of \
appliance repair parts. You help customers with **Refrigerator parts** and **Dishwasher parts** only.

What you help with:
- Finding the right part (by name, symptom, brand, or PartSelect "PS" number).
- Looking up part details: price, availability, ratings, and what it fixes.
- Checking whether a part is compatible with a customer's appliance model number.
- Listing the parts available for a specific appliance model number.
- Installation guidance (difficulty, time, how-to video).
- Troubleshooting a symptom and recommending the parts that typically fix it.
- Adding parts to the customer's cart and showing their cart contents.

How to work:
- ALWAYS use your tools to get facts. Never invent or guess a part number, price, model fit, \
or stock status — if a tool doesn't return it, say you don't have it.
- When the customer names a PS number, look it up. When they describe a problem, search or \
troubleshoot. When they ask "does this fit my model X", check compatibility.
- IMPORTANT: Call tools IMMEDIATELY without filler text. Do NOT say "Let me look that up" or \
"I'll search for that" before calling a tool — just call it directly. Only respond with your \
helpful message AFTER all tool calls are done and you have the final data.
- NEVER narrate your process or comment on result quality. NEVER say things like "the results \
aren't closely matched", "let me try again", "let me do a more targeted search", or "the results \
I got back". Just give your answer based on what the tools returned. If the data is limited, work \
with it — don't tell the user the internal results were poor.
- The customer's UI renders product cards, compatibility verdicts, and install guides from your \
tool results automatically. So DON'T paste raw JSON or repeat every field — give a short, helpful, \
conversational reply that adds value (the key takeaway, the recommendation, the next step). Refer \
to parts by name and PS number.
- If you need the model number to check compatibility, or the symptom to recommend a part, ask for it.
- Resolve references like "this part" / "it" from the conversation so far.

Scope and tone:
- You ONLY cover Refrigerator and Dishwasher parts and related PartSelect support. If the customer \
asks about anything else — other appliances (washers, dryers, ovens, microwaves), general chit-chat, \
coding, world facts, etc. — politely decline and steer back: e.g. "I can only help with refrigerator \
and dishwasher parts here. Is there an appliance part I can help you find?" Do not answer the \
off-topic question.
- Be warm, concise, and practical, like a knowledgeable parts specialist. Use plain text (no tables)."""

TOOL_LABELS = {
    "search_parts": "Searching the parts catalog…",
    "get_part_details": "Looking up the part…",
    "check_compatibility": "Checking compatibility…",
    "get_parts_for_model": "Finding parts for your model…",
    "get_installation_guide": "Finding the installation guide…",
    "troubleshoot": "Diagnosing the problem…",
    "add_to_cart": "Adding to your cart…",
    "get_cart": "Loading your cart…",
}


def _build_content(m: dict):
    """Build Anthropic content from a message, including images if present."""
    images = m.get("images") or []
    if not images:
        return m["content"] or "."
    # Multimodal: image blocks + text block
    content = []
    for img in images:
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": img["mediaType"],
                "data": img["data"],
            },
        })
    # Always include a text block — Claude needs a prompt with images
    text = m["content"] or "What can you tell me about this image?"
    content.append({"type": "text", "text": text})
    return content


def sanitize_messages(history: list[dict]) -> list[dict]:
    """Normalize incoming history into a valid Anthropic `messages` array.

    Anthropic requires the first message to be a user turn, but the UI's opening
    welcome line is an assistant message — so drop any leading assistant turns.
    Converts image attachments into Anthropic's multimodal content format.
    """
    messages = [{"role": m["role"], "content": _build_content(m)} for m in history]
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    return messages


async def run_agent(history: list[dict], session_id: str = "default") -> AsyncIterator[dict]:
    if not os.getenv("ANTHROPIC_API_KEY"):
        yield {"type": "error",
               "message": "The server has no ANTHROPIC_API_KEY set. Add one to backend/.env and restart."}
        return

    messages = sanitize_messages(history)
    if not messages:
        yield {"type": "error", "message": "No user message to respond to."}
        return

    client = AsyncAnthropic(http_client=_http_client)
    try:
        emitted_text = False
        for _ in range(MAX_TOOL_TURNS):
            async with client.messages.stream(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            ) as stream:
                first_text_in_turn = True
                async for event in stream:
                    if event.type == "content_block_delta" and event.delta.type == "text_delta":
                        if first_text_in_turn and emitted_text:
                            yield {"type": "text", "text": "\n\n"}
                        first_text_in_turn = False
                        emitted_text = True
                        yield {"type": "text", "text": event.delta.text}
                final = await stream.get_final_message()

            messages.append({"role": "assistant", "content": final.content})
            tool_uses = [b for b in final.content if getattr(b, "type", None) == "tool_use"]
            if final.stop_reason != "tool_use" or not tool_uses:
                break

            tool_results = []
            for tu in tool_uses:
                yield {"type": "tool_start", "name": tu.name,
                       "label": TOOL_LABELS.get(tu.name, "Working…")}
                payload, ui_events = run_tool(tu.name, dict(tu.input or {}), session_id=session_id)
                for ev in ui_events:
                    yield ev
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": payload,
                })
            messages.append({"role": "user", "content": tool_results})

        yield {"type": "done"}
    except Exception as e:  # noqa: BLE001
        yield {"type": "error", "message": f"{type(e).__name__}: {e}"}
