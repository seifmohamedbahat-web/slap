"""Jarvis backend — FastAPI app.

Endpoints:
    GET  /api/health              liveness + config sanity
    GET  /api/system/stats        CPU / RAM / disk for the dashboard sidebar
    GET  /api/activity            audit trail (empty in Phase 1-2)
    POST /api/chat                SSE stream of one agentic turn (typed input)
    POST /api/conversation/reset  clear the in-memory conversation
    WS   /api/voice/ws            voice pipeline + voice-turn agent events
    GET  /api/voice/status        voice availability / model readiness
    POST /api/voice/toggle        enable or disable wake-word listening
    POST /api/voice/ptt           push-to-talk: listen right now
    GET  /api/voice/audio/{id}    synthesized TTS clip for the dashboard
"""
import asyncio
import json
import shutil

import psutil
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from . import conversation, db
from .agent import run_turn
from .config import get_settings
from .events import broadcaster
from .voice import tts as voice_tts
from .voice import voice_service

app = FastAPI(title="Jarvis", version="0.2.0")

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


def _register_global_hotkey() -> None:
    """Global push-to-talk hotkey (works while the window is in the tray).

    Best-effort: the `keyboard` package is Windows-friendly but optional.
    The dashboard also binds the same combo in-app as a fallback.
    """
    hotkey = get_settings().jarvis_ptt_hotkey
    if not hotkey:
        return
    try:
        import keyboard

        keyboard.add_hotkey(hotkey, voice_service.trigger_ptt)
        print(f"[voice] global push-to-talk registered: {hotkey}")
    except Exception as exc:
        print(f"[voice] global hotkey unavailable ({exc}); in-app hotkey still works")


@app.on_event("startup")
async def _startup() -> None:
    db.init_db()
    broadcaster.loop = asyncio.get_running_loop()
    await voice_service.start()
    _register_global_hotkey()


@app.on_event("shutdown")
def _shutdown() -> None:
    voice_service.stop()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)


class VoiceToggleRequest(BaseModel):
    enabled: bool


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
        "phase": 2,
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
    if conversation.turn_lock.locked():
        raise HTTPException(status_code=409, detail="A turn is still in progress.")
    conversation.reset()
    return {"status": "reset"}


@app.post("/api/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    if conversation.turn_lock.locked():
        raise HTTPException(status_code=409, detail="Jarvis is already responding.")

    async def event_stream():
        reply_parts: list[str] = []
        async with conversation.turn_lock:
            conversation.history.append({"role": "user", "content": request.message})
            try:
                async for event in run_turn(conversation.history):
                    if event["type"] == "text_delta":
                        reply_parts.append(event["text"])
                    yield _sse(event)
            except Exception as exc:  # last-resort guard: never leave the stream hanging
                yield _sse({"type": "error", "message": f"Internal error: {exc}"})
                yield _sse({"type": "turn_done", "stop_reason": "error"})
            yield _sse({"type": "done"})

        # Optionally speak typed replies (voice replies are always spoken).
        reply = "".join(reply_parts).strip()
        if reply and get_settings().jarvis_speak_typed_replies:
            result = await voice_tts.synthesize(reply)
            if result is not None:
                data, mime = result
                audio_id = voice_tts.store_audio(data, mime)
                await broadcaster.broadcast({"type": "speak", "audio_id": audio_id})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---- voice ------------------------------------------------------------------


@app.websocket("/api/voice/ws")
async def voice_ws(websocket: WebSocket) -> None:
    await broadcaster.connect(websocket)
    try:
        await websocket.send_json(voice_service.status())
        while True:
            await websocket.receive_text()  # keepalive pings; content ignored
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(websocket)


@app.get("/api/voice/status")
def voice_status() -> dict:
    return voice_service.status()


@app.post("/api/voice/toggle")
def voice_toggle(request: VoiceToggleRequest) -> dict:
    return voice_service.set_enabled(request.enabled)


@app.post("/api/voice/ptt")
def voice_ptt() -> dict:
    if not (voice_service.available and voice_service.enabled):
        raise HTTPException(
            status_code=409,
            detail="Voice is not active — enable the mic first.",
        )
    voice_service.trigger_ptt()
    return {"status": "listening"}


@app.get("/api/voice/audio/{audio_id}")
def voice_audio(audio_id: str) -> Response:
    clip = voice_tts.get_audio(audio_id)
    if clip is None:
        raise HTTPException(status_code=404, detail="Audio clip expired.")
    data, mime = clip
    return Response(content=data, media_type=mime)


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(app, host=settings.jarvis_host, port=settings.jarvis_port)


if __name__ == "__main__":
    run()
