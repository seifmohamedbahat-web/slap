export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
  resultPreview?: string;
  isError?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  toolCalls: ToolCall[];
  error?: string;
}

/** Events emitted by POST /api/chat (SSE). */
export type ServerEvent =
  | { type: "state"; state: "thinking" | "speaking" | "tool" }
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | {
      type: "tool_result";
      tool_use_id: string;
      name: string;
      is_error: boolean;
      preview: string;
    }
  | { type: "turn_done"; stop_reason: string }
  | { type: "error"; message: string }
  | { type: "done" };

export interface SystemStats {
  cpu_percent: number;
  memory: { total_gb: number; used_percent: number };
  disks: { mount: string; total_gb: number; free_gb: number; used_percent: number }[];
}

export interface HealthInfo {
  status: string;
  model: string;
  api_key_configured: boolean;
  allowed_roots: string[];
  phase: number;
}

export interface VoiceStatus {
  type: "voice_status";
  available: boolean;
  enabled: boolean;
  wake_ready: boolean;
  stt_ready: boolean;
  reason: string;
}

/** Events pushed over WS /api/voice/ws (voice pipeline + voice-turn agent events). */
export type VoiceEvent =
  | VoiceStatus
  | { type: "voice_state"; state: "idle" | "listening" | "transcribing" | "speaking" }
  | { type: "voice_transcript"; text: string }
  | { type: "speak"; audio_id: string }
  | ServerEvent;
