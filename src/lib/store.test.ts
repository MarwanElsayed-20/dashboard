import { afterEach, describe, expect, it, vi } from "vitest";
import { SCHEMA } from "./schema";

const query = vi.fn(async () => []);
const tagged = vi.fn(async () => [{ new: 1, all: 2, archived: 0 }]);
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(tagged, { query }),
}));

describe("the Neon store", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as { __dashboardStore?: unknown }).__dashboardStore;
  });

  it("creates the tables once, before its first call", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://example");
    const { getStore } = await import("./store");
    const store = getStore();
    expect(query).not.toHaveBeenCalled();
    expect(await store.counts()).toEqual({ new: 1, all: 2, archived: 0 });
    await store.counts();
    expect(query.mock.calls.map((call) => (call as unknown[])[0])).toEqual([...SCHEMA]);
    expect(tagged).toHaveBeenCalledTimes(2);
  });
});

describe("search, stages and notes (in-memory store)", () => {
  afterEach(() => {
    delete (globalThis as { __dashboardStore?: unknown }).__dashboardStore;
  });

  it("escapes LIKE wildcards and trims the search", async () => {
    const { cleanSearch, likePattern } = await import("./store");
    expect(cleanSearch("  big   store  ")).toBe("big store");
    expect(cleanSearch(undefined)).toBe("");
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("finds messages by company, phone or text within a view", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getStore } = await import("./store");
    const store = getStore();
    expect((await store.listMessages("all", "brightloop")).map((m) => m.name)).toEqual([
      "Lena Ortiz",
    ]);
    expect((await store.listMessages("all", "111 000")).map((m) => m.name)).toEqual(["Sam Rivera"]);
    expect(await store.listMessages("archived", "brightloop")).toEqual([]);
  });

  it("changes the lead stage and keeps dated notes in order", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getStore } = await import("./store");
    const store = getStore();
    const [first] = await store.listMessages("all");
    await store.setStage(first.id, "won");
    expect((await store.getMessage(first.id))?.stage).toBe("won");
    await store.addNote(first.id, "Called them.");
    await store.addNote(first.id, "Sent the quote.");
    const notes = await store.listNotes(first.id);
    expect(notes.map((n) => n.body)).toEqual(["Called them.", "Sent the quote."]);
    await store.deleteNote(notes[0].id);
    expect((await store.listNotes(first.id)).map((n) => n.body)).toEqual(["Sent the quote."]);
  });
});
