import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  IncomingMessage,
  LeadStage,
  MessageNote,
  MessageStatus,
  StoredMessage,
} from "./contact";
import { sampleMessages } from "./samples";
import { SCHEMA } from "./schema";

/** A browser's push subscription, as the Push API serialises it. */
export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type MessageView = "new" | "all" | "archived";

export type Counts = { new: number; all: number; archived: number };

/** Everything the dashboard stores. One implementation talks to Neon, one keeps data in memory. */
export interface Store {
  addMessage(message: IncomingMessage): Promise<StoredMessage>;
  /** The messages in a view, newest first; `search` matches name, email, company, role or text. */
  listMessages(view: MessageView, search?: string): Promise<StoredMessage[]>;
  getMessage(id: string): Promise<StoredMessage | null>;
  setStatus(id: string, status: MessageStatus): Promise<void>;
  setStage(id: string, stage: LeadStage): Promise<void>;
  counts(): Promise<Counts>;
  listNotes(messageId: string): Promise<MessageNote[]>;
  addNote(messageId: string, body: string): Promise<void>;
  deleteNote(noteId: string): Promise<void>;
  saveSubscription(subscription: PushSubscriptionRecord, userAgent: string): Promise<void>;
  removeSubscription(endpoint: string): Promise<void>;
  listSubscriptions(): Promise<PushSubscriptionRecord[]>;
}

type Row = {
  id: string;
  received_at: string | Date;
  status: MessageStatus;
  stage: LeadStage;
  topic: StoredMessage["topic"];
  name: string;
  email: string;
  phone: string;
  website: string;
  project_kind: string;
  budget: string;
  timeline: string;
  company: string;
  role: string;
  message: string;
};

