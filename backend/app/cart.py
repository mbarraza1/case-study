"""
In-memory cart storage, keyed by session ID.

Each session has a dict of {part_number: quantity}. The cart is enriched
with catalog data when retrieved for display.
"""
from __future__ import annotations

from .catalog import _card, catalog

_carts: dict[str, dict[str, int]] = {}


def get_cart(session_id: str) -> list[dict]:
    """Return enriched cart items for a session."""
    cart = _carts.get(session_id, {})
    items = []
    for ps, qty in cart.items():
        part = catalog.get_part(ps)
        if part:
            card = _card(part)
            card["quantity"] = qty
            card["url"] = part.get("url")
            items.append(card)
    return items


def add_to_cart(session_id: str, part_number: str, quantity: int = 1) -> list[dict]:
    """Add a part to the cart (or increment quantity). Returns updated cart."""
    ps = part_number.strip().upper()
    if not catalog.get_part(ps):
        return get_cart(session_id)
    cart = _carts.setdefault(session_id, {})
    cart[ps] = cart.get(ps, 0) + quantity
    return get_cart(session_id)


def remove_from_cart(session_id: str, part_number: str) -> list[dict]:
    """Remove a part from the cart entirely. Returns updated cart."""
    ps = part_number.strip().upper()
    cart = _carts.get(session_id, {})
    cart.pop(ps, None)
    return get_cart(session_id)


def clear_cart(session_id: str) -> list[dict]:
    """Empty the cart. Returns empty list."""
    _carts.pop(session_id, None)
    return []


def cart_summary(session_id: str) -> dict:
    """Compact summary for the agent's tool result."""
    items = get_cart(session_id)
    total = sum((item.get("price") or 0) * item.get("quantity", 1) for item in items)
    return {
        "itemCount": sum(item.get("quantity", 1) for item in items),
        "uniqueItems": len(items),
        "total": round(total, 2),
        "items": [{"partNumber": i["partNumber"], "name": i["name"],
                   "price": i.get("price"), "quantity": i["quantity"]}
                  for i in items],
    }
