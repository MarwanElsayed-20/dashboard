import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/** Paths anyone may reach: the login page, the portfolio's ingest call and the app's own files. */
const PUBLIC = [
  /^\/login$/,
  /^\/api\/ingest$/,
  /^\/manifest\.webmanifest$/,
  /^\/sw\.js$/,
  /^\/icons\//,
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((pattern) => pattern.test(pathname))) return NextResponse.next();
  const signedIn = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );
  if (signedIn) return NextResponse.next();
  if (pathname.startsWith("/api/"))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except Next's own build files and the favicon set.
  matcher: ["/((?!_next/|icon\\.svg|apple-icon|favicon\\.ico).*)"],
};
