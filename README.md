# Dashboard

Marwan Elsayed's private dashboard: an installable web app (PWA) that collects the messages sent
through the portfolio's contact form and pushes a notification to the phone for each one. Built to
grow: each new section is a route in `src/app/(app)` and a link in its layout.

## How it fits together

```
Visitor → portfolio form → portfolio /api/contact ─┬→ Resend email (backup)
                                                   └→ dashboard /api/ingest (Bearer INGEST_SECRET)
                                                        → Neon Postgres (messages)
                                                        → web push to every saved device
```

- **Inbox** (`/`): New, All and Archived, with the topic (Project, Job opportunity, Message), its
  details and the start of the message. Opening a message marks it read.
- **Message** (`/messages/[id]`): every detail, the full text, Reply by email, Mark unread,
  Archive / Move to inbox.
- **Settings** (`/settings`): turn notifications on for this device, send a test, sign out.
- **Login**: one owner, one password (scrypt hash in an env var), a signed 30-day session cookie.

## Stack

Next.js 16 (App Router), strict TypeScript, Tailwind CSS 4, pnpm, Vitest, ESLint, Prettier, Vercel,
plus `@neondatabase/serverless` (database) and `web-push` (notifications).

## Setup (once)

1. **Vercel project**: import this repository in Vercel (New Project → `dashboard`).
2. **Database**: in the project, Storage → Create → Neon (free), custom prefix `DATABASE` so it adds
   `DATABASE_URL`. The app creates its tables itself on first use (`src/lib/schema.ts`).
3. **Secrets**: run `pnpm setup:secrets` and `pnpm setup:password` locally, and add the printed
   values in Vercel → Settings → Environment Variables (Production).
4. **Domain**: Vercel → Settings → Domains → add `dash.marwanelsayed.com`, then add the CNAME
   record it shows at your domain's DNS.
5. **iPhone**: open `https://dash.marwanelsayed.com` in Safari, sign in, Share → Add to Home
   Screen, open the app from the Home Screen, Settings → Turn on notifications → Send a test.
6. **Portfolio**: add `DASHBOARD_INGEST_URL` and `DASHBOARD_INGEST_SECRET` (printed by
   `pnpm setup:secrets`) to the portfolio's Vercel project.

## Local work

```
pnpm install
pnpm dev          # http://localhost:3100
```

Without `DATABASE_URL`, development uses invented sample messages in memory. Set
`SESSION_SECRET` and `OWNER_PASSWORD_HASH` in `.env.local` to sign in.

`pnpm check` runs formatting, lint, types, unit tests and the build.
