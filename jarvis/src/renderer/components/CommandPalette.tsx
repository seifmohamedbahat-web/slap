/**
 * A ⌘K / Ctrl+K command palette for fast navigation and running automation
 * commands. Selecting a "run" result dispatches to the automation engine.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV, type RouteId } from "../lib/nav";
import { Icon } from "./Icon";
import { cx } from "./ui";

interface PaletteResult {
  id: string;
  label: string;
  hint: string;
  action: () => void;
}

export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onRunCommand,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
  onRunCommand: (input: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo<PaletteResult[]>(() => {
    const q = query.trim().toLowerCase();
    const nav = NAV.filter(
      (n) => !q || n.label.toLowerCase().includes(q) || n.keywords.some((k) => k.includes(q)),
    ).map((n) => ({
      id: `nav:${n.id}`,
      label: n.label,
      hint: `Go to ${n.group}`,
      action: () => {
        onNavigate(n.id);
        onClose();
      },
    }));
    const runnable: PaletteResult[] =
      q.length > 1
        ? [
            {
              id: "run",
              label: `Run: “${query.trim()}”`,
              hint: "Execute as automation command",
              action: () => {
                onRunCommand(query.trim());
                onClose();
              },
            },
          ]
        : [];
    return [...runnable, ...nav].slice(0, 8);
  }, [query, onNavigate, onRunCommand, onClose]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, results.length - 1)));
  }, [results.length]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[14vh] backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass w-full max-w-xl animate-slide-up overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-white/8 px-4">
          <Icon name="search" size={18} className="text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                results[active]?.action();
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Search or type a command…"
            className="w-full bg-transparent py-4 text-sm text-ink-primary outline-none placeholder:text-ink-muted"
            aria-label="Command palette"
          />
          <kbd className="chip text-ink-muted">esc</kbd>
        </div>
        <div className="max-h-80 scroll-area p-2">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={r.action}
              className={cx(
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
                i === active ? "bg-neon-500/14" : "hover:bg-white/5",
              )}
            >
              <span className="text-sm text-ink-primary">{r.label}</span>
              <span className="text-xs text-ink-muted">{r.hint}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-ink-muted">No matches</p>
          )}
        </div>
      </div>
    </div>
  );
}
