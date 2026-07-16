"""Speech-to-text via faster-whisper (local, fast, private).

Swappable: implement ``Transcriber.transcribe`` against a cloud STT API and
return it from ``create_stt`` if configured.
"""

from __future__ import annotations

import logging

import numpy as np

log = logging.getLogger(__name__)


class Transcriber:
    def __init__(self, model_size: str = "base.en", device: str = "cpu", compute_type: str = "int8"):
        from faster_whisper import WhisperModel

        log.info("Loading Whisper model %s (%s/%s)…", model_size, device, compute_type)
        self.model = WhisperModel(model_size, device=device, compute_type=compute_type)

    def transcribe(self, audio_f32: np.ndarray) -> str:
        """Transcribe 16 kHz float32 mono audio; returns plain text."""
        if audio_f32.size == 0:
            return ""
        segments, _info = self.model.transcribe(audio_f32, beam_size=1, language="en")
        return " ".join(seg.text.strip() for seg in segments).strip()


def create_stt(config) -> Transcriber:
    return Transcriber(
        model_size=config.get("stt.model_size", "base.en"),
        device=config.get("stt.device", "cpu"),
        compute_type=config.get("stt.compute_type", "int8"),
    )
