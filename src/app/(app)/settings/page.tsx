import type { Metadata } from "next";
import { signOut } from "@/app/login/actions";
import { requireOwner } from "@/lib/auth";
import { PushPanel } from "./push-panel";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const sectionClass = "flex flex-col gap-5 border-t border-foreground pt-6";
const headingClass = "text-xs font-semibold tracking-[0.12em] text-muted uppercase";

export default async function SettingsPage() {
  await requireOwner();
  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-4xl leading-none font-light tracking-tight sm:text-5xl">Settings</h1>

      <section aria-labelledby="push-heading" className={sectionClass}>
        <h2 id="push-heading" className={headingClass}>
          Notifications
        </h2>
        <p className="max-w-prose text-muted">
          Get a notification on this device when someone writes through your portfolio.
        </p>
        <PushPanel publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null} />
      </section>

      <section aria-labelledby="account-heading" className={sectionClass}>
        <h2 id="account-heading" className={headingClass}>
          Account
        </h2>
        <form action={signOut}>
          <button className="inline-flex min-h-12 items-center rounded-full border border-border-strong px-6 text-sm font-semibold tracking-wide uppercase hover:border-foreground">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
