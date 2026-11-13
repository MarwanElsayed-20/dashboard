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
