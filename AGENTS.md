# AGENTS.md

Shared instructions for AI coding agents working in this repository.

## Project

Marwan Elsayed's private dashboard (PWA). First section: the portfolio's contact inbox with web
push to an iPhone. More sections will be added; each is a route in `src/app/(app)` and a NavLink in
`src/app/(app)/layout.tsx`.

## Rules

- Stack: Next.js (App Router), strict TypeScript, Tailwind CSS, pnpm, Vitest, ESLint, Prettier,
  Vercel, `@neondatabase/serverless`, `web-push`. Ask before adding anything else.
- One owner. Every page, server action and route that reads or changes data checks the session
  (`requireOwner` / `isSignedIn`), even though `src/proxy.ts` gates requests first.
- `/api/ingest` is the only public write path; it requires `Bearer INGEST_SECRET` and stores the
  message before notifying, so a push failure never loses a message.
- The contact options in `src/lib/contact.ts` mirror `src/lib/contact/validate.ts` in the
  portfolio repository; change both together.
- Mobile first (installed on iPhone): safe-area padding, 44px touch targets, reduced motion,
  keyboard and screen-reader support.
- Never commit secrets or `.env*` files (only `.env.example`).
- Run `pnpm check` (or the relevant parts) and report results honestly.
