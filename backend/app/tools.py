"""
Agent tools: the only way the model touches catalog data.

Each tool returns a (model_payload, ui_events) pair:
  - model_payload : compact JSON string fed back to Claude as the tool_result.
  - ui_events     : structured events streamed to the React app so it can render
                    product cards / compatibility verdicts / install guides
                    instead of plain text.

Keeping these tools as the sole data interface is what keeps the agent grounded:
it can't invent a part number, price, or model fit — it can only report what the
catalog returns.
"""
from __future__ import annotations

import json

from .cart import add_to_cart, cart_summary, get_cart
from .catalog import _card, catalog

# --------------------------------------------------------------------------- #
# Tool schemas (Anthropic tool-use format)
# --------------------------------------------------------------------------- #
TOOLS = [
    {
        "name": "search_parts",
        "description": (
            "Search the PartSelect Refrigerator and Dishwasher catalog for parts by name, "
            "part type, brand, or the problem the customer describes. Use this when the user "
            "is looking for a part but hasn't given an exact PartSelect (PS) number — e.g. "
            "'door bin for my Whirlpool fridge' or 'dishwasher spray arm'. Returns matching "
            "parts with price, stock, and ratings."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What the user is looking for (symptom, part name, or keywords)."},
                "appliance_type": {"type": "string", "enum": ["Refrigerator", "Dishwasher"],
                                   "description": "Restrict to this appliance if known."},
                "brand": {"type": "string", "description": "Restrict to a brand (e.g. Whirlpool, GE) if known."},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_part_details",
        "description": (
            "Look up one specific part by its PartSelect number (e.g. PS11752778). Returns full "
            "details: price, stock, rating, what symptoms it fixes, install difficulty/time, and "
            "whether a how-to video exists. Use when the user names a PS number."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "part_number": {"type": "string", "description": "PartSelect number, e.g. PS11752778."},
            },
            "required": ["part_number"],
        },
    },
    {
        "name": "check_compatibility",
        "description": (
            "Check whether a specific part fits a specific appliance model number "
            "(e.g. is PS11752778 compatible with model WDT780SAEM1?). Use whenever the user asks "
            "if a part works with their model. Returns a clear yes/no/uncertain verdict with the reason."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "part_number": {"type": "string", "description": "PartSelect number of the part."},
                "model_number": {"type": "string", "description": "The appliance model number, e.g. WDT780SAEM1."},
            },
            "required": ["part_number", "model_number"],
        },
    },
    {
        "name": "get_installation_guide",
        "description": (
            "Get installation guidance for a part by its PartSelect number: difficulty level, "
            "estimated time, and a how-to video link if available. Use when the user asks how to "
            "install or replace a specific part."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "part_number": {"type": "string", "description": "PartSelect number, e.g. PS11752778."},
            },
            "required": ["part_number"],
        },
    },
    {
        "name": "get_parts_for_model",
        "description": (
            "List the parts that fit a specific appliance model number (e.g. "
            "'what parts do you have for my GNE27JYMWFFS?'). Use when the user wants to see "
            "available/compatible parts for their model rather than asking about one specific part. "
            "Returns the model's parts; if the model isn't in the catalog, says so."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "model_number": {"type": "string", "description": "The appliance model number, e.g. GNE27JYMWFFS."},
            },
            "required": ["model_number"],
        },
    },
    {
        "name": "troubleshoot",
        "description": (
            "Given an appliance type and a symptom the customer is experiencing (e.g. 'ice maker not "
            "working', 'dishwasher won't drain', 'leaking'), suggest the parts that most commonly fix "
            "it. Use for diagnostic questions where the user describes a problem rather than a part."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "appliance_type": {"type": "string", "enum": ["Refrigerator", "Dishwasher"]},
                "symptom": {"type": "string", "description": "The problem, e.g. 'ice maker not working'."},
                "brand": {"type": "string", "description": "Brand if mentioned (e.g. Whirlpool)."},
            },
            "required": ["appliance_type", "symptom"],
        },
    },
    {
        "name": "add_to_cart",
        "description": (
            "Add a part to the customer's shopping cart by its PartSelect number. Use when the "
            "customer says they want to buy a part, add it to their cart, or says 'I'll take it'. "
            "Returns the updated cart summary."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "part_number": {"type": "string", "description": "PartSelect number, e.g. PS11752778."},
            },
            "required": ["part_number"],
        },
    },
    {
        "name": "get_cart",
        "description": (
            "Show the customer's current shopping cart contents, including all items, quantities, "
            "and total price. Use when the customer asks to see their cart, check what's in it, "
            "or wants to review before buying."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


# --------------------------------------------------------------------------- #
# Dispatch
# --------------------------------------------------------------------------- #
def _install_guide(part: dict) -> dict:
    return {
        "partNumber": part.get("partNumber"),
        "name": part.get("name"),
        "brand": part.get("brand"),
        "applianceType": part.get("applianceType"),
        "difficulty": part.get("difficulty"),
        "installTime": part.get("installTime"),
        "videoUrl": part.get("installVideoUrl"),
        "url": part.get("url"),
    }


def run_tool(name: str, tool_input: dict, session_id: str = "default") -> tuple[str, list[dict]]:
    """Execute a tool. Returns (model_payload_json, ui_events)."""
    if name == "search_parts":
        parts = catalog.search(
            tool_input.get("query", ""),
            appliance_type=tool_input.get("appliance_type"),
            brand=tool_input.get("brand"),
        )
        cards = [_card(p) for p in parts]
        payload = {
            "count": len(cards),
            "parts": [
                {k: c[k] for k in ("partNumber", "name", "brand", "applianceType", "partType",
                                   "price", "inStock", "rating", "reviewCount", "difficulty")}
                for c in cards
            ],
        }
        events = [{"type": "products", "items": cards}] if cards else []
        return json.dumps(payload), events

    if name == "get_part_details":
        part = catalog.get_part(tool_input.get("part_number", ""))
        if not part:
            return json.dumps({"found": False, "partNumber": tool_input.get("part_number")}), []
        card = _card(part)
        payload = {
            "found": True,
            **{k: part.get(k) for k in ("partNumber", "mpn", "name", "brand", "applianceType",
                                        "partType", "price", "inStock", "rating", "reviewCount",
                                        "difficulty", "installTime", "symptoms", "description")},
            "hasVideo": bool(part.get("installVideoUrl")),
        }
        return json.dumps(payload), [{"type": "products", "items": [card]}]

    if name == "check_compatibility":
        result = catalog.check_compatibility(
            tool_input.get("part_number", ""), tool_input.get("model_number", ""))
        model_payload = {k: result[k] for k in (
            "partNumber", "modelNumber", "compatible", "confidence", "reason",
            "modelKnown", "modelBrand", "modelApplianceType")}
        return json.dumps(model_payload), [{"type": "compatibility", "result": result}]

    if name == "get_installation_guide":
        part = catalog.get_part(tool_input.get("part_number", ""))
        if not part:
            return json.dumps({"found": False, "partNumber": tool_input.get("part_number")}), []
        guide = _install_guide(part)
        return json.dumps({"found": True, **guide}), [{"type": "install_guide", "guide": guide}]

    if name == "get_parts_for_model":
        model = tool_input.get("model_number", "")
        info = catalog.get_model(model)
        parts = catalog.parts_for_model(model)
        cards = [_card(p) for p in parts]
        payload = {
            "modelNumber": (model or "").strip().upper(),
            "modelKnown": info is not None,
            "modelBrand": info.get("brand") if info else None,
            "modelApplianceType": info.get("applianceType") if info else None,
            "count": len(cards),
            "parts": [{k: c[k] for k in ("partNumber", "name", "brand", "partType", "price", "inStock")}
                      for c in cards],
        }
        # If model not found, suggest similar models
        if not info:
            suggestions = catalog.suggest_models(model)
            if suggestions:
                payload["suggestedModels"] = [
                    {"model": s.get("model", ""), "brand": s.get("brand"), "applianceType": s.get("applianceType")}
                    for s in suggestions
                ]
        events = []
        if info and cards:
            events.append({"type": "compatibility", "result": {
                "partNumber": None,
                "modelNumber": (model or "").strip().upper(),
                "compatible": True,
                "confidence": "high",
                "reason": f"All {len(cards)} parts below are confirmed compatible with model {(model or '').strip().upper()}.",
                "part": None,
                "modelKnown": True,
                "modelBrand": info.get("brand"),
                "modelApplianceType": info.get("applianceType"),
            }})
        if cards:
            events.append({"type": "products", "items": cards})
        return json.dumps(payload), events

    if name == "troubleshoot":
        parts = catalog.troubleshoot(
            tool_input.get("appliance_type", ""),
            tool_input.get("symptom", ""),
            brand=tool_input.get("brand"),
        )
        cards = [_card(p) for p in parts]
        payload = {
            "count": len(cards),
            "symptom": tool_input.get("symptom"),
            "parts": [
                {**{k: c[k] for k in ("partNumber", "name", "brand", "price", "difficulty")},
                 "fixesSymptoms": p.get("symptoms", [])[:5]}
                for c, p in zip(cards, parts)
            ],
        }
        events = [{"type": "products", "items": cards}] if cards else []
        return json.dumps(payload), events

    if name == "add_to_cart":
        ps = tool_input.get("part_number", "")
        items = add_to_cart(session_id, ps)
        summary = cart_summary(session_id)
        return json.dumps(summary), [{"type": "cart_update", "cart": summary}]

    if name == "get_cart":
        items = get_cart(session_id)
        summary = cart_summary(session_id)
        return json.dumps(summary), [{"type": "cart", "items": items, "summary": summary}]

    return json.dumps({"error": f"unknown tool {name}"}), []
