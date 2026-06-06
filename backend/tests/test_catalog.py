"""Tests for the retrieval/compatibility layer (catalog.py)."""
from app.catalog import _norm_model


# ---- loading & lookup ------------------------------------------------------ #
def test_stats(cat):
    s = cat.stats()
    assert s["parts"] == 4
    assert s["byApplianceType"]["Refrigerator"] == 2
    assert s["byApplianceType"]["Dishwasher"] == 2
    assert s["enriched"] == 4


def test_get_part_case_insensitive(cat):
    assert cat.get_part("PS11752778")["name"] == "Refrigerator Door Shelf Bin"
    assert cat.get_part("ps11752778") is not None          # lowercase
    assert cat.get_part("  PS11752778 ") is not None        # whitespace
    assert cat.get_part("PS000000") is None


def test_model_lookup_normalization(cat):
    assert cat.get_model("WDT780SAEM1")["applianceType"] == "Dishwasher"
    assert cat.get_model("wdt780saem1") is not None         # case
    assert cat.get_model("WDT-780-SAEM1") is not None       # punctuation
    assert cat.get_model("NOPE123") is None


def test_norm_model_helper():
    assert _norm_model("WDT-780 SAEM1") == "WDT780SAEM1"
    assert _norm_model("wdt780saem1") == "WDT780SAEM1"


# ---- search ---------------------------------------------------------------- #
def test_search_exact_ps_number_short_circuits(cat):
    res = cat.search("PS11752778")
    assert len(res) == 1 and res[0]["partNumber"] == "PS11752778"


def test_search_ps_number_embedded_in_sentence(cat):
    res = cat.search("how do I install PS3406971?")
    assert res[0]["partNumber"] == "PS3406971"


def test_search_by_symptom_keyword(cat):
    res = cat.search("ice maker")
    pns = [p["partNumber"] for p in res]
    # both the water inlet valve and the door bin reference the ice maker symptom
    assert "PS734936" in pns
    assert "PS11752778" in pns


def test_search_appliance_filter(cat):
    dish = cat.search("wheel", appliance_type="Dishwasher")
    assert [p["partNumber"] for p in dish] == ["PS3406971"]
    # a dishwasher-only query restricted to refrigerators returns nothing
    assert cat.search("wheel", appliance_type="Refrigerator") == []


def test_search_brand_filter(cat):
    assert all(p["brand"] == "Whirlpool" for p in cat.search("valve", brand="Whirlpool"))
    assert cat.search("valve", brand="Samsung") == []


def test_search_irrelevant_query_returns_empty(cat):
    assert cat.search("bicycle helmet") == []


# ---- compatibility --------------------------------------------------------- #
def test_compat_true_via_model_part_list(cat):
    r = cat.check_compatibility("PS11752778", "WRS325SDHZ08")
    assert r["compatible"] is True
    assert r["confidence"] == "high"


def test_compat_true_via_part_compatible_models(cat):
    r = cat.check_compatibility("PS3406971", "WDT780SAEM1")
    assert r["compatible"] is True
    assert r["confidence"] == "high"


def test_compat_false_on_appliance_mismatch(cat):
    # PS11752778 is a refrigerator part; WDT780SAEM1 is a dishwasher.
    r = cat.check_compatibility("PS11752778", "WDT780SAEM1")
    assert r["compatible"] is False
    assert r["confidence"] == "high"
    assert "refrigerator" in r["reason"].lower() and "dishwasher" in r["reason"].lower()


def test_compat_false_same_appliance_not_listed(cat):
    # Heating element isn't listed for the WDT750SAHZ0 dishwasher.
    r = cat.check_compatibility("PS11745496", "WDT750SAHZ0")
    assert r["compatible"] is False
    assert r["confidence"] == "medium"


def test_compat_unknown_model(cat):
    r = cat.check_compatibility("PS3406971", "ZZZ999UNKNOWN")
    assert r["compatible"] is None
    assert r["confidence"] == "unknown"


def test_compat_unknown_part(cat):
    r = cat.check_compatibility("PS000000", "WDT780SAEM1")
    assert r["compatible"] is None
    assert "couldn't find" in r["reason"].lower()


def test_compat_model_normalization(cat):
    # punctuation/case in the model number should still confirm the fit
    r = cat.check_compatibility("PS3406971", "wdt-780-saem1")
    assert r["compatible"] is True


# ---- troubleshooting ------------------------------------------------------- #
def test_troubleshoot_ranks_symptom_matches(cat):
    res = cat.troubleshoot("Refrigerator", "ice maker not working")
    pns = [p["partNumber"] for p in res]
    assert "PS734936" in pns                       # valve fixes ice symptoms
    # dishwasher parts must not appear for a refrigerator symptom
    assert "PS3406971" not in pns and "PS11745496" not in pns


def test_troubleshoot_respects_appliance(cat):
    res = cat.troubleshoot("Dishwasher", "not drying dishes")
    assert "PS11745496" in [p["partNumber"] for p in res]
