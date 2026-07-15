import type { IconName } from "../components/Icon";

export type RouteId =
  | "dashboard"
  | "chat"
  | "voice"
  | "automation"
  | "computer"
  | "browser"
  | "files"
  | "notes"
  | "calendar"
  | "tasks"
  | "memory"
  | "projects"
  | "monitor"
  | "plugins"
  | "keys"
  | "logs"
  | "settings"
  | "profile";

export interface NavItem {
  id: RouteId;
  label: string;
  icon: IconName;
  group: string;
  keywords: string[];
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", group: "Home", keywords: ["home", "overview"] },
  { id: "chat", label: "AI Chat", icon: "chat", group: "AI", keywords: ["chat", "ai", "gpt", "assistant"] },
  { id: "voice", label: "Voice Assistant", icon: "voice", group: "AI", keywords: ["voice", "speak", "mic"] },
  { id: "memory", label: "Memory", icon: "memory", group: "AI", keywords: ["memory", "remember", "context"] },
  { id: "automation", label: "Automation", icon: "automation", group: "Automation", keywords: ["automation", "command", "run"] },
  { id: "computer", label: "Computer Control", icon: "computer", group: "Automation", keywords: ["computer", "apps", "power"] },
  { id: "browser", label: "Browser Control", icon: "browser", group: "Automation", keywords: ["browser", "web", "search"] },
  { id: "files", label: "File Manager", icon: "files", group: "Automation", keywords: ["files", "folder", "downloads"] },
  { id: "monitor", label: "System Monitor", icon: "monitor", group: "Automation", keywords: ["system", "cpu", "ram", "processes"] },
  { id: "notes", label: "Notes", icon: "notes", group: "Productivity", keywords: ["notes", "journal", "meeting"] },
  { id: "tasks", label: "Tasks", icon: "tasks", group: "Productivity", keywords: ["tasks", "todo", "reminders"] },
  { id: "calendar", label: "Calendar", icon: "calendar", group: "Productivity", keywords: ["calendar", "events", "schedule"] },
  { id: "projects", label: "Projects", icon: "projects", group: "Productivity", keywords: ["projects", "work"] },
  { id: "plugins", label: "Plugins", icon: "plugins", group: "System", keywords: ["plugins", "extensions"] },
  { id: "keys", label: "API Keys", icon: "keys", group: "System", keywords: ["api", "keys", "providers", "openai", "gemini", "claude"] },
  { id: "logs", label: "Activity Logs", icon: "logs", group: "System", keywords: ["logs", "activity", "history"] },
  { id: "settings", label: "Settings", icon: "settings", group: "System", keywords: ["settings", "preferences", "config"] },
  { id: "profile", label: "Profile", icon: "profile", group: "System", keywords: ["profile", "account", "pin"] },
];

export const NAV_GROUPS = ["Home", "AI", "Automation", "Productivity", "System"] as const;
