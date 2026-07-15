"""Voice pipeline orchestrator.

Flow:  wake word ("hey jarvis") or push-to-talk
         → record utterance (energy endpointing)
         → transcribe locally (faster-whisper)
         → run the same Claude agent turn as typed chat
         → speak the reply (TTS) and stream everything to the dashboard.

The mic loop runs in a worker thread; agent turns run on the FastAPI event
loop. Everything degrades gracefully: missing packages, no microphone, or
models still loading all surface as status — never as a crash.
"""
from __future__ import annotations

import asyncio
import threading
from typing import Any

from .. import conversation
from ..agent import run_turn
from ..config import get_settings
from ..events import broadcaster
from . import audio, tts
from .stt import SpeechToText
from .wakeword import WakeWordDetector


class VoiceService:
    def __init__(self) -> None:
        settings = get_settings()
        self.wake = WakeWordDetector(
            settings.jarvis_wake_word, settings.jarvis_wake_threshold
        )
        self.stt = SpeechToText(
            settings.jarvis_whisper_model, settings.jarvis_whisper_language
        )
        self.available = False
        self.enabled = False
        self.reason = "starting"
        self.busy = False  # a voice turn is in flight
        self._ptt = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.loop: asyncio.AbstractEventLoop | None = None

    # ---- status ----------------------------------------------------------

    def status(self) -> dict[str, Any]:
        return {
            "type": "voice_status",
            "available": self.available,
            "enabled": self.enabled,
            "wake_ready": self.wake.ready,
            "stt_ready": self.stt.ready,
            "reason": self.reason,
        }

    def _push_status(self) -> None:
        broadcaster.broadcast_threadsafe(self.status())

    # ---- lifecycle ---------------------------------------------------------

    async def start(self) -> None:
        """Probe the mic, then load models in the background."""
        self.loop = asyncio.get_running_loop()
        try:
            stream = await asyncio.to_thread(audio.open_input_stream)
        except audio.MicUnavailableError as exc:
            self.available = False
            self.reason = str(exc)
            self._push_status()
            print(f"[voice] unavailable: {exc}")
            return
        except Exception as exc:
            self.available = False
            self.reason = f"unexpected audio error: {exc}"
            self._push_status()
            return

        await asyncio.to_thread(stream.stop)
        await asyncio.to_thread(stream.close)
        self.available = True
        self.reason = "loading models"
        self._push_status()
        asyncio.get_running_loop().create_task(self._load_models())

    async def _load_models(self) -> None:
        for name, loader in (("wake word", self.wake.load), ("speech", self.stt.load)):
            try:
                await asyncio.to_thread(loader)
            except Exception as exc:
                self.reason = f"{name} model failed to load: {exc}"
                print(f"[voice] {self.reason}")
                self._push_status()
        if self.wake.ready or self.stt.ready:
            self.reason = "ready"
        self._push_status()
        if get_settings().jarvis_voice_enabled and self.stt.ready:
            self.set_enabled(True)

    def set_enabled(self, enabled: bool) -> dict[str, Any]:
        if enabled and not self.available:
            return self.status()
        self.enabled = enabled
        if enabled and (self._thread is None or not self._thread.is_alive()):
            self._stop.clear()
            self._thread = threading.Thread(
                target=self._mic_loop, name="jarvis-mic", daemon=True
            )
            self._thread.start()
        if not enabled:
            self._stop.set()
        self._push_status()
        return self.status()

    def stop(self) -> None:
        self._stop.set()
        self.enabled = False

    def trigger_ptt(self) -> None:
        """Push-to-talk: start listening immediately (skips the wake word)."""
        self._ptt.set()

    # ---- mic loop (worker thread) -----------------------------------------

    def _mic_loop(self) -> None:
        try:
            stream = audio.open_input_stream()
        except audio.MicUnavailableError as exc:
            self.available = False
            self.enabled = False
            self.reason = str(exc)
            self._push_status()
            return

        try:
            while not self._stop.is_set():
                frame = audio.read_frame(stream)
                triggered = self._ptt.is_set()
                if not triggered and self.wake.ready:
                    import numpy as np

                    triggered = self.wake.detect(np.frombuffer(frame, np.int16))
                if not triggered:
                    continue
                self._ptt.clear()
                if self.busy or conversation.turn_lock.locked():
                    continue  # already mid-turn; ignore the trigger
                self._capture_and_dispatch(stream)
        finally:
            try:
                stream.stop()
                stream.close()
            except Exception:
                pass

    def _capture_and_dispatch(self, stream) -> None:
        broadcaster.broadcast_threadsafe({"type": "voice_state", "state": "listening"})
        utterance = audio.record_utterance(stream, should_abort=self._stop.is_set)
        if utterance is None:
            broadcaster.broadcast_threadsafe({"type": "voice_state", "state": "idle"})
            return

        broadcaster.broadcast_threadsafe(
            {"type": "voice_state", "state": "transcribing"}
        )
        if not self.stt.ready:
            broadcaster.broadcast_threadsafe(
                {
                    "type": "error",
                    "message": "Speech model is still loading — try again in a moment.",
                }
            )
            broadcaster.broadcast_threadsafe({"type": "voice_state", "state": "idle"})
            return

        try:
            text = self.stt.transcribe(utterance)
        except Exception as exc:
            broadcaster.broadcast_threadsafe(
                {"type": "error", "message": f"Transcription failed: {exc}"}
            )
            broadcaster.broadcast_threadsafe({"type": "voice_state", "state": "idle"})
            return

        if not text:
            broadcaster.broadcast_threadsafe({"type": "voice_state", "state": "idle"})
            return

        if self.loop and not self.loop.is_closed():
            asyncio.run_coroutine_threadsafe(self._run_voice_turn(text), self.loop)

    # ---- agent turn (event loop) --------------------------------------------

    async def _run_voice_turn(self, text: str) -> None:
        self.busy = True
        try:
            await broadcaster.broadcast({"type": "voice_transcript", "text": text})
            reply_parts: list[str] = []
            async with conversation.turn_lock:
                conversation.history.append({"role": "user", "content": text})
                async for event in run_turn(conversation.history):
                    if event["type"] == "text_delta":
                        reply_parts.append(event["text"])
                    await broadcaster.broadcast(event)

            reply = "".join(reply_parts).strip()
            if reply:
                await broadcaster.broadcast(
                    {"type": "voice_state", "state": "speaking"}
                )
                result = await tts.synthesize(reply)
                if result is not None:
                    data, mime = result
                    audio_id = tts.store_audio(data, mime)
                    await broadcaster.broadcast(
                        {"type": "speak", "audio_id": audio_id}
                    )
        finally:
            self.busy = False
            await broadcaster.broadcast({"type": "voice_state", "state": "idle"})


voice_service = VoiceService()
