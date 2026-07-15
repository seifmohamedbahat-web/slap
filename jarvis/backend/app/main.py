"""Jarvis backend — FastAPI app.

Endpoints:
    GET  /api/health              liveness + config sanity
    GET  /api/system/stats        CPU / RAM / disk for the dashboard sidebar
    GET  /api/activity            audit trail (empty in Phase 1)
    POST /api/chat                SSE stream of one agentic turn
    POST /api/conversation/reset  clear the in-memory conversation
"""
import asyncio
import json
import shutil
from typing import Any

import psutil
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from . import db
from .agent import run_turn
from .config import get_settings

app = FastAPI(title="Jarvis", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # Local desktop app only: Vite dev server, Tauri dev server, Tauri webview.
    allow_origins=[
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "tauri://localhost",
        "http://tauri.localhost",
        "https://tauri.localhost",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single-user desktop app: one in-memory conversation, one turn at a time.
_conversation: list[dict[str, Any]] = []
_turn_lock = asyncio.Lock()


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


@app.get("/api/health")
def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "model": settings.jarvis_model,
        "api_key_configured": bool(settings.anthropic_api_key),
        "allowed_roots": [str(r) for r in settings.allowed_roots],
        "phase": 1,
    }


@app.get("/api/system/stats")
def system_stats() -> dict:
    mem = psutil.virtual_memory()
    disks = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = shutil.disk_usage(part.mountpoint)
        except OSError:
            continue
        disks.append(
            {
                "mount": part.mountpoint,
                "total_gb": round(usage.total / 1e9, 1),
                "free_gb": round(usage.free / 1e9, 1),
                "used_percent": round(100 * (usage.total - usage.free) / usage.total, 1)
                if usage.total
                else 0,
            }
        )
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory": {
            "total_gb": round(mem.total / 1e9, 1),
            "used_percent": mem.percent,
        },
        "disks": disks[:6],
    }


@app.get("/api/activity")
def activity(limit: int = 100) -> dict:
    return {"entries": db.recent_activity(min(max(limit, 1), 500))}


@app.post("/api/conversation/reset")
def reset_conversation() -> dict:
    if _turn_lock.locked():
        raise HTTPException(status_code=409, detail="A turn is still in progress.")
    _conversation.clear()
    return {"status": "reset"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    if _turn_lock.locked():
        raise HTTPException(status_code=409, detail="Jarvis is already responding.")

    async def event_stream():
        async with _turn_lock:
            _conversation.append({"role": "user", "content": request.message})
            try:
                async for event in run_turn(_conversation):
                    yield _sse(event)
            except Exception as exc:  # last-resort guard: never leave the stream hanging
                yield _sse({"type": "error", "message": f"Internal error: {exc}"})
                yield _sse({"type": "turn_done", "stop_reason": "error"})
            yield _sse({"type": "done"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host=settings.jarvis_host, port=settings.jarvis_port)


if __name__ == "__main__":
    run()