const fromRow = (row: Row): StoredMessage => ({
  id: row.id,
  receivedAt: new Date(row.received_at),
  status: row.status,
  stage: row.stage ?? "open",
  topic: row.topic,
  name: row.name,
  email: row.email,
  phone: row.phone ?? "",
  website: row.website,
  projectKind: row.project_kind,
  budget: row.budget,
  timeline: row.timeline,
  company: row.company,
  role: row.role,
  message: row.message,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The search text, trimmed and capped; empty means no search. */
export function cleanSearch(search: string | undefined): string {
  return (search ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
}

/** A LIKE pattern that matches the text literally, with %, _ and \ escaped. */
export const likePattern = (search: string) => `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const VIEW_WHERE: Record<MessageView, string> = {
  new: "status = 'new'",
  all: "status <> 'archived'",
  archived: "status = 'archived'",
};

/** Runs every store call after the tables exist; the check runs once per server instance. */
function afterSchema(store: Store, ready: () => Promise<void>): Store {
  return Object.fromEntries(
    Object.entries(store).map(([name, call]) => [
      name,
      async (...args: unknown[]) => {
        await ready();
        return (call as (...a: unknown[]) => unknown)(...args);
      },
    ]),
  ) as unknown as Store;
}

function neonStore(url: string): Store {
  const sql = neon(url);
  let schema: Promise<void> | null = null;
  const ready = () =>
    (schema ??= (async () => {
      for (const statement of SCHEMA) await sql.query(statement);
    })().catch((error: unknown) => {
      schema = null; // Try again on the next call rather than failing forever.
      throw error;
    }));
  return afterSchema(neonQueries(sql), ready);
}

function neonQueries(sql: NeonQueryFunction<false, false>): Store {
  return {
    async addMessage(m) {
      const rows = (await sql`
        insert into messages (topic, name, email, phone, website, project_kind, budget, timeline, company, role, message)
        values (${m.topic}, ${m.name}, ${m.email}, ${m.phone}, ${m.website}, ${m.projectKind}, ${m.budget}, ${m.timeline}, ${m.company}, ${m.role}, ${m.message})
        returning *`) as Row[];
      return fromRow(rows[0]);
    },
    async listMessages(view, search) {
      const text = cleanSearch(search);
      // VIEW_WHERE holds fixed SQL only; the search text is always a bound parameter.
      const rows = (
        text
          ? await sql.query(
              `select * from messages where ${VIEW_WHERE[view]} and (
                 name ilike $1 or email ilike $1 or company ilike $1 or role ilike $1
                 or message ilike $1 or phone ilike $1
               ) order by received_at desc limit 200`,
              [likePattern(text)],
            )
          : await sql.query(
              `select * from messages where ${VIEW_WHERE[view]} order by received_at desc limit 200`,
            )
      ) as Row[];
      return rows.map(fromRow);
    },
    async getMessage(id) {
      if (!UUID.test(id)) return null;
      const rows = (await sql`select * from messages where id = ${id}`) as Row[];
      return rows[0] ? fromRow(rows[0]) : null;
    },
    async setStatus(id, status) {
      if (!UUID.test(id)) return;
      await sql`update messages set status = ${status} where id = ${id}`;
    },
    async setStage(id, stage) {
      if (!UUID.test(id)) return;
      await sql`update messages set stage = ${stage} where id = ${id}`;
    },
    async counts() {
      const rows = (await sql`
        select
          count(*) filter (where status = 'new')::int as new,
          count(*) filter (where status <> 'archived')::int as all,
          count(*) filter (where status = 'archived')::int as archived
        from messages`) as Counts[];
      return rows[0] ?? { new: 0, all: 0, archived: 0 };
    },
    async listNotes(messageId) {
      if (!UUID.test(messageId)) return [];
      const rows = (await sql`
        select id, body, created_at from message_notes
        where message_id = ${messageId} order by created_at`) as {
        id: string;
        body: string;
        created_at: string | Date;
      }[];
      return rows.map((r) => ({ id: r.id, body: r.body, createdAt: new Date(r.created_at) }));
    },
    async addNote(messageId, body) {
      if (!UUID.test(messageId)) return;
      await sql`insert into message_notes (message_id, body) values (${messageId}, ${body})`;
    },
    async deleteNote(noteId) {
      if (!UUID.test(noteId)) return;
      await sql`delete from message_notes where id = ${noteId}`;
    },
    async saveSubscription(s, userAgent) {
      await sql`
        insert into push_subscriptions (endpoint, p256dh, auth, user_agent)
        values (${s.endpoint}, ${s.keys.p256dh}, ${s.keys.auth}, ${userAgent.slice(0, 300)})
        on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`;
    },
    async removeSubscription(endpoint) {
      await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
    },
    async listSubscriptions() {
      const rows = (await sql`select endpoint, p256dh, auth from push_subscriptions`) as {
        endpoint: string;
        p256dh: string;
        auth: string;
      }[];
      return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
    },
  };
}

/** For local development without a database: sample messages, lost on restart. */
function memoryStore(): Store {
  const messages: StoredMessage[] = sampleMessages();
  const notes = new Map<string, MessageNote & { messageId: string }>();
  const subscriptions = new Map<string, PushSubscriptionRecord>();
  const visible = (view: MessageView) => (m: StoredMessage) =>
    view === "new"
      ? m.status === "new"
      : view === "archived"
        ? m.status === "archived"
        : m.status !== "archived";
  const find = (id: string) => messages.find((m) => m.id === id);
  return {
    async addMessage(m) {
      const stored: StoredMessage = {
        ...m,
        id: crypto.randomUUID(),
        receivedAt: new Date(),
        status: "new",
        stage: "open",
      };
      messages.unshift(stored);
      return stored;
    },
    async listMessages(view, search) {
      const text = cleanSearch(search).toLowerCase();
      return messages
        .filter(visible(view))
        .filter(
          (m) =>
            !text ||
            [m.name, m.email, m.company, m.role, m.message, m.phone].some((field) =>
              field.toLowerCase().includes(text),
            ),
        );
    },
    async getMessage(id) {
      return find(id) ?? null;
    },
    async setStatus(id, status) {
      const found = find(id);
      if (found) found.status = status;
    },
    async setStage(id, stage) {
      const found = find(id);
      if (found) found.stage = stage;
    },
    async counts() {
      return {
        new: messages.filter(visible("new")).length,
        all: messages.filter(visible("all")).length,
        archived: messages.filter(visible("archived")).length,
      };
    },
    async listNotes(messageId) {
      return [...notes.values()]
        .filter((note) => note.messageId === messageId)
        .map(({ id, body, createdAt }) => ({ id, body, createdAt }));
    },
    async addNote(messageId, body) {
      if (!find(messageId)) return;
      const id = crypto.randomUUID();
      notes.set(id, { id, messageId, body, createdAt: new Date() });
    },
    async deleteNote(noteId) {
      notes.delete(noteId);
    },
    async saveSubscription(s) {
      subscriptions.set(s.endpoint, s);
    },
    async removeSubscription(endpoint) {
      subscriptions.delete(endpoint);
    },
    async listSubscriptions() {
      return [...subscriptions.values()];
    },
  };
}

const globalStore = globalThis as unknown as { __dashboardStore?: Store };

/**
 * The store for this process. Production requires DATABASE_URL; without it, development uses the
 * in-memory sample store so the screens can be worked on before Neon is set up.
 */
export function getStore(): Store {
  if (globalStore.__dashboardStore) return globalStore.__dashboardStore;
  const url = process.env.DATABASE_URL?.trim();
  if (!url && process.env.NODE_ENV === "production" && process.env.DASHBOARD_MEMORY_STORE !== "1")
    throw new Error("DATABASE_URL is not set.");
  globalStore.__dashboardStore = url ? neonStore(url) : memoryStore();
  return globalStore.__dashboardStore;
}
