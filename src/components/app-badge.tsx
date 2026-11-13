"use client";

import { useEffect } from "react";

type BadgingNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Keeps the number on the Home Screen icon equal to the unread messages whenever the app is open.
 * The service worker sets it when a push arrives. iPhone shows it once notifications are allowed.
 */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as BadgingNavigator;
    const done = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
    done?.catch(() => {
      // Badges are a nicety; a browser that refuses them changes nothing else.
    });
  }, [count]);
  return null;
}
