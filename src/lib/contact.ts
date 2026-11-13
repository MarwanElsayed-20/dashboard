/**
 * The portfolio contact form's message, as the dashboard receives and stores it.
 *
 * The options and labels mirror `src/lib/contact/validate.ts` in the portfolio repository. Keep the
 * two in step: the portfolio validates what a visitor types, and this file checks again what
 * arrives at /api/ingest, because the ingest endpoint must never trust its caller blindly.
 */

export const CONTACT_TOPICS = [
  { value: "project", label: "Project" },
  { value: "job", label: "Job opportunity" },
  { value: "other", label: "Message" },
] as const;

export const PROJECT_KINDS = [
  { value: "store", label: "Online store" },
  { value: "website", label: "Website or landing page" },
  { value: "dashboard", label: "Dashboard or admin tool" },
  { value: "saas", label: "SaaS product" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const PROJECT_BUDGETS = [
  { value: "under-1k", label: "Under $1,000" },
  { value: "1k-3k", label: "$1,000 – $3,000" },
  { value: "3k-10k", label: "$3,000 – $10,000" },
  { value: "10k-plus", label: "$10,000 or more" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const PROJECT_TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-month", label: "Within a month" },
  { value: "1-3-months", label: "In 1 to 3 months" },
  { value: "flexible", label: "Flexible" },
] as const;

type Option = { readonly value: string; readonly label: string };
type ValueOf<T extends readonly Option[]> = T[number]["value"];

export type ContactTopic = ValueOf<typeof CONTACT_TOPICS>;

export const LIMITS = {
  name: 100,
  phone: 40,
  email: 254,
  website: 300,
  company: 120,
  role: 120,
  message: 4000,
} as const;

/** What a stored message holds besides its id, time and status. */
export type IncomingMessage = {
  topic: ContactTopic;
  name: string;
  email: string;
  phone: string;
  website: string;
  projectKind: string;
  budget: string;
  timeline: string;
  company: string;
  role: string;
  message: string;
};

export type MessageStatus = "new" | "read" | "archived";

/** Where a message stands as a lead, set by the owner. Separate from read/archived. */
export const LEAD_STAGES = [
  { value: "open", label: "Open" },
  { value: "replied", label: "Replied" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;
export type LeadStage = ValueOf<typeof LEAD_STAGES>;

export function isLeadStage(value: unknown): value is LeadStage {
  return LEAD_STAGES.some((stage) => stage.value === value);
}

/** A dated note the owner adds to a message ("Called them Tuesday"). */
export type MessageNote = { id: string; body: string; createdAt: Date };
export const NOTE_LIMIT = 2000;

export type StoredMessage = IncomingMessage & {
  id: string;
  receivedAt: Date;
  status: MessageStatus;
  stage: LeadStage;
};

export function labelOf(options: readonly Option[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const known = (options: readonly Option[], value: unknown) =>
  typeof value === "string" && options.some((option) => option.value === value) ? value : "";

/** Keeps a phone number only if it looks like one: digits with spaces, dots, dashes, brackets, a leading +. */
function phoneOf(value: unknown): string {
  const phone = text(value, LIMITS.phone);
  const digits = phone.replace(/\D/g, "").length;
  return /^\+?[\d\s().-]+$/.test(phone) && digits >= 6 && digits <= 15 ? phone : "";
}

/** The number for wa.me links: digits only, with the country code if one was typed. */
export function whatsappNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks an ingest payload. Unknown option values are dropped rather than refused, so a newer form
 * never loses a message; a missing email or message is refused, since nothing can be done with it.
 */
export function parseIncoming(
  raw: unknown,
): { ok: true; value: IncomingMessage } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return { ok: false, error: "body must be an object" };
  const body = raw as Record<string, unknown>;
  const topic = (known(CONTACT_TOPICS, body.topic) || "other") as ContactTopic;
  const value: IncomingMessage = {
    topic,
    name: text(body.name, LIMITS.name),
    email: text(body.email, LIMITS.email),
    phone: phoneOf(body.phone),
    website: text(body.website, LIMITS.website),
    projectKind: topic === "project" ? known(PROJECT_KINDS, body.projectKind) : "",
    budget: topic === "project" ? known(PROJECT_BUDGETS, body.budget) : "",
    timeline: topic === "project" ? known(PROJECT_TIMELINES, body.timeline) : "",
    company: topic === "job" ? text(body.company, LIMITS.company) : "",
    role: topic === "job" ? text(body.role, LIMITS.role) : "",
    message: text(body.message, LIMITS.message),
  };
  if (!EMAIL.test(value.email)) return { ok: false, error: "email is missing or invalid" };
  if (value.message === "") return { ok: false, error: "message is missing" };
  return { ok: true, value };
}

/** The topic and its details as label/value pairs, in reading order; empty details left out. */
export function summary(message: IncomingMessage): [label: string, value: string][] {
  const pairs: [string, string][] = [];
  if (message.projectKind) pairs.push(["Kind", labelOf(PROJECT_KINDS, message.projectKind)]);
  if (message.budget) pairs.push(["Budget", labelOf(PROJECT_BUDGETS, message.budget)]);
  if (message.timeline) pairs.push(["Timeline", labelOf(PROJECT_TIMELINES, message.timeline)]);
  if (message.company) pairs.push(["Company", message.company]);
  if (message.role) pairs.push(["Role", message.role]);
  return pairs;
}

/** Who sent it, for list rows and notifications. */
export function senderOf(message: Pick<IncomingMessage, "name" | "email">): string {
  return message.name || message.email;
}

/** The phone notification for a new message: short, and enough to decide whether to open it. */
export function notificationFor(message: IncomingMessage): { title: string; body: string } {
  const topic = labelOf(CONTACT_TOPICS, message.topic);
  const detail =
    message.topic === "project" && message.projectKind
      ? ` · ${labelOf(PROJECT_KINDS, message.projectKind)}`
      : message.topic === "job" && message.company
        ? ` · ${message.company}`
        : "";
  const snippet = message.message.replace(/\s+/g, " ");
  return {
    title: `${topic}${detail}: ${senderOf(message)}`.slice(0, 80),
    body: snippet.length > 140 ? `${snippet.slice(0, 139)}…` : snippet,
  };
}
