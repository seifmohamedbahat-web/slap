"""Always-on wake-word detection.

Default engine is openWakeWord, which ships a pretrained "hey jarvis" model —
free, fully local, low CPU. Porcupine can be swapped in later behind this
same interface (config: wake_word.engine).
"""

from __future__ import annotations

import logging

import numpy as np

log = logging.getLogger(__name__)


class WakeWordDetector:
    def __init__(self, model_name: str = "hey_jarvis", threshold: float = 0.55):
        from openwakeword.model import Model
        from openwakeword.utils import download_models

        # No-op if the pretrained models are already cached locally.
        download_models([model_name])
        self.model = Model(wakeword_models=[model_name], inference_framework="onnx")
        self.model_name = model_name
        self.threshold = threshold

    def detected(self, chunk_int16: np.ndarray) -> bool:
        """Feed one 80 ms (1280-sample) int16 chunk; True on wake word."""
        scores = self.model.predict(chunk_int16)
        for name, score in scores.items():
            if self.model_name in name and score >= self.threshold:
                self.reset()
                return True
        return False

    def reset(self) -> None:
        """Clear internal buffers so one utterance can't double-trigger."""
        self.model.reset()


def create_wake_word(config) -> WakeWordDetector:
    engine = config.get("wake_word.engine", "openwakeword")
    if engine != "openwakeword":
        raise NotImplementedError(
            f"Wake-word engine {engine!r} not implemented yet — use 'openwakeword' "
            "(Porcupine support is a planned drop-in behind this interface)."
        )
    return WakeWordDetector(
        model_name=config.get("wake_word.model", "hey_jarvis"),
        threshold=float(config.get("wake_word.threshold", 0.55)),
    )
