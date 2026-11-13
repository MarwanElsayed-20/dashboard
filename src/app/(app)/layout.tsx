import Link from "next/link";
import type { ReactNode } from "react";
import { requireOwner } from "@/lib/auth";
import { Mark } from "@/lib/mark";
import { NavLink } from "@/components/nav-link";
import { AppBadge } from "@/components/app-badge";
import { getStore } from "@/lib/store";

/**
 * The signed-in shell: the mark and the sections along the top. Built to take more sections later
 * (each a NavLink and a route in this group). Safe-area padding keeps it clear of the iPhone notch
 * and Home indicator when installed.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  const unread = (await getStore().counts()).new;
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8">
      <header className="flex items-center justify-between gap-4 border-b border-foreground pb-4">
        <Link href="/" aria-label="Dashboard home" className="rounded-md">
          <Mark size={36} />
        </Link>
        <nav aria-label="Sections" className="flex items-center gap-1">
          <NavLink href="/" match={["/", "/messages"]}>
            Inbox
          </NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="flex flex-1 flex-col pt-8">{children}</main>
      <AppBadge count={unread} />
    </div>
  );
}
