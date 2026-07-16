"""Configuration loading for Jarvis.

Secrets live in a local ``.env`` file (never committed). Non-secret settings
live in ``config.yaml`` next to it. Both are optional — sensible defaults are
baked in so the app can start with nothing but an API key in the environment.
"""

from __future__ import annotations

import copy
import os
from pathlib import Path
from typing import Any

DEFAULTS: dict[str, Any] = {
    "llm": {
        # "anthropic" | "openai" | "ollama" | "auto" (auto picks the first
        # provider that has credentials/endpoint available, in that order)
        "provider": "auto",
        "anthropic_model": "claude-opus-4-8",
        "openai_model": "gpt-4o",
        "ollama_model": "llama3.1",
        "ollama_url": "http://localhost:11434",
        # Reasoning effort for Claude: low keeps voice replies snappy.
        # Raise to "medium"/"high" if answers feel shallow.
        "effort": "low",
        "max_tokens": 4096,
    },
    "voice": {
        # "edge" (free, no key, en-GB neural voices) or "elevenlabs"
        "tts": "edge",
        "edge_voice": "en-GB-RyanNeural",
        "edge_rate": "+0%",
        "elevenlabs_voice": "Daniel",
        "elevenlabs_model": "eleven_turbo_v2_5",
    },
    "wake_word": {
        # "openwakeword" ships a pretrained "hey jarvis" model, free & local.
        "engine": "openwakeword",
        "model": "hey_jarvis",
        "threshold": 0.55,
    },
    "stt": {
        "model_size": "base.en",
        "device": "cpu",
        "compute_type": "int8",
        # End-of-utterance detection while recording a command
        "silence_seconds": 1.2,
        "max_command_seconds": 15,
        "rms_threshold": 0.015,
    },
    "audio": {
        "sample_rate": 16000,
        "chunk_samples": 1280,  # 80 ms @ 16 kHz — openWakeWord's native frame
    },
    "paths": {
        "logs": "logs",
        "screenshots": "screenshots",
        "tts_cache": ".tts_cache",
    },
    # Phase 5: MCP server URLs will be registered here and picked up on
    # restart — no code changes per integration.
    "mcp_servers": [],
}

# Environment variables read from .env / the process environment.
ENV_KEYS = (
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "ELEVENLABS_API_KEY",
    "PICOVOICE_ACCESS_KEY",
)


def _deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


class Config:
    def __init__(self, settings: dict[str, Any], secrets: dict[str, str | None], root: Path):
        self.settings = settings
        self.secrets = secrets
        self.root = root

    @classmethod
    def load(cls, root: Path | None = None) -> "Config":
        root = root or Path.cwd()

        env_file = root / ".env"
        if env_file.exists():
            from dotenv import load_dotenv

            load_dotenv(env_file)

        settings = DEFAULTS
        config_file = root / "config.yaml"
        if config_file.exists():
            import yaml

            with open(config_file, encoding="utf-8") as fh:
                user_settings = yaml.safe_load(fh) or {}
            settings = _deep_merge(DEFAULTS, user_settings)
        else:
            settings = copy.deepcopy(DEFAULTS)

        secrets = {key: os.environ.get(key) for key in ENV_KEYS}
        return cls(settings, secrets, root)

    def get(self, dotted: str, default: Any = None) -> Any:
        """Fetch a setting via dotted path, e.g. ``config.get("llm.provider")``."""
        node: Any = self.settings
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    def secret(self, name: str) -> str | None:
        return self.secrets.get(name)

    def path(self, name: str) -> Path:
        p = self.root / str(self.get(f"paths.{name}", name))
        p.mkdir(parents=True, exist_ok=True)
        return p
