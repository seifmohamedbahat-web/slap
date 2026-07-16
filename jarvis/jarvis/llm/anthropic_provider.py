"""Anthropic Claude provider — the primary brain.

Implements the manual agentic loop (call → execute tools → feed results →
repeat) so the confirmation gate and audit log sit between the model and the
OS. Uses adaptive thinking with configurable effort; voice latency wants
"low", quality wants "high".
"""

from __future__ import annotations

import logging

from .base import Provider
from .prompts import SYSTEM_PROMPT

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 8


class AnthropicProvider(Provider):
    name = "anthropic"

    def __init__(self, config, registry, executor):
        super().__init__(config, registry, executor)
        import anthropic

        self.client = anthropic.Anthropic(api_key=config.secret("ANTHROPIC_API_KEY"))
        self.model = config.get("llm.anthropic_model", "claude-opus-4-8")
        self.max_tokens = int(config.get("llm.max_tokens", 4096))
        self.effort = config.get("llm.effort", "low")
        self.messages: list[dict] = []

    def reset(self) -> None:
        self.messages = []

    def respond(self, user_text: str) -> str:
        self.messages.append({"role": "user", "content": user_text})

        for _ in range(MAX_TOOL_ROUNDS):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=SYSTEM_PROMPT,
                thinking={"type": "adaptive"},
                output_config={"effort": self.effort},
                tools=self.registry.anthropic_schemas(),
                messages=self.messages,
            )

            if response.stop_reason == "refusal":
                # Keep history consistent, then decline politely out loud.
                self.messages.append({"role": "assistant", "content": response.content})
                return "I'm afraid I can't help with that one."

            self.messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "pause_turn":
                # Server-side pause; re-send to resume where it left off.
                continue

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    log.info("Tool call: %s %s", block.name, block.input)
                    result_text, is_error = self.executor.execute(block.name, dict(block.input))
                    result: dict = {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    }
                    if is_error:
                        result["is_error"] = True
                    tool_results.append(result)
                self.messages.append({"role": "user", "content": tool_results})
                continue

            # end_turn / max_tokens — return the spoken text
            return self._text_of(response)

        return "That took more steps than expected, so I stopped. Try narrowing the request."

    @staticmethod
    def _text_of(response) -> str:
        return " ".join(
            block.text for block in response.content if block.type == "text"
        ).strip() or "Done."
