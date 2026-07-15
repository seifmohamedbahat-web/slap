"""Wake-word detection via openWakeWord (local, offline).

Uses the pretrained "hey jarvis" model by default. Model files are downloaded
once on first startup and cached by openWakeWord.
"""
from __future__ import annotations


class WakeWordDetector:
    def __init__(self, model_name: str, threshold: float) -> None:
        self.model_name = model_name
        self.threshold = threshold
        self._model = None

    @property
    def ready(self) -> bool:
        return self._model is not None

    def load(self) -> None:
        """Download (first run) and load the wake-word model. Blocking."""
        import openwakeword
        from openwakeword.model import Model

        try:
            openwakeword.utils.download_models(model_names=[self.model_name])
        except Exception:
            pass  # offline is fine if the model is already cached
        self._model = Model(
            wakeword_models=[self.model_name],
            inference_framework="onnx",
        )

    def detect(self, frame_int16) -> bool:
        """Score one 80 ms frame; True when the wake word fires."""
        if self._model is None:
            return False
        scores = self._model.predict(frame_int16)
        if any(score >= self.threshold for score in scores.values()):
            self._model.reset()  # avoid double-triggering on the same audio
            return True
        return False
