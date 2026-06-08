"""Tests for cart storage and cart tool dispatch."""
import json

import pytest

from app.cart import _carts, add_to_cart, cart_summary, clear_cart, get_cart, remove_from_cart
from app.tools import TOOLS, run_tool


@pytest.fixture(autouse=True)
def clear_carts():
    """Reset cart state between tests."""
    _carts.clear()
    yield
    _carts.clear()


# ---- cart.py unit tests ---- #

def test_add_to_cart_creates_entry(tools_catalog):
    items = add_to_cart("s1", "PS11752778")
    assert len(items) == 1
    assert items[0]["partNumber"] == "PS11752778"
    assert items[0]["quantity"] == 1


def test_add_to_cart_increments_quantity(tools_catalog):
    add_to_cart("s1", "PS11752778")
    items = add_to_cart("s1", "PS11752778")
    assert items[0]["quantity"] == 2


def test_add_to_cart_unknown_part_ignored(tools_catalog):
    items = add_to_cart("s1", "PSNOTREAL")
    assert items == []


def test_get_cart_empty(tools_catalog):
    items = get_cart("s1")
    assert items == []


def test_get_cart_returns_enriched_items(tools_catalog):
    add_to_cart("s1", "PS11752778")
    items = get_cart("s1")
    assert items[0]["name"] == "Refrigerator Door Shelf Bin"
    assert items[0]["price"] == 47.40
    assert "quantity" in items[0]


def test_remove_from_cart(tools_catalog):
    add_to_cart("s1", "PS11752778")
    add_to_cart("s1", "PS3406971")
    items = remove_from_cart("s1", "PS11752778")
    assert len(items) == 1
    assert items[0]["partNumber"] == "PS3406971"


def test_remove_nonexistent_is_noop(tools_catalog):
    add_to_cart("s1", "PS11752778")
    items = remove_from_cart("s1", "PSNOTREAL")
    assert len(items) == 1


def test_clear_cart(tools_catalog):
    add_to_cart("s1", "PS11752778")
    add_to_cart("s1", "PS3406971")
    items = clear_cart("s1")
    assert items == []
    assert get_cart("s1") == []


def test_cart_summary(tools_catalog):
    add_to_cart("s1", "PS11752778")
    add_to_cart("s1", "PS11752778")
    add_to_cart("s1", "PS3406971")
    summary = cart_summary("s1")
    assert summary["itemCount"] == 3
    assert summary["uniqueItems"] == 2
    assert summary["total"] == round(47.40 * 2 + 9.86, 2)


def test_sessions_are_isolated(tools_catalog):
    add_to_cart("s1", "PS11752778")
    add_to_cart("s2", "PS3406971")
    assert len(get_cart("s1")) == 1
    assert get_cart("s1")[0]["partNumber"] == "PS11752778"
    assert len(get_cart("s2")) == 1
    assert get_cart("s2")[0]["partNumber"] == "PS3406971"


# ---- tool dispatch tests ---- #

def test_add_to_cart_tool(tools_catalog):
    payload, events = run_tool("add_to_cart", {"part_number": "PS11752778"}, session_id="t1")
    data = json.loads(payload)
    assert data["itemCount"] == 1
    assert data["items"][0]["partNumber"] == "PS11752778"
    assert events[0]["type"] == "cart_update"
    assert events[0]["cart"]["total"] == 47.40


def test_get_cart_tool_empty(tools_catalog):
    payload, events = run_tool("get_cart", {}, session_id="t2")
    data = json.loads(payload)
    assert data["itemCount"] == 0
    assert events[0]["type"] == "cart"
    assert events[0]["items"] == []


def test_get_cart_tool_with_items(tools_catalog):
    run_tool("add_to_cart", {"part_number": "PS11752778"}, session_id="t3")
    payload, events = run_tool("get_cart", {}, session_id="t3")
    data = json.loads(payload)
    assert data["itemCount"] == 1
    assert events[0]["type"] == "cart"
    assert len(events[0]["items"]) == 1
