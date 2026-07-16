"""Provider interface for the LLM brain.

Each provider owns its native conversation history and tool-use loop; the app
only calls ``respond(user_text)`` and gets back the sentence(s) to speak.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..tools.executor import ToolExecutor
from ..tools.registry import ToolRegistry


class Provider(ABC):
    name: str = "base"

    def __init__(self, config, registry: ToolRegistry, executor: ToolExecutor):
        self.config = config
        self.registry = registry
        self.executor = executor

    @abstractmethod
    def respond(self, user_text: str) -> str:
        """Send one user utterance; run tools as needed; return spoken reply."""

    def reset(self) -> None:
        """Clear conversation history (start a fresh session)."""
