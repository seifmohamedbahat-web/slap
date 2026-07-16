from pathlib import Path

import pytest

from jarvis.config import Config
from jarvis.llm.router import select_provider_name


def load_config(tmp_path: Path, yaml_text: str = "") -> Config:
    if yaml_text:
        (tmp_path / "config.yaml").write_text(yaml_text, encoding="utf-8")
    return Config.load(tmp_path)


def test_explicit_provider_wins(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    config = load_config(tmp_path, "llm:\n  provider: ollama\n")
    assert select_provider_name(config) == "ollama"


def test_auto_prefers_anthropic(tmp_path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-a")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-o")
    config = load_config(tmp_path)
    assert select_provider_name(config) == "anthropic"


def test_auto_falls_back_to_openai(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-o")
    config = load_config(tmp_path)
    assert select_provider_name(config) == "openai"


def test_auto_without_anything_raises(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    # Point Ollama at a dead port so availability check fails fast.
    config = load_config(tmp_path, "llm:\n  ollama_url: http://127.0.0.1:1\n")
    with pytest.raises(RuntimeError, match="No LLM available"):
        select_provider_name(config)
