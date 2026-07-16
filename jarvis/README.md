# Jarvis — Phase 1 MVP

A local, voice-only personal AI agent. Say **"Hey Jarvis"**, speak a request,
and it answers out loud in a British voice — or acts on your computer (open
apps, open websites, screenshots, lock/shutdown/restart) via LLM tool-use.

**Interaction loop:** wake word → acknowledgement ("Yes?") → record your
speech → transcribe → LLM decides (answer or call tools) → spoken reply.
No chat window; a debug log and an action audit log exist for the developer.

## Project structure

```
jarvis/
├── run.py                     # entry point: voice mode, or --text debug REPL
├── config.yaml                # non-secret settings (provider, voice, thresholds)
├── .env.example               # copy to .env; holds API keys (gitignored)
├── requirements.txt
├── jarvis/
│   ├── config.py              # defaults + config.yaml + .env merging
│   ├── app.py                 # the wake→listen→think→speak loop; text REPL
│   ├── audio/
│   │   ├── mic.py             # shared 16 kHz mic stream + command endpointing
│   │   ├── wake_word.py       # openWakeWord "hey jarvis" (Porcupine-ready interface)
│   │   ├── stt.py             # faster-whisper (local), swappable
│   │   └── tts.py             # edge-tts en-GB-Ryan default; ElevenLabs optional; cache
│   ├── llm/
│   │   ├── prompts.py         # Jarvis persona (spoken-prose rules, brevity, dry wit)
│   │   ├── base.py            # Provider interface
│   │   ├── anthropic_provider.py  # Claude, full tool-use loop (primary)
│   │   ├── openai_provider.py     # OpenAI function calling (secondary)
│   │   ├── ollama_provider.py     # local fallback, tools when model supports
│   │   └── router.py          # explicit or auto provider selection
│   └── tools/
│       ├── registry.py        # tool declarations + JSON schemas (provider-agnostic)
│       ├── executor.py        # confirmation gate + audit log + error capture
│       └── computer.py        # open/close app, website, screenshot, lock/power
└── tests/                     # 19 unit tests (config, tools, router, agent loop)
```

## Libraries and why

| Library | Role | Why this one |
|---|---|---|
| `openwakeword` | wake word | Ships a **pretrained "hey jarvis" model** — free, fully local, low CPU, no access key. (Porcupine can be swapped in behind the same interface; `PICOVOICE_ACCESS_KEY` slot already exists.) |
| `faster-whisper` | speech-to-text | Local and private, 4× faster than openai-whisper on CPU; `base.en` is a good speed/accuracy default. |
| `edge-tts` | text-to-speech | Free Microsoft neural voices with **no API key**; `en-GB-RyanNeural` is a convincing calm British male. Wrapped behind a `TTSEngine` interface — set `voice.tts: elevenlabs` + a key to upgrade. |
| `anthropic` | LLM brain | Claude (`claude-opus-4-8`) with native tool-use; adaptive thinking with configurable effort (default `low` for voice latency). |
| `openai`, `requests` | alt providers | OpenAI function-calling; Ollama over plain HTTP for the offline fallback. |
| `sounddevice` | mic capture | Simple NumPy-native input streams; easier to install than PyAudio. |
| `pygame` | audio playback | Reliable mp3 playback on Windows without ffmpeg. |
| `pyautogui`, `psutil` | computer control | Screenshots now (mouse/keyboard in Phase 2+); process listing/termination for closing apps. |
| `python-dotenv`, `PyYAML` | config | Secrets in `.env`, settings in `config.yaml`, defaults in code. |

## Setup (Windows, Python 3.11+)

```powershell
cd jarvis
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# edit .env and paste your ANTHROPIC_API_KEY (or OPENAI_API_KEY)
```

Then run it:

```powershell
python run.py            # voice mode — say "Hey Jarvis… open Chrome"
python run.py --text     # keyboard REPL for debugging (same brain and tools)
```

First launch downloads the wake-word and Whisper models (one-time, ~150 MB).

**Proof-of-concept commands:** "Hey Jarvis — open Chrome" · "open YouTube dot
com" · "take a screenshot" · "close Spotify" · "lock the computer" · "what
time is it" · "restart the computer" (this one asks you to say *yes* first).

## Safety (Phase 1 scope)

- **Spoken confirmation** is enforced *outside* the model: tools flagged
  `requires_confirmation` (shutdown/restart) make Jarvis ask and listen for a
  yes before the handler runs. The LLM cannot bypass it.
- **Action audit log**: every tool call (ok / declined / error) is appended to
  `logs/actions.jsonl` with timestamp and arguments.
- **Keys** live only in `.env` (gitignored) and are never logged. Encryption
  at rest is a later-phase hardening item.
- The microphone stream is only interpreted after the wake word; nothing is
  recorded to disk.

## Extensibility hooks already in place

- **New tools**: register a `Tool` (name, description, JSON schema, handler,
  optional confirmation) in `tools/` — every provider picks it up automatically.
- **Swap voice/STT/wake-word/LLM**: each sits behind a small interface chosen
  by `config.yaml`; no core changes needed.
- **MCP**: `config.yaml` has an `mcp_servers` list reserved; the generic MCP
  client lands in Phase 5.

## Assumptions made (flag if wrong)

1. **Anthropic Claude** as the primary brain (`auto` routing prefers it, then
   OpenAI, then local Ollama). Gemini is a planned router entry, not built yet.
2. **edge-tts** as the default voice so the MVP runs with a single API key;
   ElevenLabs is config-switchable when you want the premium voice.
3. **openWakeWord** over Porcupine — its stock "hey jarvis" model avoids a
   Picovoice account for v1.
4. Reasoning effort defaults to `low` to keep spoken replies snappy; bump
   `llm.effort` in `config.yaml` if answers feel shallow.

## Tests

```powershell
python -m pytest tests/ -q
```

19 tests cover config merging, the tool registry/executor (including the
confirmation gate and audit log), provider auto-selection, and the Anthropic
tool-use loop against a stubbed SDK client. The audio stack needs real
hardware, so it's exercised manually via `python run.py`.
