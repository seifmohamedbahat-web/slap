"""OpenAI provider (secondary cloud option) via function calling."""

from __future__ import annotations

import json
import logging

from .base import Provider
from .prompts import SYSTEM_PROMPT

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 8


class OpenAIProvider(Provider):
    name = "openai"

    def __init__(self, config, registry, executor):
        super().__init__(config, registry, executor)
        from openai import OpenAI

        self.client = OpenAI(api_key=config.secret("OPENAI_API_KEY"))
        self.model = config.get("llm.openai_model", "gpt-4o")
        self.messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    def reset(self) -> None:
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    def respond(self, user_text: str) -> str:
        self.messages.append({"role": "user", "content": user_text})

        for _ in range(MAX_TOOL_ROUNDS):
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.messages,
                tools=self.registry.openai_schemas(),
            )
            message = response.choices[0].message
            self.messages.append(message.model_dump(exclude_none=True))

            if not message.tool_calls:
                return (message.content or "Done.").strip()

            for call in message.tool_calls:
                try:
                    args = json.loads(call.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                log.info("Tool call: %s %s", call.function.name, args)
                result_text, is_error = self.executor.execute(call.function.name, args)
                self.messages.append({
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": f"ERROR: {result_text}" if is_error else result_text,
                })

        return "That took more steps than expected, so I stopped. Try narrowing the request."
