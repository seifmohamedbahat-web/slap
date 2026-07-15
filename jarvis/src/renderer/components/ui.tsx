/**
 * Shared UI primitives for the glassmorphism design system: cards, page
 * headers, buttons, empty/loading/error states, toasts, modals.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./Icon";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function GlassCard({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={cx("glass rounded-2xl", hover && "glass-hover", className)}>{children}</div>
  );
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-500/12 text-neon-400 shadow-glow-sm">
            <Icon name={icon} size={22} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-primary">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  icon,
  disabled,
  type = "button",
  className,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  icon?: IconName;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const cls =
    variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : "btn-ghost";
  return (
    <button type={type} className={cx(cls, className)} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  onClick,
  label,
  danger,
}: {
  icon: IconName;
  onClick?: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cx(
        "flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors",
        danger ? "hover:bg-status-critical/15 hover:text-status-critical" : "hover:bg-neon-500/12 hover:text-neon-400",
      )}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-500/10 text-neon-400">
        <Icon name={icon} size={26} />
      </div>
      <div>
        <p className="font-medium text-ink-primary">{title}</p>
        {hint && <p className="mt-1 max-w-sm text-sm text-ink-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <GlassCard className="flex items-center gap-4 border-status-critical/30 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-critical/15 text-status-critical">
        <Icon name="warning" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-ink-primary">Something went wrong</p>
        <p className="text-sm text-ink-secondary">{message}</p>
      </div>
      {onRetry && <Button icon="refresh" onClick={onRetry}>Retry</Button>}
    </GlassCard>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warning" | "critical" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/6 text-ink-secondary",
    good: "bg-status-good/15 text-status-good",
    warning: "bg-status-warning/15 text-status-warning",
    critical: "bg-status-critical/15 text-status-critical",
    accent: "bg-neon-500/15 text-neon-300",
  };
  return (
    <span className={cx("rounded-md px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
}

interface ToastContextValue {
  push: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ push: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "glass pointer-events-auto animate-slide-up rounded-xl px-4 py-3 text-sm",
              t.tone === "success" && "border-status-good/40 text-ink-primary",
              t.tone === "error" && "border-status-critical/40 text-ink-primary",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <GlassCard className="w-full max-w-lg animate-slide-up p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </GlassCard>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-6 w-11 rounded-full transition-colors duration-200",
        checked ? "bg-neon-500" : "bg-white/12",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
