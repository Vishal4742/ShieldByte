# ShieldByte

ShieldByte is a SvelteKit app that turns real scam reports into short training missions.

The repo currently includes:

- A fraud news pipeline that collects articles from NewsAPI, RSS feeds, Reddit RSS, and a scraper
- AI and heuristic classification for fraud articles
- Mission generation from classified fraud data
- A playable web mission screen with timer, lives, XP, badges, and AI feedback
- A homepage with recent scam cases and article detail pages
- A profile page with stats, badge progress, and recent mission history
- A duel system where one player can challenge another on the same mission
- A WhatsApp webhook and session state machine on the backend
- Supabase migrations for storage and game progress

## Tech Stack

- SvelteKit 2
- Svelte 5
- TypeScript
- Supabase
- Vite

AI providers used in the repo:

- OpenRouter
- Gemini
- Groq
- Ollama

## What Works Right Now

### Web pages

- `/` home page
- `/play` mission gameplay page
- `/profile` profile dashboard
- `/articles/[id]` article detail page
- `/duel/[code]` challenge duel page

### API routes

- `GET /api/cron/ingest`
- `GET /api/cron/classify`
- `GET /api/cron/generate-missions`
- `POST /generate-mission`
- `GET /api/missions/random`
- `POST /api/missions/attempt`
- `POST /api/feedback/generate`
- `GET /api/lives`
- `POST /api/lives`
- `GET /api/user/profile`
- `POST /api/user/token`
- `POST /api/challenges/create`
- `POST /api/challenges/submit`
- `GET /api/challenges/[code]`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`

### Main gameplay features

- 60 second mission rounds
- 3 lives with server-backed life state
- XP, streaks, and rank updates
- Badge awarding
- Mission attempt saving
- AI-generated post-mission feedback
- Head-to-head duel result comparison

## Fraud Categories In Code

The classifier and mission system work with these six categories:

- `UPI_fraud`
- `KYC_fraud`
- `lottery_fraud`
- `job_scam`
- `investment_fraud`
- `customer_support_scam`

## Project Structure

```text
src/
  lib/
    components/        UI components for home and gameplay
    gameplay/          client gameplay logic
    server/            ingestion, classification, missions, feedback, auth, WhatsApp
    types/             shared types
  routes/              SvelteKit pages and API routes

scripts/               local scripts for evaluation, training, testing, and cron runs
supabase/migrations/   database schema files
docs/                  project notes and task files
static/                static assets
```

## Setup

1. Install dependencies:

```sh
npm install
```

2. Copy `.env.example` to `.env`

3. Fill in the required values

4. Start the dev server:

```sh
npm run dev
```

Useful checks:

```sh
npm run check
npm run build
```

## Environment Variables

These are the main variables used by the app:

### Required for core app and database

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `API_SECRET`

### Used by ingestion

- `NEWSAPI_KEY`

### Used by hosted AI providers

- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_CLASSIFIER_MODEL`
- `GEMINI_MISSION_MODEL`
- `GEMINI_FEEDBACK_MODEL`

### Used by OpenRouter

- `OPENROUTER_API_KEY`
- `OPENROUTER_API_KEY_2`
- `OPENROUTER_API_KEY_3`
- `OPENROUTER_CLASSIFIER_MODELS`
- `OPENROUTER_MISSION_MODELS`
- `OPENROUTER_FEEDBACK_MODELS`

### Used by Ollama

- `OLLAMA_BASE_URL`
- `OLLAMA_CLASSIFIER_MODEL`
- `OLLAMA_MISSION_MODEL`
- `OLLAMA_FEEDBACK_MODEL`

### Optional

- `PHASE1_CATEGORY_MODEL_PATH`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

## Cron Jobs

`vercel.json` currently schedules:

- `/api/cron/ingest` at `0 6 * * *`
- `/api/cron/classify` at `0 7 * * *`
- `/api/cron/generate-missions` at `0 8 * * *`

All cron endpoints expect the `x-cron-secret` header to match `CRON_SECRET`.

## Database Migrations In Repo

Current migration files:

1. `001_create_articles_table.sql`
2. `002_create_missions_table.sql`
3. `003_harden_phase1_pipeline.sql`
4. `004_phase1_observability_and_retries.sql`
5. `005_add_simulation_html_to_missions.sql`
6. `006_add_gameplay_progress_tables.sql`
7. `007_add_lives_to_user_stats.sql`
8. `008_add_feedback_log.sql`
9. `009_add_badges_table.sql`
10. `010_add_whatsapp_sessions.sql`
11. `010_whatsapp_sessions.sql`
12. `011_add_referrals.sql`
13. `012_add_challenges.sql`
14. `013_add_irrelevant_phase1_status.sql`
15. `phase1_finalize.sql`

Important note:

- Referral tables exist in migrations, but there are no referral routes or referral pages in `src/routes` right now.

## Useful Scripts

### Main dev scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run check`

### Phase 1 evaluation and training scripts

- `npm run eval:phase1:export`
- `npm run eval:phase1:weak`
- `npm run build:phase1:relevance-dataset`
- `npm run build:phase1:category-dataset`
- `npm run train:phase1:relevance`
- `npm run eval:phase1:relevance`
- `npm run eval:phase1:review`
- `npm run eval:phase1:score`
- `npm run eval:phase1:gate`
- `npm run run:phase1:cron`
- `npm run train:phase1:model`
- `npm run verify:phase1:live`

There are also helper files in `scripts/` for endpoint testing and migration runs.

## Notes About Current Repo State

- The homepage, gameplay flow, profile page, duel flow, and core backend pipelines are implemented in code.
- The repo has a WhatsApp webhook backend route and session table, but no separate WhatsApp UI page.
- The project status document in `docs/PROJECT_STATUS.md` contains some items that do not match the current `src/routes` tree. This README is based on the actual repository files.
