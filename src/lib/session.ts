/**
 * The owner's session: a signed cookie holding only an expiry time. There is one user, so there is
 * nothing else to store. Web Crypto (HMAC-SHA-256) keeps it usable in the proxy and in routes.
 */

export const SESSION_COOKIE = "dash_session";
/** Thirty days: long enough that the phone app rarely asks again. */
export const SESSION_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

/** Compares two strings in time that does not depend on where they differ. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession(secret: string, now = Date.now()): Promise<string> {
  const payload = `v1.${Math.floor(now / 1000) + SESSION_SECONDS}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isInteger(expires) || expires * 1000 <= now) return false;
  return equal(parts[2], await sign(`${parts[0]}.${parts[1]}`, secret));
}
