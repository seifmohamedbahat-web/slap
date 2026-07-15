"""Shared conversation state.

Both entry points (typed chat over SSE, voice turns from the mic pipeline)
append to the same history and serialize turns through the same lock, so
Jarvis has one coherent memory of the session.
"""
import asyncio
from typing import Any

history: list[dict[str, Any]] = []
turn_lock = asyncio.Lock()


def reset() -> None:
    history.clear()
