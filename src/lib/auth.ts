import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";

/** Whether this request carries a valid owner session. */
export async function isSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
}

/**
 * Every page, action and route that reads or changes data calls this, even though the proxy has
 * already checked: the proxy is a first gate, not the only one.
 */
export async function requireOwner(): Promise<void> {
  if (!(await isSignedIn())) redirect("/login");
}
