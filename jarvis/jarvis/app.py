"""The Jarvis application: wires audio, brain, and tools together.

Two modes:
- voice (the product): wake word → record → transcribe → LLM+tools → speak
- text (developer REPL): type instead of speak; same brain and tools
"""

from __future__ import annotations

import logging
import random

from .config import Config
from .llm.router import create_provider
from .tools.executor import ToolExecutor
from .tools.registry import ToolRegistry
from .tools.computer import register_computer_tools

log = logging.getLogger(__name__)

ACK_PHRASES = ["Yes?", "Go ahead.", "At your service."]
YES_WORDS = {"yes", "yeah", "yep", "sure", "confirm", "confirmed", "affirmative",
             "do it", "go ahead", "proceed", "please do"}


def setup_logging(config: Config) -> None:
    log_dir = config.path("logs")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.FileHandler(log_dir / "jarvis.log", encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )


def build_brain(config: Config, confirm) -> object:
    """Assemble registry → executor → provider. ``confirm`` gates destructive tools."""
    registry = ToolRegistry()
    register_computer_tools(registry, config.path("screenshots"))
    executor = ToolExecutor(registry, confirm, config.path("logs") / "actions.jsonl")
    return create_provider(config, registry, executor)


def run_text(config: Config) -> None:
    """Developer REPL — no audio hardware needed."""

    def confirm(prompt: str) -> bool:
        answer = input(f"[confirm] {prompt} (y/n) ").strip().lower()
        return answer in {"y", "yes"}

    brain = build_brain(config, confirm)
    print(f"Jarvis text mode — provider: {brain.name}. Ctrl-C or 'quit' to exit.")
    while True:
        try:
            user_text = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not user_text:
            continue
        if user_text.lower() in {"quit", "exit"}:
            break
        try:
            reply = brain.respond(user_text)
        except Exception as exc:  # noqa: BLE001
            log.exception("Brain error")
            reply = f"(error) {exc}"
        print(f"Jarvis: {reply}")


def run_voice(config: Config) -> None:
    from .audio.mic import Microphone
    from .audio.stt import create_stt
    from .audio.tts import Speaker, create_tts
    from .audio.wake_word import create_wake_word

    sample_rate = int(config.get("audio.sample_rate", 16000))
    chunk_samples = int(config.get("audio.chunk_samples", 1280))
    rms_threshold = float(config.get("stt.rms_threshold", 0.015))
    silence_seconds = float(config.get("stt.silence_seconds", 1.2))
    max_seconds = float(config.get("stt.max_command_seconds", 15))

    log.info("Starting audio stack…")
    tts = create_tts(config)
    speaker = Speaker()
    stt = create_stt(config)
    wake = create_wake_word(config)
    mic = Microphone(sample_rate=sample_rate, chunk_samples=chunk_samples)

    def speak(text: str) -> None:
        try:
            speaker.play(tts.synth(text))
        except Exception:  # noqa: BLE001 — a TTS hiccup must not kill the loop
            log.exception("TTS failure for: %r", text)
        # Don't let Jarvis hear himself.
        mic.drain()

    def listen() -> str:
        audio = mic.record_command(
            rms_threshold=rms_threshold,
            silence_seconds=silence_seconds,
            max_seconds=max_seconds,
        )
        text = stt.transcribe(audio)
        log.info("Heard: %r", text)
        return text

    def confirm(prompt: str) -> bool:
        speak(f"{prompt} Say yes to confirm.")
        answer = listen().lower().strip(" .!,")
        return any(word in answer for word in YES_WORDS)

    brain = build_brain(config, confirm)

    # Pre-synthesize acknowledgements so the wake response is instant.
    for phrase in ACK_PHRASES:
        try:
            tts.synth(phrase)
        except Exception:  # noqa: BLE001
            log.exception("Could not pre-cache ack phrase")
            break

    log.info("Jarvis is listening for 'Hey Jarvis' (provider: %s)…", brain.name)
    print("Jarvis is idle — say 'Hey Jarvis'. Ctrl-C to quit.")

    try:
        while True:
            if not wake.detected(mic.next_chunk()):
                continue

            log.info("Wake word detected")
            speak(random.choice(ACK_PHRASES))
            command = listen()
            if not command:
                speak("I didn't catch that.")
                continue

            try:
                reply = brain.respond(command)
            except Exception as exc:  # noqa: BLE001
                log.exception("Brain error")
                reply = "Something went wrong on my end. The details are in the log."
                del exc
            speak(reply)
            mic.drain()
    except KeyboardInterrupt:
        print("\nShutting down. Goodbye.")
    finally:
        mic.close()
