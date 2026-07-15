/**
 * A small, dependency-free inline SVG icon set (stroke-based, currentColor).
 * Keeping icons local avoids a font/CDN dependency and keeps the strict CSP
 * satisfied.
 */
import type { SVGProps } from "react";

export type IconName =
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
  | "plugins"
  | "keys"
  | "settings"
  | "logs"
  | "profile"
  | "monitor"
  | "search"
  | "send"
  | "mic"
  | "plus"
  | "trash"
  | "check"
  | "close"
  | "cpu"
  | "ram"
  | "disk"
  | "battery"
  | "network"
  | "bolt"
  | "shield"
  | "sparkles"
  | "play"
  | "stop"
  | "pin"
  | "refresh"
  | "chevron"
  | "warning"
  | "folder";

const PATHS: Record<IconName, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  chat: "M4 5h16v10H8l-4 4V5Z",
  voice: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  automation: "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2m10-10 2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  computer: "M3 5h18v11H3V5Zm5 15h8m-4-4v4",
  browser: "M3 5h18v14H3V5Zm0 4h18M8 5v4",
  files: "M4 5h5l2 2h9v11H4V5Z",
  notes: "M6 3h9l3 3v15H6V3Zm3 7h6M9 14h6",
  calendar: "M4 6h16v14H4V6Zm0 4h16M8 3v4m8-4v4",
  tasks: "M4 6h16M4 12h16M4 18h16M9 6l-3 0m3 6-3 0m3 6-3 0",
  memory: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  projects: "M3 7h6l2-2h10v14H3V7Z",
  plugins: "M10 3v4H7v4H3v6h6v-4h4v4h6v-6h-4V7h-3V3h-2Z",
  keys: "M14 7a4 4 0 1 0-3.5 6L7 16.5V19h2.5l.5-2h2l1-2 2.5-.5A4 4 0 0 0 14 7Z",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3-2 .5.5 2-1.7 1.7-2-.8-1 1.8-2.4-.3-.7 1.9H8.9l-.7-1.9-2.4.3-1-1.8-2 .8L1.1 15l.5-2L-.5 12l2-.5-.5-2 1.7-1.7 2 .8 1-1.8 2.4.3.7-1.9h2.6l.7 1.9 2.4-.3 1 1.8 2-.8L21.5 10l-.5 2 2 .5Z",
  logs: "M4 4h16v16H4V4Zm3 4h10M7 12h10M7 16h6",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  monitor: "M3 4h18v12H3V4Zm5 16h8M6 12l3-4 3 3 3-5 3 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm6 12 4 4",
  send: "M4 12 20 4l-6 16-2.5-6.5L4 12Z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  plus: "M12 5v14M5 12h14",
  trash: "M5 7h14M9 7V4h6v3m-7 0v13h8V7",
  check: "M4 12l5 5L20 6",
  close: "M6 6l12 12M18 6 6 18",
  cpu: "M8 8h8v8H8V8ZM4 9V6h3M20 9V6h-3M4 15v3h3m13-3v3h-3M9 4v3m6-3v3M9 17v3m6-3v3",
  ram: "M3 8h18v8H3V8Zm4 8v2m4-2v2m4-2v2M7 11v2m4-2v2m4-2v2",
  disk: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  battery: "M3 8h15v8H3V8Zm18 2v4M6 11v2",
  network: "M12 3a9 9 0 0 0-9 9m9-9a9 9 0 0 1 9 9m-9-9v18M3 12h18M4.5 7.5a12 12 0 0 0 15 0M4.5 16.5a12 12 0 0 1 15 0",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z",
  sparkles: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3ZM5 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z",
  play: "M7 5v14l11-7L7 5Z",
  stop: "M6 6h12v12H6z",
  pin: "M12 3l2 5 5 .5-4 3.5 1.5 5L12 14l-4.5 3 1.5-5-4-3.5 5-.5 2-5Z",
  refresh: "M4 12a8 8 0 0 1 14-5m2-3v4h-4M20 12a8 8 0 0 1-14 5m-2 3v-4h4",
  chevron: "M9 6l6 6-6 6",
  warning: "M12 4 2 20h20L12 4Zm0 6v5m0 3v.5",
  folder: "M4 6h5l2 2h9v10H4V6Z",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
