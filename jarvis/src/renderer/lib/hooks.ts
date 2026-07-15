import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { SystemStats } from "@shared/types";

/** Runs an async loader, tracking loading/error state, with a manual reload. */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const [nonce, setNonce] = useState(0);
  useEffect(run, [run, nonce]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}

/** Subscribes to the live system-stats tick, retaining a rolling history. */
export function useSystemStats(historyLength = 40): {
  latest: SystemStats | null;
  history: SystemStats[];
} {
  const [latest, setLatest] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<SystemStats[]>([]);

  useEffect(() => {
    let mounted = true;
    void api.invoke("system:stats", undefined).then((s) => {
      if (mounted) {
        setLatest(s);
        setHistory([s]);
      }
    });
    const off = api.on("system:stats:tick", (stats) => {
      setLatest(stats);
      setHistory((prev) => [...prev, stats].slice(-historyLength));
    });
    return () => {
      mounted = false;
      off();
    };
  }, [historyLength]);

  return { latest, history };
}

/** Persists a value to localStorage (UI-only preferences). */
export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* quota — ignore */
      }
    },
    [key],
  );
  return [value, set];
}

/** Live wall clock updated every second. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
