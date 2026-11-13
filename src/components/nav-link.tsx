"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** A top-bar section link that marks itself current. `match` lists the path prefixes it owns. */
export function NavLink({
  href,
  match,
  children,
}: {
  href: string;
  match?: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const prefixes = match ?? [href];
  const current = prefixes.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-surface"
    >
      {children}
    </Link>
  );
}
