import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { SESSION_SECONDS, createSession, verifySession } from "./session";

describe("sessions", () => {
  const secret = "s".repeat(43);

  it("accepts its own token until it expires", async () => {
    const now = Date.UTC(2026, 10, 13);
    const token = await createSession(secret, now);
    expect(await verifySession(token, secret, now + 1000)).toBe(true);
    expect(await verifySession(token, secret, now + SESSION_SECONDS * 1000 + 1)).toBe(false);
  });

  it("refuses tampered, foreign and missing tokens", async () => {
    const token = await createSession(secret);
    const [v, expires, signature] = token.split(".");
    expect(await verifySession(`${v}.${Number(expires) + 9999}.${signature}`, secret)).toBe(false);
    expect(await verifySession(token, "another-secret")).toBe(false);
    expect(await verifySession(undefined, secret)).toBe(false);
    expect(await verifySession(token, undefined)).toBe(false);
    expect(await verifySession("garbage", secret)).toBe(false);
  });
});

describe("passwords", () => {
  it("verifies the right password and refuses others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("wrong horse battery", stored)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
});
