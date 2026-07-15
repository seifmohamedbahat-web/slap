# JARVIS — AI Operating System

A voice-first, privacy-respecting desktop AI assistant that manages your
computer, files, notes, tasks, projects, and daily workflow from one premium
interface. Built with **Electron + React + TypeScript + Tailwind**, backed by a
local **SQLite** database, and wired to **OpenAI, Google Gemini, Anthropic
Claude** and **ElevenLabs**.

> Iron-Man-HUD-inspired glassmorphism UI · streaming multi-provider AI with
> automatic fallback · natural-language automation with a permission system ·
> everything stored locally.

---

## Highlights

- **Multi-provider AI** — OpenAI, Gemini and Claude behind one streaming
  interface. Route different tasks to different providers (coding → Claude,
  research → Gemini, chat → OpenAI) and fall back automatically when one fails.
- **Voice assistant** — record → transcribe (ElevenLabs Scribe / Whisper) →
  reason → speak (ElevenLabs TTS), with an interruptible, animated HUD orb.
- **Automation engine** — natural-language commands ("Open Chrome", "Organize my
  Downloads", "Shut down") parsed by rules first, then the AI as a fallback.
  Dangerous actions require confirmation; many are undoable.
- **Local everything** — notes, tasks, calendar, projects, reminders, long-term
  AI memory and command history live in a local SQLite file. No cloud account.
- **Secure by design** — API keys encrypted with the OS keychain via Electron
  `safeStorage`; optional PIN lock; hardened `BrowserWindow` (context isolation,
  no node integration, blocked navigation, strict CSP in production).
- **20 pages** — Dashboard, AI Chat, Voice, Automation, Computer Control,
  Browser Control, File Manager, Notes, Tasks, Calendar, Memory, Projects,
  System Monitor, Plugins, API Keys, Activity Logs, Settings, Profile, plus
  Onboarding and Lock screens.
- **Plugin system** — drop a folder with `plugin.json` + `main.js` to register
  custom commands, executed in a restricted VM sandbox.
- **Auto-update ready** — `electron-updater` wired for packaged builds.

---

## Quick start

Requires **Node 22.13+** (for the built-in `node:sqlite` module).

```bash
cd jarvis
npm install
npm run dev        # Vite dev server + Electron with hot reload
```

On first launch, complete onboarding (your name + optionally an API key). Add
more keys any time under **API Keys**.

### Scripts

| Script              | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Dev server + Electron (esbuild watch on main/preload)   |
| `npm run typecheck` | Type-check renderer and main (`tsc --noEmit`)           |
| `npm run build`     | Type-check, build renderer (Vite) and main (esbuild)    |
| `npm test`          | Run the Vitest unit suite                               |
| `npm run dist`      | Build + package installers via electron-builder         |

---

## Getting API keys

| Provider   | Used for                       | Get a key                                             |
| ---------- | ------------------------------ | ----------------------------------------------------- |
| OpenAI     | Chat, Whisper STT fallback     | https://platform.openai.com/api-keys                  |
| Gemini     | Research, long context         | https://aistudio.google.com/apikey                    |
| Claude     | Coding                         | https://console.anthropic.com/settings/keys           |
| ElevenLabs | Text-to-speech & transcription | https://elevenlabs.io/app/settings/api-keys           |

Keys are encrypted at rest with your OS keychain and never leave your machine.

---

## Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full module map. In short:

```
src/
  main/        Electron main process (Node)
    core/      db, logger, settings, keystore, permissions
    modules/   ai, voice, automation, system, files, data, plugins, updater
    ipc.ts     typed IPC handler registry
    index.ts   entry point + background loops
  preload/     contextBridge → window.jarvis (typed)
  renderer/    React UI (Vite)
    components/ design system + data-viz + voice orb
    pages/      the 20 feature pages
  shared/      types + IPC contract (no runtime deps)
```

The renderer never touches Node APIs directly — it calls the typed
`window.jarvis` bridge, which forwards only the channels declared in
`src/shared/ipc.ts`.

---

## Security model

- **Context isolation on, node integration off.** The renderer runs sandboxed;
  only the allow-listed IPC surface is reachable.
- **Encrypted secrets.** API keys use Electron `safeStorage` (DPAPI / Keychain /
  libsecret). If no backend is present, keys are stored obfuscated and the UI
  warns you.
- **Permission gate.** Destructive intents (delete, shutdown, restart, raw shell
  commands) prompt for native confirmation unless you disable the setting.
- **Deletes go to the OS trash**, so they are recoverable.
- **Activity logs** record every action for transparency.

---

## Extending JARVIS

**Add an AI provider:** implement the `AiProvider` interface in
`src/main/modules/ai/providers/` and register it in `router.ts`.

**Add an automation command:** add a rule to `RULES` in
`src/main/modules/automation/engine.ts` and a case in `executor.ts`.

**Write a plugin:** create `<userData>/plugins/<name>/` with `plugin.json` and
`main.js` calling `jarvis.registerCommand(...)`. See `plugins/example-hello`.

**n8n / integrations:** the automation engine and plugin system are the
extension points for wiring email, calendar, GitHub, Slack, Discord and Telegram
workflows through n8n.

---

## License

MIT
