"""Tests for agent.py message handling and the no-key error path.

The full Claude tool-use loop needs a live API key and is exercised manually;
here we cover the deterministic, mockable pieces.
"""
import asyncio

from app.agent import run_agent, sanitize_messages


def test_sanitize_drops_leading_assistant():
    history = [
        {"role": "assistant", "content": "Hi, how can I help?"},   # UI welcome
        {"role": "user", "content": "Find me a door bin"},
        {"role": "assistant", "content": "Sure!"},
        {"role": "user", "content": "thanks"},
    ]
    out = sanitize_messages(history)
    assert out[0]["role"] == "user"
    assert len(out) == 3
    assert out[0]["content"] == "Find me a door bin"


def test_sanitize_all_assistant_is_empty():
    assert sanitize_messages([{"role": "assistant", "content": "x"}]) == []


def test_sanitize_preserves_user_first():
    history = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}]
    assert sanitize_messages(history) == history


def _drain(agen):
    async def go():
        return [e async for e in agen]
    return asyncio.run(go())


def test_run_agent_without_api_key_errors(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    events = _drain(run_agent([{"role": "user", "content": "hello"}]))
    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert "ANTHROPIC_API_KEY" in events[0]["message"]


def test_run_agent_no_user_message(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-not-real")
    events = _drain(run_agent([{"role": "assistant", "content": "welcome"}]))
    assert events[0]["type"] == "error"
    assert "No user message" in events[0]["message"]
