import type { Metadata } from "next";
import Link from "next/link";
import { TopicBadge } from "@/components/topic-badge";
import { requireOwner } from "@/lib/auth";
import { senderOf, summary } from "@/lib/contact";
import { relativeTime } from "@/lib/format";
import { getStore, type MessageView } from "@/lib/store";

export const metadata: Metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

const VIEWS: { value: MessageView; label: string }[] = [
  { value: "new", label: "New" },
  { value: "all", label: "All" },
  { value: "archived", label: "Archived" },
];

const EMPTY: Record<MessageView, string> = {
  new: "No new messages. You are all caught up.",
  all: "No messages yet. They will appear here as soon as someone writes through the portfolio.",
  archived: "Nothing archived.",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireOwner();
  const requested = (await searchParams).view;
  const view: MessageView = VIEWS.some((v) => v.value === requested)
    ? (requested as MessageView)
    : "all";
  const store = getStore();
  const [messages, counts] = await Promise.all([store.listMessages(view), store.counts()]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Portfolio</p>
        <h1 className="text-4xl leading-none font-light tracking-tight sm:text-5xl">Inbox</h1>
      </div>

      <nav aria-label="Filter messages" className="flex flex-wrap gap-2">
        {VIEWS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "all" ? "/" : `/?view=${value}`}
            aria-current={view === value ? "page" : undefined}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-medium aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-surface"
          >
            {label}
            <span className="tabular-nums opacity-70">{counts[value]}</span>
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <p className="border-t border-border py-10 text-muted">{EMPTY[view]}</p>
      ) : (
        <ul className="border-t border-foreground">
          {messages.map((message) => {
            const isNew = message.status === "new";
            const details = summary(message)
              .map(([, value]) => value)
              .join(" · ");
            return (
              <li key={message.id} className="border-b border-border">
                <Link
                  href={`/messages/${message.id}`}
                  className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-5 transition-colors hover:bg-surface/60"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-2 h-2 w-2 rounded-full ${isNew ? "bg-foreground" : "bg-transparent"}`}
                  />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span
                        className={`truncate text-lg ${isNew ? "font-semibold" : "font-normal"}`}
                      >
                        {senderOf(message)}
                      </span>
                      <TopicBadge topic={message.topic} />
                      {isNew ? <span className="sr-only">(new)</span> : null}
                    </span>
                    {details ? <span className="text-sm text-muted">{details}</span> : null}
                    <span className="line-clamp-2 text-sm text-muted">{message.message}</span>
                  </span>
                  <time
                    dateTime={message.receivedAt.toISOString()}
                    className="pt-1 text-xs whitespace-nowrap text-muted tabular-nums"
                  >
                    {relativeTime(message.receivedAt)}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
