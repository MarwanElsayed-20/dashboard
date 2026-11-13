import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const addMessage = vi.fn();
const notifyAll = vi.fn();
vi.mock("@/lib/store", () => ({ getStore: () => ({ addMessage }) }));
vi.mock("@/lib/push", () => ({ notifyAll: (...args: unknown[]) => notifyAll(...args) }));

const { POST } = await import("./route");

const body = {
  topic: "job",
  name: "Lena",
  email: "lena@acme.co",
  company: "Acme",
  message: "A role for you.",
};
const post = (payload: unknown, auth = "Bearer ingest-key") =>
  POST(
    new Request("http://localhost/api/ingest", {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }),
  );

describe("POST /api/ingest", () => {
  beforeEach(() => {
    vi.stubEnv("INGEST_SECRET", "ingest-key");
    addMessage.mockReset().mockImplementation(async (m) => ({
      ...m,
      id: "id-1",
      receivedAt: new Date(),
      status: "new",
    }));
    notifyAll.mockReset().mockResolvedValue(1);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("stores the message, then notifies with a link to it", async () => {
    const response = await post(body);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, id: "id-1", notified: 1 });
    expect(addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "job", company: "Acme" }),
    );
    expect(notifyAll.mock.calls[0][1]).toMatchObject({
      title: "Job opportunity · Acme: Lena",
      url: "/messages/id-1",
      tag: "id-1",
    });
  });

  it("refuses a wrong or missing key and stores nothing", async () => {
    expect((await post(body, "Bearer nope")).status).toBe(401);
    expect((await post(body, "")).status).toBe(401);
    vi.stubEnv("INGEST_SECRET", "");
    expect((await post(body)).status).toBe(401);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it("refuses bad JSON, oversized bodies and invalid messages", async () => {
    expect((await post("{nope")).status).toBe(400);
    expect((await post({ ...body, message: "x".repeat(25_000) })).status).toBe(413);
    expect((await post({ ...body, email: "nope" })).status).toBe(422);
    expect(addMessage).not.toHaveBeenCalled();
  });
});
