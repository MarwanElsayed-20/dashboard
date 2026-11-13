import { describe, expect, it } from "vitest";
import { notificationFor, parseIncoming, senderOf, summary } from "./contact";

const base = {
  topic: "project",
  name: "Sam",
  email: "sam@studio.co",
  message: "We need an online store.",
};

describe("parseIncoming", () => {
  it("accepts a project with its details and trims text", () => {
    const result = parseIncoming({
      ...base,
      name: "  Sam  ",
      projectKind: "store",
      budget: "3k-10k",
      timeline: "asap",
      company: "Should be dropped",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        topic: "project",
        name: "Sam",
        email: "sam@studio.co",
        phone: "",
        website: "",
        projectKind: "store",
        budget: "3k-10k",
        timeline: "asap",
        company: "",
        role: "",
        message: "We need an online store.",
      },
    });
  });

  it("keeps a job's company and role and drops project details", () => {
    const result = parseIncoming({
      ...base,
      topic: "job",
      company: "Acme",
      role: "Lead",
      budget: "3k-10k",
    });
    expect(result.ok && result.value).toMatchObject({ company: "Acme", role: "Lead", budget: "" });
  });

  it("drops unknown option values instead of losing the message", () => {
    const result = parseIncoming({ ...base, topic: "newsletter", budget: "huge" });
    expect(result.ok && result.value).toMatchObject({ topic: "other", budget: "" });
  });

  it("refuses a message without a valid email or text, and non-object bodies", () => {
    expect(parseIncoming({ ...base, email: "nope" }).ok).toBe(false);
    expect(parseIncoming({ ...base, message: "   " }).ok).toBe(false);
    expect(parseIncoming([]).ok).toBe(false);
    expect(parseIncoming(null).ok).toBe(false);
  });

  it("caps long fields", () => {
    const result = parseIncoming({ ...base, message: "x".repeat(5000), name: "n".repeat(200) });
    expect(result.ok && result.value.message.length).toBe(4000);
    expect(result.ok && result.value.name.length).toBe(100);
  });
});

describe("display helpers", () => {
  const project = {
    topic: "project" as const,
    name: "",
    email: "ops@greenline.co",
    phone: "",
    website: "",
    projectKind: "dashboard",
    budget: "",
    timeline: "asap",
    company: "",
    role: "",
    message: "We need an admin dashboard for our drivers.\n\nAnd dispatch.",
  };

  it("names the sender by name, else by email", () => {
    expect(senderOf(project)).toBe("ops@greenline.co");
    expect(senderOf({ ...project, name: "Ola" })).toBe("Ola");
  });

  it("summarises only the details that were given", () => {
    expect(summary(project)).toEqual([
      ["Kind", "Dashboard or admin tool"],
      ["Timeline", "As soon as possible"],
    ]);
  });

  it("builds a short notification with the topic and the start of the message", () => {
    expect(notificationFor(project)).toEqual({
      title: "Project · Dashboard or admin tool: ops@greenline.co",
      body: "We need an admin dashboard for our drivers. And dispatch.",
    });
    const job = notificationFor({
      ...project,
      topic: "job",
      projectKind: "",
      company: "Acme",
      name: "Lena",
    });
    expect(job.title).toBe("Job opportunity · Acme: Lena");
    expect(notificationFor({ ...project, message: "y".repeat(300) }).body).toHaveLength(140);
  });
});

describe("phone numbers", () => {
  it("keeps a number that looks like one and drops anything else", async () => {
    const { whatsappNumber } = await import("./contact");
    const keep = parseIncoming({ ...base, phone: " +20 (100) 000-1234 " });
    expect(keep.ok && keep.value.phone).toBe("+20 (100) 000-1234");
    expect(whatsappNumber("+20 (100) 000-1234")).toBe("201000001234");
    for (const phone of ["call me", "12345", "+1 234 567 890 123 456 7", "<b>1234567</b>"]) {
      const result = parseIncoming({ ...base, phone });
      expect(result.ok && result.value.phone).toBe("");
    }
  });
});
