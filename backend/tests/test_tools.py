"""Tests for the agent tool layer (tools.py): payloads + UI card events."""
import json

from app.tools import TOOLS, run_tool


def test_tool_schemas_wellformed():
    names = {t["name"] for t in TOOLS}
    assert names == {
        "search_parts", "get_part_details", "check_compatibility",
        "get_parts_for_model", "get_installation_guide", "troubleshoot",
        "add_to_cart", "get_cart",
    }
    for t in TOOLS:
        assert t["input_schema"]["type"] == "object"
        assert "required" in t["input_schema"]


def test_search_parts_returns_cards(tools_catalog):
    payload, events = run_tool("search_parts", {"query": "ice maker"})
    data = json.loads(payload)
    assert data["count"] >= 1
    assert len(events) == 1 and events[0]["type"] == "products"
    assert events[0]["items"]                     # cards present
    assert "partNumber" in events[0]["items"][0]


def test_search_parts_no_match(tools_catalog):
    payload, events = run_tool("search_parts", {"query": "bicycle"})
    assert json.loads(payload)["count"] == 0
    assert events == []                           # no card block emitted


def test_get_part_details_found(tools_catalog):
    payload, events = run_tool("get_part_details", {"part_number": "PS11752778"})
    data = json.loads(payload)
    assert data["found"] is True
    assert data["symptoms"]                       # enriched symptom list
    assert events[0]["type"] == "products"
    card = events[0]["items"][0]
    assert card["partNumber"] == "PS11752778"
    assert "installVideoUrl" in card   # must be present so the frontend can link to it


def test_get_part_details_not_found(tools_catalog):
    payload, events = run_tool("get_part_details", {"part_number": "PS000000"})
    assert json.loads(payload)["found"] is False
    assert events == []


def test_check_compatibility_event(tools_catalog):
    payload, events = run_tool(
        "check_compatibility", {"part_number": "PS11752778", "model_number": "WDT780SAEM1"})
    data = json.loads(payload)
    assert data["compatible"] is False
    assert events[0]["type"] == "compatibility"
    assert events[0]["result"]["partNumber"] == "PS11752778"


def test_get_installation_guide_event(tools_catalog):
    payload, events = run_tool("get_installation_guide", {"part_number": "PS11752778"})
    data = json.loads(payload)
    assert data["found"] is True
    assert events[0]["type"] == "install_guide"
    guide = events[0]["guide"]
    assert guide["difficulty"] == "Easy"
    assert guide["videoUrl"]


def test_troubleshoot_event(tools_catalog):
    payload, events = run_tool(
        "troubleshoot", {"appliance_type": "Refrigerator", "symptom": "ice maker not working"})
    data = json.loads(payload)
    assert data["count"] >= 1
    assert events[0]["type"] == "products"
    # the model payload includes which symptoms each part fixes
    assert "fixesSymptoms" in data["parts"][0]


def test_get_parts_for_model(tools_catalog):
    payload, events = run_tool("get_parts_for_model", {"model_number": "WDT780SAEM1"})
    data = json.loads(payload)
    assert data["modelKnown"] is True
    assert data["modelApplianceType"] == "Dishwasher"
    assert data["count"] == 2                      # PS3406971 + PS11745496 in the fixture
    assert events[0]["type"] == "compatibility"
    assert events[0]["result"]["compatible"] is True
    assert events[0]["result"]["modelNumber"] == "WDT780SAEM1"
    assert events[1]["type"] == "products"
    pns = {c["partNumber"] for c in events[1]["items"]}
    assert pns == {"PS3406971", "PS11745496"}


def test_get_parts_for_model_unknown(tools_catalog):
    payload, events = run_tool("get_parts_for_model", {"model_number": "NOPE000"})
    data = json.loads(payload)
    assert data["modelKnown"] is False
    assert data["count"] == 0
    assert events == []


def test_unknown_tool(tools_catalog):
    payload, events = run_tool("does_not_exist", {})
    assert "error" in json.loads(payload)
    assert events == []
