# ShieldByte Agent Guide

This repository is configured for iterative agent work.

## Primary Context

- Product task spec: `docs/tasks/PRD.md`
- Progress log: `docs/tasks/progress.txt`
- Repo-specific execution prompt: `docs/tasks/prompt.md`

## Operating Rules

1. Read `docs/tasks/PRD.md` and `docs/tasks/progress.txt` before making changes.
2. Complete exactly one task at a time unless a small follow-up is required to keep the app runnable.
3. Append updates to `docs/tasks/progress.txt`; do not rewrite prior entries.
4. Keep the app buildable after each iteration.
5. Prefer small, production-safe edits over broad refactors.
6. Use server-side data access for privileged Supabase reads.
7. Never expose secrets or service-role credentials to the client.
8. Normalize inconsistent AI extraction data in server utilities before rendering.
9. After changes, run the smallest relevant validation commands available.
10. Do not perform git history rewrites or commits unless explicitly requested.

## Repository Landmarks

- Homepage: `src/routes/+page.svelte`
- Cron ingestion endpoint: `src/routes/api/cron/ingest/+server.ts`
- Cron classify endpoint: `src/routes/api/cron/classify/+server.ts`
- Server code: `src/lib/server/`
- Supabase migrations: `supabase/migrations/`

## Working Goal

The current MVP goal is to turn the classified article pipeline into a usable ShieldByte experience:

- Replace the starter homepage
- Add safe server-side reads for classified articles
- Build a recent threat feed
- Add an article intelligence detail view
- Add a mission-style training experience
- Tighten pipeline contracts and validation

## Validation

Use the smallest relevant checks first:

- `npm run check`
- `npm run build`
