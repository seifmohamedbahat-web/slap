# Jarvis — Personal AI Assistant for Windows

Phase 1 (MVP skeleton): a system-tray desktop app with a dark HUD dashboard,
text chat wired to the Claude API with tool use, and **read-only** tools:

- `search_files` — find files by name/pattern/size/date
- `list_directory` — inspect a folder
- `read_document` — extract PDF / Word / Excel / CSV / text files for
  summarization and analysis

No write, delete, app-control, or shell tools exist yet — those arrive in
Phases 3–4 behind the permission-tier + undo system. The SQLite
`activity_log` table (audit trail / undo backbone) is already created so
later phases plug in cleanly; nothing writes to it in Phase 1.

```
jarvis/
├── backend/     FastAPI + Anthropic SDK (agent loop, tools, SQLite)
└── frontend/    Tauri 2 + React + Tailwind dashboard (tray app)
```

## Prerequisites (Windows)

- Python 3.11+
- Node.js 20+
- Rust toolchain (`rustup`) + [Tauri prerequisites](https://tauri.app/start/prerequisites/)
  — only needed for the desktop shell; the dashboard also runs in a browser.
- An Anthropic API key (https://platform.claude.com)

## 1. Backend

```powershell
cd jarvis\backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

copy ..\.env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...

uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Sanity check: http://127.0.0.1:8765/api/health

> Keys live only in `backend/.env`, which is git-ignored. Never commit keys.

## 2. Dashboard

Desktop app (tray icon, close-to-tray):

```powershell
cd jarvis\frontend
npm install
npm run tauri dev      # dev
npm run tauri build    # installer (msi/nsis)
```

No Rust toolchain? Run it in the browser instead:

```powershell
npm run dev            # then open http://localhost:1420
```

## Configuration

All settings are environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | required |
| `JARVIS_MODEL` | `claude-opus-4-8` | Claude model for reasoning/tool use |
| `JARVIS_ALLOWED_ROOTS` | your home dir | comma-separated dirs Jarvis may read |
| `JARVIS_PORT` | `8765` | backend port |
| `JARVIS_DB_PATH` | `~/.jarvis/jarvis.db` | SQLite location |

Every model-supplied path is resolved and checked against
`JARVIS_ALLOWED_ROOTS` before any read.

## Architecture notes

- `POST /api/chat` streams Server-Sent Events: `text_delta`, `tool_use`,
  `tool_result`, orb `state` changes, `turn_done`. The frontend renders tool
  calls as collapsible cards in the transcript.
- The agent loop (`backend/app/agent.py`) streams each model response,
  executes tool calls locally, returns all results in a single user message,
  and repeats until Claude finishes (handles `pause_turn`; caps tool rounds).
- Adaptive thinking is enabled; the orb switches to "Thinking…" during it.
- Conversation state is in-memory (single user); `↺` resets it.

## Roadmap

- **Phase 2** — wake word, local STT (faster-whisper), TTS, push-to-talk,
  orb voice states
- **Phase 3** — safe file/app control: move/rename/organize with undo log +
  dry-run previews, app launching, screenshots
- **Phase 4** — full-control tier: shell commands with confirmation flow,
  system settings, audit-trail UI
- **Phase 5** — routines, schedules, voice macros, polish
