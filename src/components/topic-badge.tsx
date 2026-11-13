import { CONTACT_TOPICS, labelOf, type ContactTopic } from "@/lib/contact";

const tone: Record<ContactTopic, string> = {
  project: "bg-highlight text-foreground",
  job: "bg-foreground text-surface",
  other: "border border-border-strong text-muted",
};

/** Project, Job opportunity or Message, so the kind of message reads before its words. */
export function TopicBadge({ topic }: { topic: ContactTopic }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase ${tone[topic]}`}
    >
      {labelOf(CONTACT_TOPICS, topic)}
    </span>
  );
}
