# RV6 Project Command

A private, boss-ready project portfolio for RV6 initiatives. It combines the current HQ and implementation-task baseline into one editable dashboard with progress, milestones, blockers, risks, source traceability, and a printable executive view.

## Stack

- Next.js 16.3 with the App Router
- React 19
- Tailwind CSS 4
- Drizzle ORM
- Neon Postgres
- Vercel-ready deployment

Authentication is intentionally deferred. Do not expose a production deployment publicly until access control is added or Vercel deployment protection is enabled.

## Run locally

```bash
pnpm install
pnpm dev
```

Without environment variables, the app runs in demo mode. The reviewed five-project baseline is bundled into the app, and edits/new projects persist in the current browser.

## Connect Neon

1. Create or select a Neon project and a development branch.
2. Copy `.env.example` to `.env.local`.
3. Put the pooled URL in `DATABASE_URL` and the direct/unpooled URL in `DATABASE_URL_UNPOOLED`.
4. Generate and apply the schema:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

The application reads with the pooled connection. Drizzle migrations should use the direct connection.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import the repository into Vercel.
3. Add `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in Vercel project settings.
4. Deploy.

## Current baseline

- Lead Time Implementation — 65%
- Product Assets & Folder Structure — 45% estimated
- Blog Implementation — 85%
- AI Customer Support Automation — 60%
- Website Restructure — 15% conservative estimate

The Folder Structure and Website figures are explicitly labeled as estimates because their HQ records did not provide a single approved overall percentage.
