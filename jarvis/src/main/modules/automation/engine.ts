/**
 * Natural-language command parser. Pure and Electron-free so it can be
 * unit-tested; the executor handles side effects. Rule matching covers the
 * fast common paths, and the executor escalates to an AI parse when no rule
 * fires.
 */
import type { AutomationIntent, AutomationRisk } from "@shared/types";

interface Rule {
  kind: string;
  risk: AutomationRisk;
  patterns: RegExp[];
  extract?: (match: RegExpMatchArray) => Record<string, string>;
  summary: (params: Record<string, string>) => string;
}

const RULES: Rule[] = [
  {
    kind: "power",
    risk: "dangerous",
    patterns: [
      /^(?:please\s+)?(shut\s?down|power\s+off|turn\s+off)(?:\s+(?:the\s+)?(?:pc|computer|machine))?$/i,
      /^(restart|reboot)(?:\s+(?:the\s+)?(?:pc|computer|machine))?$/i,
      /^(sleep)(?:\s+(?:the\s+)?(?:pc|computer|machine))?$/i,
    ],
    extract: (m) => ({
      action: /restart|reboot/i.test(m[1]) ? "restart" : /sleep/i.test(m[1]) ? "sleep" : "shutdown",
    }),
    summary: (p) => `Power: ${p.action} the computer`,
  },
  {
    kind: "lock",
    risk: "sensitive",
    patterns: [/^lock(?:\s+(?:the\s+)?(?:pc|computer|screen|machine))?$/i],
    summary: () => "Lock the computer",
  },
  {
    kind: "close_app",
    risk: "sensitive",
    patterns: [/^(?:close|quit|kill|stop)\s+(.{1,60})$/i],
    extract: (m) => ({ app: m[1].trim() }),
    summary: (p) => `Close application “${p.app}”`,
  },
  {
    kind: "restart_app",
    risk: "sensitive",
    patterns: [/^(?:restart|relaunch)\s+(?!the\s+(?:pc|computer)\b)(.{1,60})$/i],
    extract: (m) => ({ app: m[1].trim() }),
    summary: (p) => `Restart application “${p.app}”`,
  },
  {
    kind: "web_search",
    risk: "safe",
    patterns: [
      /^(?:search(?:\s+google)?|google)\s+(?:for\s+)?(.{1,200})$/i,
      /^look\s+up\s+(.{1,200})$/i,
    ],
    extract: (m) => ({ query: m[1].trim() }),
    summary: (p) => `Search Google for “${p.query}”`,
  },
  {
    kind: "open_url",
    risk: "safe",
    patterns: [
      /^(?:open|go\s+to|visit)\s+((?:https?:\/\/)?[\w-]+(?:\.[\w-]+)+\S*)$/i,
    ],
    extract: (m) => ({ url: m[1].trim() }),
    summary: (p) => `Open ${p.url} in the browser`,
  },
  {
    kind: "organize_downloads",
    risk: "sensitive",
    patterns: [
      /^(?:organi[sz]e|clean(?:\s*up)?|sort)\s+(?:my\s+)?downloads(?:\s+folder)?$/i,
    ],
    summary: () => "Organize the Downloads folder into category subfolders",
  },
  {
    kind: "find_duplicates",
    risk: "safe",
    patterns: [/^find\s+duplicate(?:\s+files)?(?:\s+in\s+(.{1,200}))?$/i],
    extract: (m) => ({ dir: (m[1] ?? "").trim() }),
    summary: (p) => `Find duplicate files${p.dir ? ` in ${p.dir}` : " in Downloads"}`,
  },
  {
    kind: "create_folder",
    risk: "safe",
    patterns: [/^(?:create|make|new)\s+(?:a\s+)?folder\s+(?:called\s+|named\s+)?(.{1,120})$/i],
    extract: (m) => ({ name: m[1].trim().replace(/^["']|["']$/g, "") }),
    summary: (p) => `Create folder “${p.name}”`,
  },
  {
    kind: "delete_path",
    risk: "dangerous",
    patterns: [/^(?:delete|remove|trash)\s+(?:the\s+)?(?:file|folder)?\s*(.{1,240})$/i],
    extract: (m) => ({ path: m[1].trim().replace(/^["']|["']$/g, "") }),
    summary: (p) => `Move to trash: ${p.path}`,
  },
  {
    kind: "screenshot",
    risk: "safe",
    patterns: [/^(?:take\s+(?:a\s+)?)?screenshot$/i, /^capture\s+(?:the\s+)?screen$/i],
    summary: () => "Take a screenshot",
  },
  {
    kind: "volume",
    risk: "safe",
    patterns: [
      /^(?:turn\s+)?volume\s+(up|down)$/i,
      /^(mute|unmute)(?:\s+(?:the\s+)?(?:volume|sound|audio))?$/i,
      /^turn\s+(up|down)\s+the\s+volume$/i,
    ],
    extract: (m) => ({
      direction: /mute/i.test(m[1]) ? "mute" : m[1].toLowerCase(),
    }),
    summary: (p) => (p.direction === "mute" ? "Toggle mute" : `Volume ${p.direction}`),
  },
  {
    kind: "system_stats",
    risk: "safe",
    patterns: [
      /^(?:show\s+|check\s+|what(?:'s|\s+is)\s+(?:my\s+)?)?(cpu|ram|memory|disk|battery|system)\s*(?:usage|status|stats)?\??$/i,
    ],
    extract: (m) => ({ metric: m[1].toLowerCase() }),
    summary: (p) => `Report ${p.metric} status`,
  },
  {
    kind: "daily_note",
    risk: "safe",
    patterns: [
      /^(?:create|open|start)\s+(?:today'?s\s+)?(?:daily\s+)?not(?:es?)(?:\s+for\s+today)?$/i,
      /^today'?s\s+notes?$/i,
    ],
    summary: () => "Create/open today's daily note",
  },
  {
    kind: "add_task",
    risk: "safe",
    patterns: [
      /^(?:add|create|new)\s+(?:a\s+)?(?:task|todo)\s*(?::\s*|to\s+)?(.{1,200})$/i,
      /^remind\s+me\s+to\s+(.{1,200})\s+(?:on\s+my\s+)?(?:task|todo)\s+list$/i,
    ],
    extract: (m) => ({ title: m[1].trim() }),
    summary: (p) => `Add task “${p.title}”`,
  },
  {
    kind: "set_reminder",
    risk: "safe",
    patterns: [
      /^(?:set\s+(?:a\s+)?)?(?:remind(?:er)?)\s*(?:me)?\s*(?:to\s+)?(.+?)\s+in\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)$/i,
      /^(?:set\s+(?:a\s+)?)?timer\s+for\s+(\d+)\s*(minutes?|mins?|hours?|hrs?)$/i,
    ],
    extract: (m) => {
      if (m.length >= 4 && m[3]) {
        const minutes = /h/i.test(m[3]) ? Number(m[2]) * 60 : Number(m[2]);
        return { message: m[1].trim(), minutes: String(minutes) };
      }
      const minutes = /h/i.test(m[2]) ? Number(m[1]) * 60 : Number(m[1]);
      return { message: "Timer finished", minutes: String(minutes) };
    },
    summary: (p) => `Remind in ${p.minutes} min: ${p.message}`,
  },
  {
    kind: "run_command",
    risk: "dangerous",
    patterns: [
      /^(?:run|execute)\s+(?:powershell|cmd|shell|command)\s*(?::\s*)?(.{1,400})$/i,
    ],
    extract: (m) => ({ command: m[1].trim() }),
    summary: (p) => `Execute shell command: ${p.command}`,
  },
  {
    // Keep open_app near the end: "open <url>" and "open folder" match earlier rules.
    kind: "open_path",
    risk: "safe",
    patterns: [/^open\s+(?:folder|directory|path)\s+(.{1,240})$/i],
    extract: (m) => ({ path: m[1].trim().replace(/^["']|["']$/g, "") }),
    summary: (p) => `Open folder ${p.path}`,
  },
  {
    kind: "open_app",
    risk: "safe",
    patterns: [/^(?:open|launch|start|run)\s+(.{1,60})$/i],
    extract: (m) => ({ app: m[1].trim() }),
    summary: (p) => `Open application “${p.app}”`,
  },
];

export function parseCommand(input: string): AutomationIntent | null {
  const text = input.trim().replace(/[.!]+$/, "");
  if (!text) return null;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        const params = rule.extract ? rule.extract(match) : {};
        return {
          kind: rule.kind,
          risk: rule.risk,
          params,
          summary: rule.summary(params),
          source: "rules",
        };
      }
    }
  }
  return null;
}

export const KNOWN_INTENTS = RULES.map((r) => ({ kind: r.kind, risk: r.risk }));

/**
 * Validates an AI-produced intent JSON against the known intent set, so a
 * hallucinated action can never execute.
 */
export function validateAiIntent(raw: unknown): AutomationIntent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const rule = RULES.find((r) => r.kind === obj.kind);
  if (!rule) return null;
  const params: Record<string, string> = {};
  if (typeof obj.params === "object" && obj.params !== null) {
    for (const [k, v] of Object.entries(obj.params as Record<string, unknown>)) {
      if (typeof v === "string") params[k] = v;
    }
  }
  return {
    kind: rule.kind,
    risk: rule.risk, // risk always comes from our table, never from the model
    params,
    summary: rule.summary(params),
    source: "ai",
  };
}
