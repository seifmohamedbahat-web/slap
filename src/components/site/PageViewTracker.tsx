"use client";

import { useEffect } from "react";

/** Counts one page view per browser session for the admin dashboard. */
export default function PageViewTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("orbit_pv")) return;
      sessionStorage.setItem("orbit_pv", "1");
    } catch {
      // storage unavailable (private mode) — still count the view
    }
    fetch("/api/pageview", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
