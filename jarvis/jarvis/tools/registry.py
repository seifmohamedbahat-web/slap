"""Tool registry — the single place capabilities are declared.

Each tool carries a JSON Schema so any LLM provider (Anthropic, OpenAI,
Ollama) can expose it through its native function-calling API. Tools that are
destructive or hard to reverse set ``requires_confirmation``; the executor
gates them behind a spoken (or typed) yes/no before running.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[..., str]
    requires_confirmation: bool = False
    # Human-readable prompt spoken before a gated tool runs. May reference
    # arguments with str.format, e.g. "This will {action} the computer."
    confirmation_prompt: str = "This action may be hard to undo. Shall I proceed?"


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.name}")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    def anthropic_schemas(self) -> list[dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            }
            for t in self._tools.values()
        ]

    def openai_schemas(self) -> list[dict[str, Any]]:
        """OpenAI/Ollama-style function-calling schema."""
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                },
            }
            for t in self._tools.values()
        ]
