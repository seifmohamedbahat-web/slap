"""Local Ollama provider — offline fallback.

Uses Ollama's /api/chat endpoint. Tool calling works with tool-capable models
(llama3.1+, qwen2.5, mistral-nemo…); if the model rejects tools, Jarvis
retries the turn without them and answers conversationally.
"""

from __future__ import annotations

import json
import logging

import requests

from .base import Provider
from .prompts import SYSTEM_PROMPT

log = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 8


class OllamaProvider(Provider):
    name = "ollama"

    def __init__(self, config, registry, executor):
        super().__init__(config, registry, executor)
        self.url = config.get("llm.ollama_url", "http://localhost:11434").rstrip("/")
        self.model = config.get("llm.ollama_model", "llama3.1")
        self.messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
        self._tools_supported = True

    def reset(self) -> None:
        self.messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    @classmethod
    def is_available(cls, config) -> bool:
        url = config.get("llm.ollama_url", "http://localhost:11434").rstrip("/")
        try:
            return requests.get(f"{url}/api/tags", timeout=2).ok
        except requests.RequestException:
            return False

    def _chat(self, with_tools: bool) -> dict:
        payload: dict = {"model": self.model, "messages": self.messages, "stream": False}
        if with_tools:
            payload["tools"] = self.registry.openai_schemas()
        resp = requests.post(f"{self.url}/api/chat", json=payload, timeout=300)
        resp.raise_for_status()
        return resp.json()

    def respond(self, user_text: str) -> str:
        self.messages.append({"role": "user", "content": user_text})

        for _ in range(MAX_TOOL_ROUNDS):
            try:
                data = self._chat(with_tools=self._tools_supported)
            except requests.HTTPError:
                if self._tools_supported:
                    log.warning("Model %s rejected tools; retrying without them", self.model)
                    self._tools_supported = False
                    continue
                raise

            message = data.get("message", {})
            self.messages.append(message)
            tool_calls = message.get("tool_calls") or []

            if not tool_calls:
                return (message.get("content") or "Done.").strip()

            for call in tool_calls:
                fn = call.get("function", {})
                args = fn.get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {}
                log.info("Tool call: %s %s", fn.get("name"), args)
                result_text, is_error = self.executor.execute(fn.get("name", ""), args)
                self.messages.append({
                    "role": "tool",
                    "content": f"ERROR: {result_text}" if is_error else result_text,
                })

        return "That took more steps than expected, so I stopped. Try narrowing the request."
