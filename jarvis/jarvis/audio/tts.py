"""Text-to-speech behind a swappable interface.

Default: edge-tts with the en-GB-Ryan neural voice — a convincing British
male, free, no API key, low latency. ElevenLabs is available by setting
``voice.tts: elevenlabs`` plus ELEVENLABS_API_KEY in .env.

Synthesized clips are cached by (engine, voice, text) hash so the short wake
acknowledgements ("Yes?", "Go ahead.") play instantly after first use.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
from abc import ABC, abstractmethod
from pathlib import Path

log = logging.getLogger(__name__)


class TTSEngine(ABC):
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    def _synthesize(self, text: str, out_path: Path) -> None: ...

    @property
    @abstractmethod
    def _cache_key(self) -> str: ...

    def synth(self, text: str) -> Path:
        digest = hashlib.sha256(f"{self._cache_key}|{text}".encode()).hexdigest()[:24]
        out_path = self.cache_dir / f"{digest}.mp3"
        if not out_path.exists():
            self._synthesize(text, out_path)
        return out_path


class EdgeTTS(TTSEngine):
    def __init__(self, cache_dir: Path, voice: str = "en-GB-RyanNeural", rate: str = "+0%"):
        super().__init__(cache_dir)
        self.voice = voice
        self.rate = rate

    @property
    def _cache_key(self) -> str:
        return f"edge|{self.voice}|{self.rate}"

    def _synthesize(self, text: str, out_path: Path) -> None:
        import edge_tts

        async def _run() -> None:
            communicate = edge_tts.Communicate(text, self.voice, rate=self.rate)
            await communicate.save(str(out_path))

        asyncio.run(_run())


class ElevenLabsTTS(TTSEngine):
    def __init__(self, cache_dir: Path, api_key: str, voice: str = "Daniel",
                 model: str = "eleven_turbo_v2_5"):
        super().__init__(cache_dir)
        from elevenlabs.client import ElevenLabs

        self.client = ElevenLabs(api_key=api_key)
        self.voice = voice
        self.model = model

    @property
    def _cache_key(self) -> str:
        return f"eleven|{self.voice}|{self.model}"

    def _synthesize(self, text: str, out_path: Path) -> None:
        audio = self.client.generate(text=text, voice=self.voice, model=self.model)
        with open(out_path, "wb") as fh:
            for piece in audio:
                fh.write(piece)


class Speaker:
    """Plays synthesized audio files (blocking until playback finishes)."""

    def __init__(self) -> None:
        import pygame

        pygame.mixer.init()
        self._pygame = pygame

    def play(self, path: Path) -> None:
        music = self._pygame.mixer.music
        music.load(str(path))
        music.play()
        while music.get_busy():
            self._pygame.time.wait(50)
        music.unload()


def create_tts(config) -> TTSEngine:
    cache_dir = config.path("tts_cache")
    engine = config.get("voice.tts", "edge")
    if engine == "elevenlabs":
        api_key = config.secret("ELEVENLABS_API_KEY")
        if not api_key:
            log.warning("voice.tts is 'elevenlabs' but ELEVENLABS_API_KEY is unset; using edge-tts")
        else:
            return ElevenLabsTTS(
                cache_dir,
                api_key=api_key,
                voice=config.get("voice.elevenlabs_voice", "Daniel"),
                model=config.get("voice.elevenlabs_model", "eleven_turbo_v2_5"),
            )
    return EdgeTTS(
        cache_dir,
        voice=config.get("voice.edge_voice", "en-GB-RyanNeural"),
        rate=config.get("voice.edge_rate", "+0%"),
    )
