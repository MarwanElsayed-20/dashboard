"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, SESSION_SECONDS, createSession } from "@/lib/session";

export type LoginState = { error: string | null };

/** Failed attempts per address in this server instance: 5 per 15 minutes, then a pause. */
const attempts = new Map<string, { count: number; since: number }>();
const WINDOW = 15 * 60 * 1000;
const LIMIT = 5;

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
  const caller = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const record = attempts.get(caller);
  if (record && now - record.since < WINDOW && record.count >= LIMIT)
    return { error: "Too many attempts. Try again in a few minutes." };

  const secret = process.env.SESSION_SECRET;
  const password = typeof form.get("password") === "string" ? String(form.get("password")) : "";
  if (!secret || !process.env.OWNER_PASSWORD_HASH)
    return {
      error: "The dashboard is not set up yet: SESSION_SECRET or OWNER_PASSWORD_HASH is missing.",
    };

  if (!(await verifyPassword(password, process.env.OWNER_PASSWORD_HASH))) {
    const fresh = !record || now - record.since >= WINDOW;
    attempts.set(caller, {
      count: fresh ? 1 : record.count + 1,
      since: fresh ? now : record.since,
    });
    return { error: "That password is not right." };
  }
  attempts.delete(caller);
  (await cookies()).set(SESSION_COOKIE, await createSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/");
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
