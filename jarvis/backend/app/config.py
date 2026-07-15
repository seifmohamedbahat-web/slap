"""Runtime configuration for the Jarvis backend.

All secrets and machine-specific settings come from environment variables or
a local `.env` file (see `.env.example`). Nothing sensitive is hardcoded.
"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Claude API
    anthropic_api_key: str = ""
    jarvis_model: str = "claude-opus-4-8"
    jarvis_max_tokens: int = 64000

    # Server
    jarvis_host: str = "127.0.0.1"
    jarvis_port: int = 8765

    # Comma-separated list of directories Jarvis is allowed to read.
    # Empty = the user's home directory only.
    jarvis_allowed_roots: str = ""

    # Where the SQLite database lives. Empty = ~/.jarvis/jarvis.db
    jarvis_db_path: str = ""

    # --- Voice (Phase 2) ---------------------------------------------------
    # Start listening for the wake word automatically once models are loaded.
    jarvis_voice_enabled: bool = True
    # openWakeWord pretrained model name.
    jarvis_wake_word: str = "hey_jarvis_v0.1"
    jarvis_wake_threshold: float = 0.5
    # faster-whisper model: tiny | base | small | medium (small is a good default)
    jarvis_whisper_model: str = "small"
    jarvis_whisper_language: str = "en"
    # TTS engine: auto (ElevenLabs -> edge-tts -> pyttsx3) | elevenlabs | edge | pyttsx3 | off
    jarvis_tts_engine: str = "auto"
    jarvis_tts_max_chars: int = 1200
    jarvis_edge_voice: str = "en-US-GuyNeural"
    jarvis_elevenlabs_model: str = "eleven_flash_v2_5"
    # Speak replies to typed messages too (voice replies are always spoken).
    jarvis_speak_typed_replies: bool = False
    # Global push-to-talk hotkey (Windows; needs the `keyboard` package).
    jarvis_ptt_hotkey: str = "ctrl+shift+j"

    # TTS credentials (used when the engine chain reaches ElevenLabs).
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""

    @property
    def allowed_roots(self) -> list[Path]:
        raw = [p.strip() for p in self.jarvis_allowed_roots.split(",") if p.strip()]
        roots = [Path(p).expanduser().resolve() for p in raw]
        return roots or [Path.home().resolve()]

    @property
    def db_path(self) -> Path:
        if self.jarvis_db_path:
            return Path(self.jarvis_db_path).expanduser().resolve()
        return Path.home() / ".jarvis" / "jarvis.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
