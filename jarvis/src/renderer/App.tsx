import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { api } from "./lib/api";
import { useAsync } from "./lib/hooks";
import { NAV, NAV_GROUPS, type RouteId } from "./lib/nav";
import { Icon } from "./components/Icon";
import { VoiceOrb } from "./components/VoiceOrb";
import { CommandPalette } from "./components/CommandPalette";
import { LockScreen } from "./components/LockScreen";
import { ToastProvider, cx, useToast } from "./components/ui";
import { Onboarding } from "./pages/Onboarding";
import { DashboardPage } from "./pages/DashboardPage";
import { ChatPage } from "./pages/ChatPage";
import { VoicePage } from "./pages/VoicePage";
import { AutomationPage } from "./pages/AutomationPage";
import { ComputerPage } from "./pages/ComputerPage";
import { BrowserPage } from "./pages/BrowserPage";
import { FilesPage } from "./pages/FilesPage";
import { NotesPage } from "./pages/NotesPage";
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { MemoryPage } from "./pages/MemoryPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { MonitorPage } from "./pages/MonitorPage";
import { PluginsPage } from "./pages/PluginsPage";
import { KeysPage } from "./pages/KeysPage";
import { LogsPage } from "./pages/LogsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";

const PAGES: Record<RouteId, () => ReactElement> = {
  dashboard: DashboardPage,
  chat: ChatPage,
  voice: VoicePage,
  automation: AutomationPage,
  computer: ComputerPage,
  browser: BrowserPage,
  files: FilesPage,
  notes: NotesPage,
  tasks: TasksPage,
  calendar: CalendarPage,
  memory: MemoryPage,
  projects: ProjectsPage,
  monitor: MonitorPage,
  plugins: PluginsPage,
  keys: KeysPage,
  logs: LogsPage,
  settings: SettingsPage,
  profile: ProfilePage,
};

type NavContextValue = { navigate: (route: RouteId) => void };

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

function AppInner() {
  const profile = useAsync(() => api.invoke("profile:get", undefined), []);
  const [unlocked, setUnlocked] = useState(false);

  if (profile.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VoiceOrb state="thinking" size={160} />
      </div>
    );
  }

  if (!profile.data?.onboarded) {
    return <Onboarding onDone={() => profile.reload()} />;
  }

  if (profile.data.hasPin && !unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  return <Shell userName={profile.data.name} />;
}

// Simple global navigation via a hash-free in-memory route. Also exposes a
// window helper so any page can deep-link (e.g. dashboard quick actions).
declare global {
  interface Window {
    __jarvisNav?: (route: RouteId) => void;
  }
}

function Shell({ userName }: { userName: string }) {
  const [route, setRoute] = useState<RouteId>("dashboard");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { push } = useToast();

  const navigate = useCallback((next: RouteId) => setRoute(next), []);
  useEffect(() => {
    window.__jarvisNav = navigate;
    return () => {
      delete window.__jarvisNav;
    };
  }, [navigate]);

  const runCommand = useCallback(
    async (input: string) => {
      try {
        const result = await api.invoke("automation:run", { input });
        if (result.cancelled) push("Command cancelled", "info");
        else if (result.ok) push(result.output || "Done", "success");
        else push(result.output || "Command failed", "error");
      } catch (err) {
        push(err instanceof Error ? err.message : String(err), "error");
      }
    },
    [push],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const off = api.on("reminder:fired", (reminder) => {
      push(`⏰ Reminder: ${reminder.message}`, "info");
    });
    return off;
  }, [push]);

  const Page = PAGES[route];
  const grouped = useMemo(
    () => NAV_GROUPS.map((group) => ({ group, items: NAV.filter((n) => n.group === group) })),
    [],
  );

  return (
    <div className="flex h-full w-full">
      <Sidebar route={route} navigate={navigate} userName={userName} grouped={grouped} onOpenPalette={() => setPaletteOpen(true)} />
      <main className="flex-1 overflow-hidden">
        <div key={route} className="h-full scroll-area animate-fade-in px-8 py-7">
          <ErrorBoundary route={route}>
            <Page />
          </ErrorBoundary>
        </div>
      </main>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={navigate}
        onRunCommand={runCommand}
      />
    </div>
  );
}

function Sidebar({
  route,
  navigate,
  userName,
  grouped,
  onOpenPalette,
}: {
  route: RouteId;
  navigate: (r: RouteId) => void;
  userName: string;
  grouped: { group: string; items: typeof NAV }[];
  onOpenPalette: () => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/6 bg-abyss-900/40 backdrop-blur-glass">
      <div className="drag flex items-center gap-3 px-5 pb-4 pt-6">
        <div className="relative">
          <VoiceOrb state="idle" size={40} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-glow">JARVIS</p>
          <p className="text-xs text-ink-muted">AI Operating System</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenPalette}
        className="no-drag mx-4 mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-abyss-900/60 px-3 py-2 text-sm text-ink-muted transition-colors hover:border-neon-400/30 hover:text-ink-secondary"
      >
        <Icon name="search" size={16} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="chip">⌘K</kbd>
      </button>

      <nav className="flex-1 scroll-area px-3 pb-4">
        {grouped.map(({ group, items }) => (
          <div key={group} className="mb-3">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-muted/70">
              {group}
            </p>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="nav-item w-full no-drag"
                data-active={route === item.id}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => navigate("profile")}
        className="no-drag flex items-center gap-3 border-t border-white/6 px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-500/15 text-neon-300">
          <Icon name="profile" size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-primary">{userName || "Operator"}</p>
          <p className="text-xs text-ink-muted">View profile</p>
        </div>
      </button>
    </aside>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode; route: string },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  componentDidUpdate(prev: { route: string }) {
    if (prev.route !== this.props.route && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className={cx("pt-10")}>
          <p className="text-center text-sm text-status-critical">
            This page hit an error: {this.state.error}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export type { NavContextValue };
