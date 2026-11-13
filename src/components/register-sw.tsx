"use client";

import { useEffect } from "react";

/** Registers the service worker once per load, so pushes can arrive while the app is closed. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Without a worker the dashboard still works; only notifications are unavailable.
    });
  }, []);
  return null;
}
