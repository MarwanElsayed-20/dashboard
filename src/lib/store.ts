import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { IncomingMessage, MessageStatus, StoredMessage } from "./contact";
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
  listMessages(view: MessageView): Promise<StoredMessage[]>;
  getMessage(id: string): Promise<StoredMessage | null>;
  setStatus(id: string, status: MessageStatus): Promise<void>;
  counts(): Promise<Counts>;
  saveSubscription(subscription: PushSubscriptionRecord, userAgent: string): Promise<void>;
  removeSubscription(endpoint: string): Promise<void>;
  listSubscriptions(): Promise<PushSubscriptionRecord[]>;
}

type Row = {
  id: string;
  received_at: string | Date;
  status: MessageStatus;
  topic: StoredMessage["topic"];
  name: string;
  email: string;
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
  topic: row.topic,
  name: row.name,
  email: row.email,
  website: row.website,
  projectKind: row.project_kind,
  budget: row.budget,
  timeline: row.timeline,
  company: row.company,
  role: row.role,
  message: row.message,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  return afterSchema(neonStore_(sql), ready);
}

function neonStore_(sql: NeonQueryFunction<false, false>): Store {
  return {
    async addMessage(m) {
      const rows = (await sql`
        insert into messages (topic, name, email, website, project_kind, budget, timeline, company, role, message)
        values (${m.topic}, ${m.name}, ${m.email}, ${m.website}, ${m.projectKind}, ${m.budget}, ${m.timeline}, ${m.company}, ${m.role}, ${m.message})
        returning *`) as Row[];
      return fromRow(rows[0]);
    },
    async listMessages(view) {
      const rows = (
        view === "new"
          ? await sql`select * from messages where status = 'new' order by received_at desc limit 200`
          : view === "archived"
            ? await sql`select * from messages where status = 'archived' order by received_at desc limit 200`
            : await sql`select * from messages where status <> 'archived' order by received_at desc limit 200`
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
    async counts() {
      const rows = (await sql`
        select
          count(*) filter (where status = 'new')::int as new,
          count(*) filter (where status <> 'archived')::int as all,
          count(*) filter (where status = 'archived')::int as archived
        from messages`) as Counts[];
      return rows[0] ?? { new: 0, all: 0, archived: 0 };
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
  const subscriptions = new Map<string, PushSubscriptionRecord>();
  const visible = (view: MessageView) => (m: StoredMessage) =>
    view === "new"
      ? m.status === "new"
      : view === "archived"
        ? m.status === "archived"
        : m.status !== "archived";
  return {
    async addMessage(m) {
      const stored: StoredMessage = {
        ...m,
        id: crypto.randomUUID(),
        receivedAt: new Date(),
        status: "new",
      };
      messages.unshift(stored);
      return stored;
    },
    async listMessages(view) {
      return messages.filter(visible(view));
    },
    async getMessage(id) {
      return messages.find((m) => m.id === id) ?? null;
    },
    async setStatus(id, status) {
      const found = messages.find((m) => m.id === id);
      if (found) found.status = status;
    },
    async counts() {
      return {
        new: messages.filter(visible("new")).length,
        all: messages.filter(visible("all")).length,
        archived: messages.filter(visible("archived")).length,
      };
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
