from pathlib import Path

from jarvis.config import Config


def test_defaults_without_files(tmp_path: Path):
    config = Config.load(tmp_path)
    assert config.get("llm.provider") == "auto"
    assert config.get("llm.anthropic_model") == "claude-opus-4-8"
    assert config.get("voice.edge_voice") == "en-GB-RyanNeural"
    assert config.get("does.not.exist", "fallback") == "fallback"


def test_yaml_overrides_merge_deeply(tmp_path: Path):
    (tmp_path / "config.yaml").write_text(
        "llm:\n  provider: ollama\nvoice:\n  tts: elevenlabs\n",
        encoding="utf-8",
    )
    config = Config.load(tmp_path)
    assert config.get("llm.provider") == "ollama"
    # sibling defaults survive a partial override
    assert config.get("llm.anthropic_model") == "claude-opus-4-8"
    assert config.get("voice.tts") == "elevenlabs"
    assert config.get("voice.edge_voice") == "en-GB-RyanNeural"


def test_env_secrets(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-123")
    config = Config.load(tmp_path)
    assert config.secret("ANTHROPIC_API_KEY") == "sk-test-123"
    assert config.secret("OPENAI_API_KEY") is None


def test_path_creates_directory(tmp_path: Path):
    config = Config.load(tmp_path)
    logs = config.path("logs")
    assert logs.is_dir()
    assert logs == tmp_path / "logs"
