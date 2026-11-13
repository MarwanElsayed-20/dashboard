import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { notificationFor, parseIncoming } from "@/lib/contact";
import { notifyAll } from "@/lib/push";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 20_000;

function authorised(header: string | null): boolean {
  const secret = process.env.INGEST_SECRET?.trim();
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The portfolio's contact route posts each message here after validating it. The message is
 * stored first, then every saved device is notified; a push failure never loses the message.
 */
export async function POST(request: Request) {
  if (!authorised(request.headers.get("authorization")))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.text();
  if (body.length > MAX_BODY_CHARS)
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const parsed = parseIncoming(raw);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 422 });

  const store = getStore();
  const stored = await store.addMessage(parsed.value);
  const notified = await notifyAll(store, {
    ...notificationFor(parsed.value),
    url: `/messages/${stored.id}`,
    tag: stored.id,
  });
  return NextResponse.json({ ok: true, id: stored.id, notified }, { status: 201 });
}
