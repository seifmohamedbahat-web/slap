"""Microphone capture and utterance endpointing.

All heavy imports are lazy so the backend runs fine on machines without the
voice extras installed (the dashboard then reports voice as unavailable).
"""
from __future__ import annotations

SAMPLE_RATE = 16_000
FRAME_SAMPLES = 1_280  # 80 ms — the chunk size openWakeWord expects
SILENCE_RMS = 350.0    # int16 RMS below this counts as silence
MAX_UTTERANCE_SECONDS = 15.0
TRAILING_SILENCE_SECONDS = 0.9
MIN_SPEECH_SECONDS = 0.35


class MicUnavailableError(Exception):
    pass


def open_input_stream():
    """Open a 16 kHz mono int16 mic stream, or raise MicUnavailableError."""
    try:
        import sounddevice as sd
    except Exception as exc:  # missing package OR missing PortAudio lib
        raise MicUnavailableError(f"sounddevice not usable: {exc}") from exc
    try:
        stream = sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=FRAME_SAMPLES,
            channels=1,
            dtype="int16",
        )
        stream.start()
        return stream
    except Exception as exc:
        raise MicUnavailableError(f"could not open microphone: {exc}") from exc


def frame_rms(frame) -> float:
    import numpy as np

    data = np.frombuffer(frame, dtype=np.int16).astype(np.float64)
    if data.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(data))))


def read_frame(stream) -> bytes:
    data, _overflowed = stream.read(FRAME_SAMPLES)
    return bytes(data)


def record_utterance(stream, should_abort=None):
    """Record from `stream` until trailing silence or the max length.

    Returns an int16 numpy array, or None if no real speech was captured.
    `should_abort` is an optional callable checked each frame.
    """
    import numpy as np

    frames: list[bytes] = []
    speech_frames = 0
    silence_run = 0.0
    elapsed = 0.0
    frame_seconds = FRAME_SAMPLES / SAMPLE_RATE

    while elapsed < MAX_UTTERANCE_SECONDS:
        if should_abort and should_abort():
            return None
        frame = read_frame(stream)
        frames.append(frame)
        elapsed += frame_seconds
        if frame_rms(frame) >= SILENCE_RMS:
            speech_frames += 1
            silence_run = 0.0
        else:
            silence_run += frame_seconds
            # only stop on silence once we've actually heard something
            if speech_frames and silence_run >= TRAILING_SILENCE_SECONDS:
                break

    if speech_frames * frame_seconds < MIN_SPEECH_SECONDS:
        return None
    return np.frombuffer(b"".join(frames), dtype=np.int16)
