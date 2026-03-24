# ShieldByte

ShieldByte is a SvelteKit project for a cyber fraud awareness platform. The current codebase already includes:

- Fraud news ingestion via cron endpoint
- AI classification of ingested articles
- Supabase storage for raw and classified articles

## Development

```sh
npm install
npm run dev
```

Useful checks:

```sh
npm run check
npm run build
```

## Environment

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEWSAPI_KEY`
- `GROQ_API_KEY`
- `CRON_SECRET`

## Ralph Loop for Antigravity

This repo is prepared for the `Ralph Loop for Antigravity` extension with:

- `docs/tasks/PRD.md` as the task file
- `docs/tasks/progress.txt` as the append-only progress log
- `docs/tasks/prompt.md` as repo-specific execution guidance

Recommended Ralph Loop configuration:

- Task file: `docs/tasks/PRD.md`
- Progress file: `docs/tasks/progress.txt`
- Prompt file: `docs/tasks/prompt.md`
- Mode: `Planning` when rewriting the plan, `Fast` for execution

Suggested first run:

1. Open the Ralph Loop sidebar in Antigravity.
2. Select `docs/tasks/PRD.md`, `docs/tasks/progress.txt`, and `docs/tasks/prompt.md`.
3. Start in `Fast` mode.
4. Review `docs/tasks/progress.txt` after each completed iteration.
