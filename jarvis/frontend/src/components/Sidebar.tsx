interface QuickAction {
  label: string;
  prompt?: string;
  phase?: number; // set = not available yet
}

const ACTIONS: QuickAction[] = [
  {
    label: "What's in Downloads?",
    prompt: "List what's in my Downloads folder and group it by file type.",
  },
  {
    label: "Find large files",
    prompt:
      "Find my 15 largest files (over 100 MB) and tell me what they are.",
  },
  {
    label: "Recent documents",
    prompt:
      "Find documents (pdf, docx, xlsx) modified in the last 7 days and list them newest first.",
  },
  {
    label: "Summarize a document",
    prompt:
      "I want you to summarize a document. First ask me which file, or search for it if I describe it.",
  },
  { label: "Clean up Downloads", phase: 3 },
  { label: "Screenshot & explain", phase: 3 },
  { label: "Run routine", phase: 5 },
];

export default function Sidebar({
  onAction,
  busy,
}: {
  onAction: (prompt: string) => void;
  busy: boolean;
}) {
  return (
    <aside className="w-52 shrink-0 border-r border-hud-line p-3 flex flex-col gap-2 overflow-y-auto">
      <h2 className="text-[10px] uppercase tracking-[0.2em] text-hud-dim mb-1">
        Quick actions
      </h2>
      {ACTIONS.map((action) => {
        const locked = action.phase !== undefined;
        return (
          <button
            key={action.label}
            disabled={locked || busy}
            onClick={() => action.prompt && onAction(action.prompt)}
            title={locked ? `Arrives in Phase ${action.phase}` : action.prompt}
            className={
              "text-left text-sm rounded-lg border px-3 py-2 transition-colors " +
              (locked
                ? "border-hud-line/50 text-hud-dim/50 cursor-not-allowed"
                : "border-hud-line text-hud-text hover:border-hud-accent hover:bg-hud-accent-soft disabled:opacity-50")
            }
          >
            {action.label}
            {locked && (
              <span className="block text-[10px] text-hud-dim/70">
                Phase {action.phase}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}
