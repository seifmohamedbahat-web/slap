"""Local speech-to-text via faster-whisper.

The model loads in the background at startup (it can take a while on first
run while weights download). If an utterance arrives before it's ready, the
pipeline reports that instead of blocking.
"""
from __future__ import annotations


class SpeechToText:
    def __init__(self, model_size: str, language: str | None) -> None:
        self.model_size = model_size
        self.language = language or None
        self._model = None

    @property
    def ready(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        """Load (and on first run download) the Whisper model. Blocking."""
        from faster_whisper import WhisperModel

        self._model = WhisperModel(
            self.model_size, device="cpu", compute_type="int8"
        )

    def transcribe(self, audio_int16) -> str:
        """Transcribe a 16 kHz int16 numpy array. Blocking; run off-loop."""
        if self._model is None:
            raise RuntimeError("speech model still loading")
        import numpy as np

        audio = audio_int16.astype(np.float32) / 32768.0
        segments, _info = self._model.transcribe(
            audio,
            language=self.language,
            vad_filter=True,
            beam_size=1,
        )
        return " ".join(segment.text.strip() for segment in segments).strip()
