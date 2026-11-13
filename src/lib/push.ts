import webpush from "web-push";
import type { Store } from "./store";

export type PushPayload = { title: string; body: string; url: string; tag?: string };

function configured(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/**
 * Sends one notification to every saved device. A device whose subscription has expired or been
 * revoked (404/410) is removed. Returns how many devices accepted it; never throws, so a push
 * failure can never lose an incoming message.
 */
export async function notifyAll(store: Store, payload: PushPayload): Promise<number> {
  if (!configured()) return 0;
  const subscriptions = await store.listSubscriptions().catch(() => []);
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload), {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
        return true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await store.removeSubscription(subscription.endpoint).catch(() => {});
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
