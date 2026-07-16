"""Chooses which LLM provider powers the brain.

Explicit choice via ``llm.provider`` in config.yaml, or "auto":
Anthropic if a key is present, else OpenAI, else a running Ollama server.
Gemini is a planned addition — register it here when implemented.
"""

from __future__ import annotations

import logging

from .base import Provider

log = logging.getLogger(__name__)


def select_provider_name(config) -> str:
    """Pure selection logic — separated for testability."""
    choice = str(config.get("llm.provider", "auto")).lower()
    if choice != "auto":
        return choice

    if config.secret("ANTHROPIC_API_KEY"):
        return "anthropic"
    if config.secret("OPENAI_API_KEY"):
        return "openai"

    from .ollama_provider import OllamaProvider

    if OllamaProvider.is_available(config):
        return "ollama"

    raise RuntimeError(
        "No LLM available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env, "
        "or start a local Ollama server."
    )


def create_provider(config, registry, executor) -> Provider:
    name = select_provider_name(config)
    log.info("Using LLM provider: %s", name)

    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider(config, registry, executor)
    if name == "openai":
        from .openai_provider import OpenAIProvider

        return OpenAIProvider(config, registry, executor)
    if name == "ollama":
        from .ollama_provider import OllamaProvider

        return OllamaProvider(config, registry, executor)

    raise ValueError(f"Unknown llm.provider: {name!r} (expected anthropic/openai/ollama/auto)")
