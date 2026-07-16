import json
from pathlib import Path

import pytest

from jarvis.tools.executor import ToolExecutor
from jarvis.tools.registry import Tool, ToolRegistry


@pytest.fixture
def registry() -> ToolRegistry:
    reg = ToolRegistry()
    reg.register(Tool(
        name="greet",
        description="Say hello",
        input_schema={"type": "object", "properties": {"name": {"type": "string"}},
                      "required": ["name"]},
        handler=lambda name: f"Hello, {name}!",
    ))
    reg.register(Tool(
        name="detonate",
        description="Dangerous",
        input_schema={"type": "object", "properties": {}},
        handler=lambda: "Boom.",
        requires_confirmation=True,
        confirmation_prompt="This will explode. Shall I proceed?",
    ))
    reg.register(Tool(
        name="broken",
        description="Always fails",
        input_schema={"type": "object", "properties": {}},
        handler=lambda: (_ for _ in ()).throw(RuntimeError("kaput")),
    ))
    return reg


def make_executor(registry, tmp_path, confirm=lambda prompt: True):
    return ToolExecutor(registry, confirm, tmp_path / "actions.jsonl")


def test_execute_success(registry, tmp_path):
    executor = make_executor(registry, tmp_path)
    result, is_error = executor.execute("greet", {"name": "Seif"})
    assert result == "Hello, Seif!"
    assert not is_error


def test_unknown_tool(registry, tmp_path):
    executor = make_executor(registry, tmp_path)
    result, is_error = executor.execute("nope", {})
    assert is_error
    assert "Unknown tool" in result


def test_confirmation_denied_blocks_handler(registry, tmp_path):
    calls = []
    executor = make_executor(registry, tmp_path, confirm=lambda p: calls.append(p) or False)
    result, is_error = executor.execute("detonate", {})
    assert not is_error
    assert "declined" in result
    assert calls == ["This will explode. Shall I proceed?"]


def test_confirmation_granted_runs_handler(registry, tmp_path):
    executor = make_executor(registry, tmp_path, confirm=lambda p: True)
    result, is_error = executor.execute("detonate", {})
    assert result == "Boom."
    assert not is_error


def test_handler_exception_reported_as_error(registry, tmp_path):
    executor = make_executor(registry, tmp_path)
    result, is_error = executor.execute("broken", {})
    assert is_error
    assert "kaput" in result


def test_audit_log_written(registry, tmp_path):
    executor = make_executor(registry, tmp_path, confirm=lambda p: False)
    executor.execute("greet", {"name": "A"})
    executor.execute("detonate", {})
    executor.execute("broken", {})
    lines = (tmp_path / "actions.jsonl").read_text(encoding="utf-8").strip().splitlines()
    entries = [json.loads(line) for line in lines]
    assert [e["outcome"] for e in entries] == ["ok", "declined", "error"]
    assert all({"ts", "tool", "args", "detail"} <= set(e) for e in entries)


def test_schema_shapes(registry):
    anth = registry.anthropic_schemas()
    assert {"name", "description", "input_schema"} <= set(anth[0])
    oai = registry.openai_schemas()
    assert oai[0]["type"] == "function"
    assert {"name", "description", "parameters"} <= set(oai[0]["function"])


def test_duplicate_registration_rejected(registry):
    with pytest.raises(ValueError):
        registry.register(Tool(
            name="greet", description="dup",
            input_schema={"type": "object", "properties": {}},
            handler=lambda: "",
        ))
