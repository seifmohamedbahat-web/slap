/**
 * Domain types shared between the Electron main process and the renderer.
 * This file must stay free of runtime imports from either side.
 */

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export type AiProviderId = "openai" | "gemini" | "claude";

export type AiTask = "chat" | "coding" | "research" | "automation";

export interface AiModelInfo {
  provider: AiProviderId;
  id: string;
  label: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: AiProviderId;
  model?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  provider: AiProviderId;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  conversationId: string;
  content: string;
  /** Optional explicit provider/model override for this message. */
  provider?: AiProviderId;
  model?: string;
  task?: AiTask;
}

export interface AiStreamEvent {
  requestId: string;
  type: "delta" | "done" | "error" | "provider";
  delta?: string;
  message?: ChatMessage;
  error?: string;
  /** Emitted when the router selects (or falls back to) a provider. */
  provider?: AiProviderId;
  model?: string;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  text: string;
  provider: "elevenlabs" | "openai";
}

export interface SpeechResult {
  /** base64-encoded audio */
  audioBase64: string;
  mimeType: string;
}

// ---------------------------------------------------------------------------
// Productivity
// ---------------------------------------------------------------------------

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  kind: "note" | "journal" | "meeting";
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskItem {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  notes: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  status: "active" | "paused" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  message: string;
  fireAt: string;
  fired: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryCategory =
  | "preference"
  | "project"
  | "workflow"
  | "fact"
  | "place"
  | "business";

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number; // 1..5
  lastUsedAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export interface SystemStats {
  cpuUsagePercent: number;
  cpuCount: number;
  cpuModel: string;
  memTotalBytes: number;
  memUsedBytes: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  uptimeSeconds: number;
  platform: string;
  hostname: string;
  loadAverage: number[];
  batteryPercent: number | null;
  onBattery: boolean | null;
  netRxBytesPerSec: number;
  netTxBytesPerSec: number;
  timestamp: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memBytes: number;
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export interface DuplicateGroup {
  hash: string;
  sizeBytes: number;
  paths: string[];
}

export interface OrganizeResult {
  moved: { from: string; to: string }[];
  skipped: string[];
}

// ---------------------------------------------------------------------------
// Automation
// ---------------------------------------------------------------------------

export type AutomationRisk = "safe" | "sensitive" | "dangerous";

export interface AutomationIntent {
  kind: string;
  /** Human-readable description of what will be executed. */
  summary: string;
  risk: AutomationRisk;
  params: Record<string, string>;
  /** Where the intent came from. */
  source: "rules" | "ai";
}

export interface AutomationResult {
  ok: boolean;
  intent: AutomationIntent | null;
  output: string;
  /** Set when the user declined a confirmation prompt. */
  cancelled?: boolean;
  undoToken?: string;
}

export interface CommandHistoryEntry {
  id: string;
  input: string;
  intentKind: string | null;
  status: "ok" | "error" | "cancelled" | "unrecognized";
  output: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Logs / plugins / settings / profile
// ---------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface ActivityLogEntry {
  id: number;
  level: LogLevel;
  category: string;
  message: string;
  meta: string | null;
  createdAt: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  /** Command keywords this plugin registers. */
  commands?: string[];
}

export interface PluginInfo {
  id: string;
  manifest: PluginManifest;
  path: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}

export interface AppSettings {
  theme: "dark";
  accent: "blue";
  defaultProvider: AiProviderId;
  defaultModels: Record<AiProviderId, string>;
  /** Task-specific provider routing, e.g. coding -> claude. */
  taskRouting: Record<AiTask, AiProviderId>;
  fallbackOrder: AiProviderId[];
  voice: {
    wakeWordEnabled: boolean;
    doubleClapEnabled: boolean;
    ttsVoiceId: string;
    sttProvider: "elevenlabs" | "openai";
    language: "auto" | "en" | "ar";
  };
  confirmDangerousActions: boolean;
  launchAtLogin: boolean;
  telemetry: false;
}

export interface UserProfile {
  name: string;
  email: string;
  hasPin: boolean;
  onboarded: boolean;
}

export interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  lastFour: string | null;
  encrypted: boolean;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export interface AppInfo {
  version: string;
  platform: string;
  arch: string;
  electron: string;
  node: string;
  dataDir: string;
  encryptionAvailable: boolean;
}

export interface OkResult {
  ok: boolean;
  error?: string;
}
