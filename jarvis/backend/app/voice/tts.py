"""Text-to-speech with a graceful fallback chain.

Order (when JARVIS_TTS_ENGINE=auto):
    1. ElevenLabs   — if ELEVENLABS_API_KEY is set (natural, needs internet)
    2. edge-tts     — free Microsoft voices (needs internet)
    3. pyttsx3      — offline OS voices (robotic but always works)

Synthesized clips are held in a small in-memory store and served to the
dashboard via GET /api/voice/audio/{id}; the webview plays them.
"""
from __future__ import annotations

import asyncio
import tempfile
import uuid
from collections import OrderedDict
from pathlib import Path

import httpx

from ..config import get_settings

# audio_id -> (bytes, mime). Bounded; old clips fall off.
_STORE: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
_STORE_MAX = 8


def store_audio(data: bytes, mime: str) -> str:
    audio_id = uuid.uuid4().hex
    _STORE[audio_id] = (data, mime)
    while len(_STORE) > _STORE_MAX:
        _STORE.popitem(last=False)
    return audio_id


def get_audio(audio_id: str) -> tuple[bytes, str] | None:
    return _STORE.get(audio_id)


async def _elevenlabs(text: str) -> tuple[bytes, str]:
    settings = get_settings()
    if not settings.elevenlabs_api_key:
        raise RuntimeError("no ElevenLabs key configured")
    voice = settings.elevenlabs_voice_id or "21m00Tcm4TlvDq8ikWAM"  # default: Rachel
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
            headers={"xi-api-key": settings.elevenlabs_api_key},
            json={"text": text, "model_id": settings.jarvis_elevenlabs_model},
        )
        response.raise_for_status()
        return response.content, "audio/mpeg"


async def _edge(text: str) -> tuple[bytes, str]:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice=get_settings().jarvis_edge_voice)
    chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    if not chunks:
        raise RuntimeError("edge-tts produced no audio")
    return b"".join(chunks), "audio/mpeg"


def _pyttsx3_blocking(text: str) -> tuple[bytes, str]:
    import pyttsx3

    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "tts.wav"
        engine = pyttsx3.init()
        engine.save_to_file(text, str(out))
        engine.runAndWait()
        data = out.read_bytes()
    if not data:
        raise RuntimeError("pyttsx3 produced no audio")
    return data, "audio/wav"


async def synthesize(text: str) -> tuple[bytes, str] | None:
    """Return (audio_bytes, mime) or None if every engine failed/disabled."""
    settings = get_settings()
    engine = settings.jarvis_tts_engine.lower()
    if engine == "off":
        return None

    if engine == "auto":
        chain = ["elevenlabs", "edge", "pyttsx3"]
    else:
        chain = [engine]

    text = text[: settings.jarvis_tts_max_chars]
    last_error: Exception | None = None
    for name in chain:
        try:
            if name == "elevenlabs":
                return await _elevenlabs(text)
            if name == "edge":
                return await _edge(text)
            if name == "pyttsx3":
                return await asyncio.to_thread(_pyttsx3_blocking, text)
            raise RuntimeError(f"unknown TTS engine '{name}'")
        except Exception as exc:
            last_error = exc
            continue
    if last_error:
        print(f"[voice] all TTS engines failed: {last_error}")
    return None
