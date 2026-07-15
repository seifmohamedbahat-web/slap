# JARVIS Architecture

A three-layer Electron application: **main** (Node, privileged), **preload**
(the typed bridge), and **renderer** (React, sandboxed). A `shared` layer holds
types and the IPC contract that both sides compile against.

```
┌──────────────────────────────────────────────────────────────┐
│ Renderer (React, sandboxed) — src/renderer                    │
│   pages/ · components/ · lib/api.ts → window.jarvis           │
└───────────────▲──────────────────────────────┬───────────────┘
                │  invoke(channel, payload)     │  events
                │                               ▼
┌───────────────┴──────────────────────────────────────────────┐
│ Preload (contextBridge) — src/preload                         │
│   exposes window.jarvis: { invoke, on }  (allow-listed)       │
└───────────────▲──────────────────────────────┬───────────────┘
                │  ipcRenderer.invoke           │  webContents.send
┌───────────────┴──────────────────────────────▼───────────────┐
│ Main (Node) — src/main                                        │
│   ipc.ts (handler registry)                                   │
│   core/  db · logger · settings · keystore · permissions      │
│   modules/ ai · voice · automation · system · files · data …  │
└──────────────────────────────────────────────────────────────┘
                │
                ▼  node:sqlite (WAL)
        <userData>/jarvis.db
```

## Shared contract (`src/shared`)

- **`types.ts`** — every domain object (notes, tasks, events, projects,
  memory, system stats, settings, automation intents, …). No runtime imports.
- **`ipc.ts`** — `IpcInvokeMap` maps each channel to `[payload, response]`,
  and `IpcEvents` types main→renderer pushes. The `JarvisBridge` interface is
  the shape exposed on `window.jarvis`. This single file makes the whole
  renderer↔main surface type-safe end to end.

## Main process (`src/main`)

### Core services (`core/`)

| File             | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `db.ts`          | `node:sqlite` connection, migrations, id/time helpers. Electron-free. |
| `logger.ts`      | Console + rotating file + `activity_logs` table sinks.                |
| `settings.ts`    | JSON settings merged over defaults (forward-compatible).              |
| `keystore.ts`    | API keys encrypted via `safeStorage`; graceful unencrypted fallback.  |
| `permissions.ts` | Native confirm dialog for sensitive/dangerous actions.                |

### Feature modules (`modules/`)

| Module        | Contents                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| `ai/`         | Provider implementations (OpenAI, Gemini, Claude) + streaming `router.ts` with task routing and fallback. |
| `voice/`      | ElevenLabs TTS + STT with Whisper fallback.                              |
| `automation/` | `engine.ts` (pure NL→intent parser + AI-intent validator) and `executor.ts` (permission gate, undo registry, side effects). |
| `system/`     | `stats.ts` (CPU/RAM/disk/battery/network telemetry) and `control.ts` (launch/close apps, screenshots, volume, power). |
| `files/`      | Listing, trash-deletes, organize-downloads (with undo), duplicate finder, zip/unzip. |
| `data/`       | CRUD + memory for notes, tasks, events, projects, reminders, command history; `profile.ts` (PIN via scrypt). |
| `plugins/`    | VM-sandboxed plugin loader registering command handlers.                 |
| `updater.ts`  | `electron-updater` wiring for packaged builds.                           |

### Wiring

- **`ipc.ts`** registers every handler from the contract in one auditable place,
  wrapping each in try/catch that logs and rethrows a clean message.
- **`index.ts`** boots the db, logger, router, plugins and IPC; hardens the
  session (blocked navigation/new-windows, media-only permissions); creates the
  window; and runs background loops (2 s system-stats ticks, 15 s reminder poll).

## Preload (`src/preload`)

A single `contextBridge.exposeInMainWorld("jarvis", …)` call exposing `invoke`
and `on`. Nothing else crosses the boundary. Context isolation is on and node
integration is off, so the renderer cannot reach Node except through this
allow-listed surface.

## Renderer (`src/renderer`)

- **`lib/api.ts`** — the typed wrapper over `window.jarvis`.
- **`lib/hooks.ts`** — `useAsync`, `useSystemStats` (live tick + rolling
  history), `useClock`, `useLocalState`.
- **`components/`** — the glassmorphism design system (`ui.tsx`), the inline SVG
  icon set (`Icon.tsx`), data-viz primitives built per the dataviz method
  (`viz.tsx`: sparklines, radial gauges, meters, stat tiles), the animated
  `VoiceOrb`, the ⌘K `CommandPalette`, and the `LockScreen`.
- **`App.tsx`** — the shell: sidebar navigation, in-memory routing, command
  palette, reminder toasts, and a per-page error boundary.
- **`pages/`** — the 20 feature pages plus onboarding.

### Data flow example — a chat turn

1. `ChatPage` calls `ai:chat:start` → main returns a `requestId`.
2. `router.ts` picks a provider (override → task routing → default), persists the
   user message, and streams the completion.
3. Each chunk is pushed as an `ai:stream` event (`delta`), which the page appends
   live; `provider`/`model` events show which model answered.
4. On `done`, the assistant message is persisted and the conversation list is
   refreshed. On failure, the router transparently retries the next provider.

## Build pipeline

- **Renderer** — Vite (`vite.config.ts`), output `dist/renderer`. A production
  CSP is injected only into the built HTML.
- **Main + preload** — esbuild (`scripts/build-main.mjs`), CJS output in
  `dist/main` and `dist/preload`. Dev uses `scripts/dev.mjs` (esbuild watch +
  Vite + Electron).
- **Packaging** — electron-builder (`electron-builder.yml`) for Windows (NSIS),
  macOS (dmg) and Linux (AppImage).

## Testing

Vitest covers the pure, Electron-free logic: the automation intent parser and
AI-intent validator, the data store CRUD + memory rendering, and settings
deep-merge/forward-compat. Run with `npm test`.
