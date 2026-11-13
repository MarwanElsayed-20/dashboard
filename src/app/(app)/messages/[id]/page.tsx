import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicBadge } from "@/components/topic-badge";
import { requireOwner } from "@/lib/auth";
import { senderOf, summary } from "@/lib/contact";
import { fullTime } from "@/lib/format";
import { getStore } from "@/lib/store";
import { changeStatus } from "./actions";

export const metadata: Metadata = { title: "Message" };
export const dynamic = "force-dynamic";

const websiteHref = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

const actionClass =
  "inline-flex min-h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium hover:border-foreground";

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const store = getStore();
  const message = await store.getMessage(id);
  if (!message) notFound();
  // Opening a new message reads it.
  if (message.status === "new") {
    await store.setStatus(message.id, "read");
    message.status = "read";
  }

  const sender = senderOf(message);
  const subject =
    message.topic === "job"
      ? `Re: ${message.role || "the role"}${message.company ? ` at ${message.company}` : ""}`
      : "Re: your message to Marwan Elsayed";
  const reply = `mailto:${message.email}?subject=${encodeURIComponent(subject)}`;
  const rows: [string, React.ReactNode][] = [
    ...summary(message),
    [
      "Email",
      <a key="e" href={`mailto:${message.email}`} className="underline underline-offset-4">
        {message.email}
      </a>,
    ],
    ...(message.website
      ? ([
          [
            "Website",
            <a
              key="w"
              href={websiteHref(message.website)}
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4"
            >
              {message.website}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    ["Received", fullTime(message.receivedAt)],
  ];

  return (
    <article className="flex flex-col gap-8">
      <Link
        href="/"
        className="inline-flex min-h-11 w-fit items-center text-sm text-muted hover:text-foreground"
      >
        ← Inbox
      </Link>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TopicBadge topic={message.topic} />
          {message.status === "archived" ? (
            <span className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
              Archived
            </span>
          ) : null}
        </div>
        <h1 className="text-4xl leading-[1.05] font-light tracking-tight break-words sm:text-5xl">
          {sender}
        </h1>
      </header>

      <dl className="border-t border-foreground">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 border-b border-border py-3"
          >
            <dt className="pt-0.5 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
              {label}
            </dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Message" className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Message</h2>
        <p className="border-l-2 border-foreground bg-surface px-5 py-4 text-lg leading-relaxed break-words whitespace-pre-wrap">
          {message.message}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <a
          href={reply}
          className="inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-sm font-semibold tracking-wide text-surface uppercase"
        >
          Reply by email
        </a>
        <form action={changeStatus} className="contents">
          <input type="hidden" name="id" value={message.id} />
          {message.status === "archived" ? (
            <button name="change" value="restore" className={actionClass}>
              Move to inbox
            </button>
          ) : (
            <>
              <button name="change" value="unread" className={actionClass}>
                Mark unread
              </button>
              <button name="change" value="archive" className={actionClass}>
                Archive
              </button>
            </>
          )}
        </form>
      </div>
    </article>
  );
}
