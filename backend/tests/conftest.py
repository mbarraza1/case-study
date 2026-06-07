"""Shared pytest fixtures: a deterministic catalog built from tests/fixtures."""
from pathlib import Path

import pytest

from app.catalog import Catalog

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def cat() -> Catalog:
    """A Catalog loaded from the fixed fixture dataset (not the live scrape)."""
    return Catalog(FIXTURES)


@pytest.fixture
def tools_catalog(monkeypatch, cat):
    """Point tools.run_tool at the fixture catalog instead of the app singleton."""
    import app.tools as tools_mod
    import app.cart as cart_mod
    monkeypatch.setattr(tools_mod, "catalog", cat)
    monkeypatch.setattr(cart_mod, "catalog", cat)
    return cat
