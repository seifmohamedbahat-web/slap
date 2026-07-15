"""WebSocket broadcast hub.

Voice-initiated activity (orb states, transcripts, agent events, TTS ready)
is pushed to every connected dashboard over /api/voice/ws. The mic pipeline
runs in a worker thread, so a thread-safe submit helper is provided.
"""
import asyncio
from typing import Any

from fastapi import WebSocket


class Broadcaster:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None  # set at app startup

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._clients.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._clients.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        dead = []
        for client in self._clients:
            try:
                await client.send_json(payload)
            except Exception:
                dead.append(client)
        for client in dead:
            self._clients.discard(client)

    def broadcast_threadsafe(self, payload: dict[str, Any]) -> None:
        """Fire-and-forget broadcast from a non-async thread (mic loop)."""
        if self.loop is None or self.loop.is_closed():
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(payload), self.loop)


broadcaster = Broadcaster()
