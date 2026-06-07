"""
PartSelect real cart integration via Playwright.

Maintains a persistent browser session on partselect.com and uses their
internal ShoppingCart API to add items to a real PartSelect cart. Returns
a shareable cart URL the user can open to complete checkout.
"""
from __future__ import annotations

import asyncio
from typing import Optional

_session: Optional["PSCartSession"] = None
_lock: Optional[asyncio.Lock] = None


def _get_lock() -> asyncio.Lock:
    global _lock
    if _lock is None:
        _lock = asyncio.Lock()
    return _lock


class PSCartSession:
    """A persistent Playwright browser session for PartSelect cart operations."""

    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.cart_guid: Optional[str] = None

    async def _ensure_session(self):
        """Start browser and establish a session if not already active."""
        if self.page and not self.page.is_closed():
            return

        from playwright.async_api import async_playwright
        pw = await async_playwright().start()
        self.browser = await pw.chromium.launch(
            channel="chrome", headless=True,
            args=["--disable-blink-features=AutomationControlled"])
        self.context = await self.browser.new_context(
            user_agent=("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
            viewport={"width": 1280, "height": 900})
        self.page = await self.context.new_page()
        # Visit PartSelect to establish cookies/session
        await self.page.goto("https://www.partselect.com", wait_until="domcontentloaded", timeout=15000)
        await self.page.wait_for_timeout(1500)

    async def add_to_cart(self, part_number: str, quantity: int = 1) -> dict:
        """Add a part to the real PartSelect cart. Returns cart info."""
        await self._ensure_session()
        inventory_id = part_number.replace("PS", "")

        result = await self.page.evaluate(f"""async () => {{
            const r = await fetch('/api/ShoppingCart/AddToCart?InventoryID={inventory_id}&quantity={quantity}&searchTerm=&source=0', {{
                method: 'POST',
                headers: {{'Content-Type': 'application/json'}},
            }});
            if (!r.ok) return {{error: true, status: r.status}};
            return await r.json();
        }}""")

        if result and not result.get("error"):
            self.cart_guid = result.get("shoppingCartGuid", self.cart_guid)

        return result

    def get_cart_url(self) -> Optional[str]:
        """Get the URL to view the real PartSelect cart."""
        if self.cart_guid:
            return f"https://www.partselect.com/ShoppingCart?CartGuid={self.cart_guid}"
        return None


async def get_session() -> PSCartSession:
    """Get or create the singleton PartSelect cart session."""
    global _session
    lock = _get_lock()
    async with lock:
        if _session is None:
            _session = PSCartSession()
        return _session


async def add_to_partselect_cart(part_number: str, quantity: int = 1) -> dict:
    """Add a part to the real PartSelect cart. Returns cart summary + URL."""
    session = await get_session()
    lock = _get_lock()
    async with lock:
        result = await session.add_to_cart(part_number, quantity)

    if result and not result.get("error"):
        items = result.get("orderItems", [])
        return {
            "success": True,
            "cartUrl": session.get_cart_url(),
            "itemCount": sum(i.get("quantity", 1) for i in items),
            "items": [{"partNumber": f"PS{i['inventoryID']}", "name": i.get("description"),
                       "quantity": i.get("quantity", 1), "price": i.get("unitPrice")}
                      for i in items],
            "total": result.get("orderTotal"),
        }
    return {"success": False, "error": "Could not add to PartSelect cart"}
