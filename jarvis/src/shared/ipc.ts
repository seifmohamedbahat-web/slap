/**
 * The typed IPC contract. Every renderer→main call goes through
 * `window.jarvis.invoke(channel, payload)` and is typed by this map;
 * main→renderer pushes are typed by `IpcEvents`.
 */
import type {
  ActivityLogEntry,
  AiProviderId,
  AiStreamEvent,
  ApiKeyStatus,
  AppInfo,
  AppSettings,
  AutomationResult,
  CalendarEvent,
  ChatMessage,
  ChatRequest,
  CommandHistoryEntry,
  Conversation,
  DuplicateGroup,
  FileEntry,
  MemoryEntry,
  Note,
  OkResult,
  OrganizeResult,
  PluginInfo,
  ProcessInfo,
  Project,
  Reminder,
  SpeechResult,
  SystemStats,
  TaskItem,
  TranscriptionResult,
  UserProfile,
} from "./types";

/** requests: [payload, response] */
export interface IpcInvokeMap {
  // App / profile
  "app:info": [void, AppInfo];
  "app:openExternal": [{ url: string }, OkResult];
  "app:openPath": [{ path: string }, OkResult];
  "profile:get": [void, UserProfile];
  "profile:update": [{ name: string; email: string }, UserProfile];
  "profile:setPin": [{ pin: string | null }, OkResult];
  "profile:verifyPin": [{ pin: string }, { valid: boolean }];
  "profile:completeOnboarding": [void, OkResult];

  // Settings
  "settings:get": [void, AppSettings];
  "settings:update": [Partial<AppSettings>, AppSettings];

  // API keys
  "keys:list": [void, ApiKeyStatus[]];
  "keys:set": [{ provider: string; key: string }, ApiKeyStatus];
  "keys:delete": [{ provider: string }, OkResult];
  "keys:test": [{ provider: string }, OkResult];

  // AI chat
  "ai:conversations:list": [void, Conversation[]];
  "ai:conversations:create": [
    { title?: string; provider?: AiProviderId; model?: string },
    Conversation,
  ];
  "ai:conversations:delete": [{ id: string }, OkResult];
  "ai:conversations:rename": [{ id: string; title: string }, OkResult];
  "ai:messages:list": [{ conversationId: string }, ChatMessage[]];
  "ai:chat:start": [ChatRequest, { requestId: string }];
  "ai:chat:cancel": [{ requestId: string }, OkResult];
  "ai:models": [void, { provider: AiProviderId; models: string[] }[]];

  // Voice
  "voice:transcribe": [
    { audioBase64: string; mimeType: string },
    TranscriptionResult,
  ];
  "voice:speak": [{ text: string }, SpeechResult];

  // Automation
  "automation:run": [{ input: string; confirmed?: boolean }, AutomationResult];
  "automation:undo": [{ token: string }, OkResult];
  "automation:history": [{ limit?: number }, CommandHistoryEntry[]];

  // System
  "system:stats": [void, SystemStats];
  "system:processes": [void, ProcessInfo[]];
  "system:screenshot": [void, { path: string }];
  "system:power": [
    { action: "shutdown" | "restart" | "sleep" | "lock" },
    AutomationResult,
  ];

  // Files
  "files:list": [{ dir: string }, { entries: FileEntry[]; dir: string }];
  "files:home": [void, { home: string; downloads: string; documents: string }];
  "files:read": [{ path: string; maxBytes?: number }, { content: string; truncated: boolean }];
  "files:mkdir": [{ path: string }, OkResult];
  "files:rename": [{ from: string; to: string }, OkResult];
  "files:copy": [{ from: string; to: string }, OkResult];
  "files:move": [{ from: string; to: string }, OkResult];
  "files:delete": [{ path: string }, AutomationResult];
  "files:organizeDownloads": [void, OrganizeResult];
  "files:findDuplicates": [{ dir: string }, DuplicateGroup[]];
  "files:zip": [{ source: string; dest: string }, OkResult];
  "files:unzip": [{ source: string; destDir: string }, OkResult];

  // Notes / tasks / calendar / projects / reminders
  "notes:list": [{ kind?: Note["kind"] } | void, Note[]];
  "notes:save": [Partial<Note> & { id?: string }, Note];
  "notes:delete": [{ id: string }, OkResult];
  "tasks:list": [void, TaskItem[]];
  "tasks:save": [Partial<TaskItem> & { id?: string }, TaskItem];
  "tasks:delete": [{ id: string }, OkResult];
  "events:list": [void, CalendarEvent[]];
  "events:save": [Partial<CalendarEvent> & { id?: string }, CalendarEvent];
  "events:delete": [{ id: string }, OkResult];
  "projects:list": [void, Project[]];
  "projects:save": [Partial<Project> & { id?: string }, Project];
  "projects:delete": [{ id: string }, OkResult];
  "reminders:list": [void, Reminder[]];
  "reminders:save": [{ message: string; fireAt: string }, Reminder];
  "reminders:delete": [{ id: string }, OkResult];

  // Memory
  "memory:list": [{ category?: string } | void, MemoryEntry[]];
  "memory:save": [Partial<MemoryEntry> & { id?: string }, MemoryEntry];
  "memory:delete": [{ id: string }, OkResult];

  // Plugins
  "plugins:list": [void, PluginInfo[]];
  "plugins:setEnabled": [{ id: string; enabled: boolean }, PluginInfo[]];
  "plugins:openDir": [void, OkResult];

  // Logs
  "logs:list": [
    { limit?: number; level?: string; category?: string },
    ActivityLogEntry[],
  ];
  "logs:clear": [void, OkResult];
}

/** main → renderer push events */
export interface IpcEvents {
  "ai:stream": AiStreamEvent;
  "system:stats:tick": SystemStats;
  "reminder:fired": Reminder;
}

export type IpcChannel = keyof IpcInvokeMap;
export type IpcEventChannel = keyof IpcEvents;

/** Shape exposed on window.jarvis by the preload script. */
export interface JarvisBridge {
  invoke<C extends IpcChannel>(
    channel: C,
    payload: IpcInvokeMap[C][0],
  ): Promise<IpcInvokeMap[C][1]>;
  on<C extends IpcEventChannel>(
    channel: C,
    listener: (payload: IpcEvents[C]) => void,
  ): () => void;
}
