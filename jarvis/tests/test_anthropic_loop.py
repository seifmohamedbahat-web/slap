"""Exercises the Anthropic provider's agentic loop with a stubbed SDK client:
tool_use round → tool executed via the gated executor → final end_turn text.
"""

import sys
import types
from pathlib import Path
from types import SimpleNamespace

from jarvis.config import Config
from jarvis.tools.executor import ToolExecutor
from jarvis.tools.registry import Tool, ToolRegistry


class FakeMessages:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return self._responses.pop(0)


def block(**kw):
    return SimpleNamespace(**kw)


def make_provider(tmp_path: Path, responses):
    # Stub the anthropic module so no real SDK/key is needed.
    fake_messages = FakeMessages(responses)
    fake_anthropic = types.ModuleType("anthropic")
    fake_anthropic.Anthropic = lambda api_key=None: SimpleNamespace(messages=fake_messages)
    sys.modules["anthropic"] = fake_anthropic
    try:
        from jarvis.llm.anthropic_provider import AnthropicProvider

        registry = ToolRegistry()
        registry.register(Tool(
            name="open_app",
            description="open an app",
            input_schema={"type": "object", "properties": {"name": {"type": "string"}},
                          "required": ["name"]},
            handler=lambda name: f"Launched {name}.",
        ))
        executor = ToolExecutor(registry, lambda p: True, tmp_path / "actions.jsonl")
        config = Config.load(tmp_path)
        return AnthropicProvider(config, registry, executor), fake_messages
    finally:
        del sys.modules["anthropic"]


def test_tool_loop_round_trip(tmp_path):
    responses = [
        SimpleNamespace(
            stop_reason="tool_use",
            content=[
                block(type="text", text="Right away."),
                block(type="tool_use", id="tu_1", name="open_app", input={"name": "chrome"}),
            ],
        ),
        SimpleNamespace(
            stop_reason="end_turn",
            content=[block(type="text", text="Chrome is open.")],
        ),
    ]
    provider, fake = make_provider(tmp_path, responses)

    reply = provider.respond("open chrome")

    assert reply == "Chrome is open."
    assert len(fake.calls) == 2
    # Second request must carry the tool result back, keyed by tool_use_id.
    # (The provider mutates one history list, so find the tool_result turn.)
    followup = fake.calls[1]["messages"]
    tool_result_turns = [
        m for m in followup
        if isinstance(m.get("content"), list)
        and m["content"] and isinstance(m["content"][0], dict)
        and m["content"][0].get("type") == "tool_result"
    ]
    assert len(tool_result_turns) == 1
    tool_result = tool_result_turns[0]["content"][0]
    assert tool_result["type"] == "tool_result"
    assert tool_result["tool_use_id"] == "tu_1"
    assert tool_result["content"] == "Launched chrome."
    # Model + reasoning parameters as configured
    assert fake.calls[0]["model"] == "claude-opus-4-8"
    assert fake.calls[0]["thinking"] == {"type": "adaptive"}
    assert fake.calls[0]["output_config"] == {"effort": "low"}


def test_plain_answer_no_tools(tmp_path):
    responses = [
        SimpleNamespace(stop_reason="end_turn",
                        content=[block(type="text", text="Rather cloudy, I expect.")]),
    ]
    provider, fake = make_provider(tmp_path, responses)
    assert provider.respond("how are you") == "Rather cloudy, I expect."
    assert len(fake.calls) == 1


def test_refusal_is_polite(tmp_path):
    responses = [
        SimpleNamespace(stop_reason="refusal", content=[]),
    ]
    provider, _ = make_provider(tmp_path, responses)
    reply = provider.respond("do something disallowed")
    assert "can't help" in reply
