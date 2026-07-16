"""Executes tool calls requested by the LLM.

Responsibilities:
- gate destructive tools behind a confirmation callback (voice or typed)
- catch handler exceptions and report them back to the model as tool errors
- append every attempted action to an audit log (JSONL) so the user can
  review what Jarvis did, even though the main interface is voice
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from .registry import ToolRegistry

log = logging.getLogger(__name__)

# Returns True if the user approved the action described by the prompt.
ConfirmCallback = Callable[[str], bool]


class ToolExecutor:
    def __init__(self, registry: ToolRegistry, confirm: ConfirmCallback, audit_path: Path):
        self.registry = registry
        self.confirm = confirm
        self.audit_path = audit_path

    def execute(self, name: str, args: dict[str, Any]) -> tuple[str, bool]:
        """Run a tool. Returns ``(result_text, is_error)``."""
        tool = self.registry.get(name)
        if tool is None:
            self._audit(name, args, "error", "unknown tool")
            return f"Unknown tool: {name}", True

        if tool.requires_confirmation:
            try:
                prompt = tool.confirmation_prompt.format(**args)
            except (KeyError, IndexError):
                prompt = tool.confirmation_prompt
            if not self.confirm(prompt):
                self._audit(name, args, "declined", "user declined confirmation")
                # Not an error — the model should acknowledge and move on.
                return "The user declined the confirmation. Do not retry.", False

        try:
            result = tool.handler(**args)
        except Exception as exc:  # noqa: BLE001 — surface any failure to the model
            log.exception("Tool %s failed", name)
            self._audit(name, args, "error", str(exc))
            return f"Tool failed: {exc}", True

        self._audit(name, args, "ok", result)
        return result, False

    def _audit(self, name: str, args: dict[str, Any], outcome: str, detail: str) -> None:
        entry = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "tool": name,
            "args": args,
            "outcome": outcome,
            "detail": detail[:500],
        }
        try:
            self.audit_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.audit_path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except OSError:
            log.warning("Could not write audit log entry", exc_info=True)
