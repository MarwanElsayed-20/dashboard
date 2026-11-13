import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/auth";
import { notifyAll } from "@/lib/push";
import { getStore, type PushSubscriptionRecord } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorised = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

function asSubscription(raw: unknown): PushSubscriptionRecord | null {
  const value = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (
    typeof value?.endpoint !== "string" ||
    !value.endpoint.startsWith("https://") ||
    typeof value.keys?.p256dh !== "string" ||
    typeof value.keys?.auth !== "string"
  )
    return null;
  return { endpoint: value.endpoint, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}

/** Saves this device's push subscription. */
export async function POST(request: Request) {
  if (!(await isSignedIn())) return unauthorised();
  const subscription = asSubscription(await request.json().catch(() => null));
  if (!subscription) return NextResponse.json({ error: "bad-subscription" }, { status: 400 });
  await getStore().saveSubscription(subscription, request.headers.get("user-agent") ?? "");
  return NextResponse.json({ ok: true });
}

/** Forgets this device's push subscription. */
export async function DELETE(request: Request) {
  if (!(await isSignedIn())) return unauthorised();
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint === "string") await getStore().removeSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}

/** Sends a test notification to every saved device. */
export async function PUT() {
  if (!(await isSignedIn())) return unauthorised();
  const notified = await notifyAll(getStore(), {
    title: "Notifications are on",
    body: "New messages from your portfolio will appear here.",
    url: "/",
    tag: "test",
  });
  return NextResponse.json({ ok: true, notified });
}
