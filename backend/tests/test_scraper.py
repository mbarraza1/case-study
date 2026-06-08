"""Tests for the scraper's pure parsing helpers (no browser needed)."""
from scraper.scrape import parse_part_url, scrape_card


# ---- parse_part_url -------------------------------------------------------- #
def test_parse_part_url_full_slug():
    ps, brand, mpn, name = parse_part_url(
        "/PS11752778-Whirlpool-WPW10321304-Refrigerator-Door-Shelf-Bin.htm")
    assert ps == "PS11752778"
    assert brand == "Whirlpool"
    assert mpn == "WPW10321304"
    assert name == "Refrigerator Door Shelf Bin"


def test_parse_part_url_strips_query_and_hash():
    ps, *_ = parse_part_url("/PS3406971-Whirlpool-W10195416-Lower-Dishrack-Wheel.htm?SourceCode=18#Instructions")
    assert ps == "PS3406971"


def test_parse_part_url_non_part():
    ps, brand, mpn, name = parse_part_url("/Dishwasher-Spray-Arms.htm")
    assert ps is None


# ---- scrape_card ----------------------------------------------------------- #
LISTING_TEXT = (
    "Videos! Your Price $43.18 In Stock Add to cart Dishwasher Lower Spray Arm "
    "★★★★★ 152 Reviews PartSelect Number PS12585623 Manufacturer Part Number "
    "5304517203 The Lower Spray Arm is used in your dishwasher to spray water."
)


def test_scrape_card_extracts_fields():
    card = {
        "href": "/PS12585623-Frigidaire-5304517203-Dishwasher-Lower-Spray-Arm.htm?SourceCode=18",
        "title": "Dishwasher Lower Spray Arm",
        "text": LISTING_TEXT,
    }
    rec = scrape_card(card, "Dishwasher", "Dishwasher Spray Arms")
    assert rec["partNumber"] == "PS12585623"
    assert rec["mpn"] == "5304517203"
    assert rec["name"] == "Dishwasher Lower Spray Arm"
    assert rec["brand"] == "Frigidaire"
    assert rec["applianceType"] == "Dishwasher"
    assert rec["partType"] == "Dishwasher Spray Arms"
    assert rec["price"] == 43.18
    assert rec["reviewCount"] == 152
    assert rec["inStock"] is True
    assert rec["enriched"] is False


def test_scrape_card_handles_missing_price_and_stock():
    card = {
        "href": "/PS999-Whirlpool-W999-Some-Part.htm",
        "title": "Some Part",
        "text": "PartSelect Number PS999 Manufacturer Part Number W999 backordered",
    }
    rec = scrape_card(card, "Refrigerator", "Valves")
    assert rec["price"] is None
    assert rec["inStock"] is False


def test_scrape_card_returns_none_without_ps():
    card = {"href": "/Dishwasher-Parts.htm", "title": "Dishwasher", "text": "no part here"}
    assert scrape_card(card, "Dishwasher", "x") is None
