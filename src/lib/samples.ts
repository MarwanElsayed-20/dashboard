import type { StoredMessage } from "./contact";

/** Invented messages for the in-memory store used in local development. Never stored anywhere. */
export function sampleMessages(): StoredMessage[] {
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);
  const blank = {
    phone: "",
    stage: "open" as const,
    website: "",
    projectKind: "",
    budget: "",
    timeline: "",
    company: "",
    role: "",
  };
  return [
    {
      ...blank,
      id: "00000000-0000-4000-8000-000000000001",
      receivedAt: hoursAgo(0.4),
      status: "new",
      topic: "project",
      name: "Sam Rivera",
      email: "sam@northfield.example",
      phone: "+20 111 000 0000",
      stage: "replied",
      website: "northfield.example",
      projectKind: "store",
      budget: "3k-10k",
      timeline: "1-3-months",
      message:
        "We sell building supplies to contractors and want an online store with company accounts, quotes and per-store stock.\n\nCould we talk next week?",
    },
    {
      ...blank,
      id: "00000000-0000-4000-8000-000000000002",
      receivedAt: hoursAgo(5),
      status: "new",
      topic: "job",
      name: "Lena Ortiz",
      email: "lena@brightloop.example",
      company: "Brightloop",
      role: "Senior front-end engineer",
      message:
        "Hi Marwan, I lead hiring for our platform team. Your ToolSwift work is close to what we build. Are you open to a remote role?",
    },
    {
      ...blank,
      id: "00000000-0000-4000-8000-000000000003",
      receivedAt: hoursAgo(30),
      status: "read",
      topic: "project",
      name: "",
      email: "ops@greenline.example",
      projectKind: "dashboard",
      timeline: "asap",
      message: "We need an admin dashboard for our delivery drivers and dispatch team.",
    },
    {
      ...blank,
      id: "00000000-0000-4000-8000-000000000004",
      receivedAt: hoursAgo(80),
      status: "archived",
      topic: "other",
      name: "Omar Haddad",
      email: "omar@example.com",
      message:
        "Loved the case studies, especially the Work page. Which library did you use for the hover worlds?",
    },
  ];
}
