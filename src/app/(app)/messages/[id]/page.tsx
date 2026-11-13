import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { TopicBadge } from "@/components/topic-badge";
import { requireOwner } from "@/lib/auth";
import { LEAD_STAGES, NOTE_LIMIT, senderOf, summary, whatsappNumber } from "@/lib/contact";
import { fullTime } from "@/lib/format";
import { getStore } from "@/lib/store";
import { addNote, changeStage, changeStatus, deleteNote } from "./actions";

export const metadata: Metadata = { title: "Message" };
export const dynamic = "force-dynamic";

const websiteHref = (raw: string) => (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);

const actionClass =
  "inline-flex min-h-11 items-center rounded-full border border-border-strong px-5 text-sm font-medium hover:border-foreground";
const primaryClass =
  "inline-flex min-h-12 items-center rounded-full bg-foreground px-6 text-sm font-semibold tracking-wide text-surface uppercase";
const headingClass = "text-xs font-semibold tracking-[0.12em] text-muted uppercase";

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
  const notes = await store.listNotes(message.id);

  const sender = senderOf(message);
  const subject =
    message.topic === "job"
      ? `Re: ${message.role || "the role"}${message.company ? ` at ${message.company}` : ""}`
      : "Re: your message to Marwan Elsayed";
  const reply = `mailto:${message.email}?subject=${encodeURIComponent(subject)}`;
  const link = (href: string, text: string, external = false) => (
    <a
      href={href}
      className="underline underline-offset-4"
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
    >
      {text}
    </a>
  );
  const rows: [string, ReactNode][] = [
    ...summary(message),
    ["Email", link(`mailto:${message.email}`, message.email)],
    ...(message.phone
      ? ([["Phone", link(`tel:${message.phone.replace(/[^\d+]/g, "")}`, message.phone)]] as [
          string,
          ReactNode,
        ][])
      : []),
    ...(message.website
      ? ([["Website", link(websiteHref(message.website), message.website, true)]] as [
          string,
          ReactNode,
        ][])
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

      <form action={changeStage} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={message.id} />
        <h2 id="stage-heading" className={headingClass}>
          Lead stage
        </h2>
        <div role="group" aria-labelledby="stage-heading" className="flex flex-wrap gap-2">
          {LEAD_STAGES.map((stage) => (
            <button
              key={stage.value}
              name="stage"
              value={stage.value}
              aria-pressed={message.stage === stage.value}
              className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-sm font-medium hover:border-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-surface"
            >
              {stage.label}
            </button>
          ))}
        </div>
      </form>

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
        <h2 className={headingClass}>Message</h2>
        <p className="border-l-2 border-foreground bg-surface px-5 py-4 text-lg leading-relaxed break-words whitespace-pre-wrap">
          {message.message}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <a href={reply} className={primaryClass}>
          Reply by email
        </a>
        {message.phone ? (
          <>
            <a
              href={`https://wa.me/${whatsappNumber(message.phone)}`}
              target="_blank"
              rel="noreferrer noopener"
              className={actionClass}
            >
              WhatsApp
            </a>
            <a href={`tel:${message.phone.replace(/[^\d+]/g, "")}`} className={actionClass}>
              Call
            </a>
          </>
        ) : null}
      </div>

      <section aria-labelledby="notes-heading" className="flex flex-col gap-4">
        <h2 id="notes-heading" className={headingClass}>
          Notes
        </h2>
        {notes.length > 0 ? (
          <ul className="flex flex-col border-t border-border">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-4 border-b border-border py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <time dateTime={note.createdAt.toISOString()} className="text-xs text-muted">
                    {fullTime(note.createdAt)}
                  </time>
                  <p className="break-words whitespace-pre-wrap">{note.body}</p>
                </div>
                <form action={deleteNote}>
                  <input type="hidden" name="id" value={message.id} />
                  <input type="hidden" name="noteId" value={note.id} />
                  <button
                    aria-label={`Delete note from ${fullTime(note.createdAt)}`}
                    className="inline-flex min-h-11 items-center px-2 text-sm text-muted hover:text-danger"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No notes yet.</p>
        )}
        <form action={addNote} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={message.id} />
          <label htmlFor="note-body" className="sr-only">
            New note
          </label>
          <textarea
            id="note-body"
            name="body"
            rows={3}
            required
            maxLength={NOTE_LIMIT}
            placeholder="Add a note, e.g. Called them Tuesday, sending a quote Friday."
            className="w-full resize-y rounded-none border border-border-strong bg-surface px-4 py-3 text-base placeholder:text-muted focus-visible:border-foreground"
          />
          <div>
            <button className={actionClass}>Add note</button>
          </div>
        </form>
      </section>

      <form action={changeStatus} className="flex flex-wrap gap-3 border-t border-border pt-6">
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
    </article>
  );
}
