"""Microphone capture: a shared 16 kHz mono stream feeding both the wake-word
detector (fixed 80 ms frames) and command recording (energy-based endpointing).
"""

from __future__ import annotations

import logging
import queue

import numpy as np

log = logging.getLogger(__name__)


class Microphone:
    def __init__(self, sample_rate: int = 16000, chunk_samples: int = 1280):
        import sounddevice as sd

        self.sample_rate = sample_rate
        self.chunk_samples = chunk_samples
        self._queue: queue.Queue[np.ndarray] = queue.Queue()

        def _callback(indata, frames, time_info, status):  # noqa: ARG001
            if status:
                log.debug("Audio status: %s", status)
            self._queue.put(indata[:, 0].copy())

        self._stream = sd.InputStream(
            samplerate=sample_rate,
            channels=1,
            dtype="int16",
            blocksize=chunk_samples,
            callback=_callback,
        )
        self._stream.start()

    def close(self) -> None:
        self._stream.stop()
        self._stream.close()

    def drain(self) -> None:
        """Discard buffered audio (e.g. the wake word itself, or TTS bleed)."""
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except queue.Empty:
                break

    def next_chunk(self) -> np.ndarray:
        """Blocking read of the next int16 chunk (for the wake-word loop)."""
        return self._queue.get()

    def record_command(
        self,
        rms_threshold: float = 0.015,
        silence_seconds: float = 1.2,
        max_seconds: float = 15.0,
        min_speech_seconds: float = 0.3,
    ) -> np.ndarray:
        """Record one spoken command; returns float32 audio in [-1, 1].

        Simple energy endpointing: wait for speech to start, then stop after
        ``silence_seconds`` of quiet (or ``max_seconds`` overall).
        """
        chunks: list[np.ndarray] = []
        chunk_dur = self.chunk_samples / self.sample_rate
        elapsed = 0.0
        speech_time = 0.0
        trailing_silence = 0.0
        started = False

        self.drain()
        while elapsed < max_seconds:
            chunk = self.next_chunk().astype(np.float32) / 32768.0
            chunks.append(chunk)
            elapsed += chunk_dur

            rms = float(np.sqrt(np.mean(chunk**2)))
            if rms >= rms_threshold:
                started = True
                speech_time += chunk_dur
                trailing_silence = 0.0
            elif started:
                trailing_silence += chunk_dur
                if trailing_silence >= silence_seconds and speech_time >= min_speech_seconds:
                    break

        if not started:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate(chunks)
