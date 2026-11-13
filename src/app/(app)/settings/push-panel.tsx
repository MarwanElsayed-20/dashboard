"use client";

import { useEffect, useState } from "react";

type State =
  "checking" | "unsupported" | "install-first" | "not-configured" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const buttonClass =
  "inline-flex min-h-12 items-center rounded-full px-6 text-sm font-semibold tracking-wide uppercase disabled:opacity-60";

/**
 * Turns phone notifications on and off for this device. On iPhone, Safari only allows web push
 * for an app added to the Home Screen, so until then it shows how to add it.
 */
export function PushPanel({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const set = (next: State) => !cancelled && setState(next);
      if (isIos() && !isStandalone()) return set("install-first");
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        return set("unsupported");
      if (!publicKey) return set("not-configured");
      if (Notification.permission === "denied") return set("denied");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      set(existing && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => !cancelled && setState("unsupported"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const response = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error(String(response.status));
      setState("on");
      setNote("Notifications are on for this device.");
    } catch {
      setNote("Notifications could not be turned on. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("off");
      setNote("Notifications are off for this device.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/push", { method: "PUT" });
      const body: { notified?: number } = await response.json().catch(() => ({}));
      setNote(
        body.notified
          ? `Test sent to ${body.notified} device${body.notified === 1 ? "" : "s"}.`
          : "No device accepted the test. Turn notifications off and on again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5" data-push-state={state}>
      {state === "checking" ? <p className="text-muted">Checking this device…</p> : null}
      {state === "install-first" ? (
        <div className="flex flex-col gap-3">
          <p>On iPhone, notifications work once the dashboard is on your Home Screen:</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-muted">
            <li>Open this page in Safari.</li>
            <li>Tap the Share button, then “Add to Home Screen”.</li>
            <li>Open Dashboard from the Home Screen, come back here and turn notifications on.</li>
          </ol>
        </div>
      ) : null}
      {state === "unsupported" ? (
        <p className="text-muted">This browser does not support notifications.</p>
      ) : null}
      {state === "not-configured" ? (
        <p className="text-muted">
          Notifications are not set up on the server yet: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing.
        </p>
      ) : null}
      {state === "denied" ? (
        <p className="text-muted">
          Notifications are blocked for this app. On iPhone: Settings → Notifications → Dashboard →
          Allow Notifications.
        </p>
      ) : null}
      {state === "off" ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className={`${buttonClass} bg-foreground text-surface`}
          >
            {busy ? "Turning on…" : "Turn on notifications"}
          </button>
        </div>
      ) : null}
      {state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#2f8f4e]" />
            On for this device
          </span>
          <button
            type="button"
            onClick={test}
            disabled={busy}
            className={`${buttonClass} bg-foreground text-surface`}
          >
            Send a test
          </button>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className={`${buttonClass} border border-border-strong`}
          >
            Turn off
          </button>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="text-sm text-muted">
        {note}
      </p>
    </div>
  );
}
