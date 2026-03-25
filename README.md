# ShieldByte

## Project Report

### 1. Executive Summary

ShieldByte is a full-stack cyber fraud awareness platform built with SvelteKit and Supabase. Its main idea is simple:

- collect real scam-related news and fraud reports
- turn those reports into structured fraud data
- generate playable scam simulation missions from that data
- let users practice spotting scam clues in a browser game
- save user progress and generate simple AI feedback after each mission

The repo currently contains a working backend content pipeline and a working web gameplay surface. It also includes backend support for a WhatsApp flow and a duel challenge system.

The current codebase is strongest in:

- fraud article ingestion
- fraud relevance analysis
- fraud classification
- mission generation
- playable web missions
- progress tracking
- AI feedback
- duel mode

The current codebase is partial in:

- full account/auth product flow
- referral feature wiring
- full WhatsApp product surface

### 2. Project Purpose

ShieldByte is trying to solve a practical problem: people usually read about scams, but they do not practice identifying them in realistic situations.

This repo implements a system that turns real scam cases into short interactive missions. Instead of giving only static advice, it creates a loop where the user:

1. sees a suspicious message
2. decides whether it is a scam
3. taps suspicious parts of the message
4. loses lives on wrong guesses
5. earns XP on success
6. receives feedback on what was missed

This makes the system part content pipeline, part game, and part learning tool.

### 3. Current Product Surface

The current web product in code includes:

- a homepage with recent scam cases
- a mission play screen
- article detail pages
- a profile dashboard
- a duel page for challenge comparisons

The current backend product in code includes:

- scheduled ingestion
- scheduled classification
- scheduled mission generation
- mission serving APIs
- attempt saving APIs
- lives and token APIs
- AI feedback generation
- challenge creation and submission
- WhatsApp webhook handling

### 4. Core Business Flow

The full repo flow works like this:

1. fraud articles are fetched from external sources
2. article text is cleaned and checked for fraud relevance
3. relevant raw articles are classified into one of six fraud categories
4. structured classification output is stored in Supabase
5. missions are generated from classified fraud data
6. the frontend loads active missions from Supabase
7. the user plays a mission and submits the result
8. XP, streak, rank, lives, and badges are updated
9. AI feedback is generated for that mission result

### 5. Tech Stack

#### Frontend

- SvelteKit 2
- Svelte 5
- TypeScript
- Vite

#### Backend and storage

- SvelteKit server routes
- Supabase
- PostgreSQL through Supabase

#### Content and AI libraries

- `@supabase/supabase-js`
- `cheerio`
- `groq-sdk`
- `rss-parser`
- `zod`

#### AI providers used by the code

- OpenRouter
- Gemini
- Groq
- Ollama

### 6. Fraud Categories Implemented

The code currently works with these exact categories:

- `UPI_fraud`
- `KYC_fraud`
- `lottery_fraud`
- `job_scam`
- `investment_fraud`
- `customer_support_scam`

These categories are defined in:

- `src/lib/server/constants.ts`

The category-specific heuristics, clues, red flags, and tips are implemented in:

- `src/lib/server/fraud-signals.ts`

### 7. Detailed System Architecture

#### 7.1 Ingestion layer

Main files:

- `src/lib/server/news-ingestion.ts`
- `src/lib/server/constants.ts`
- `src/lib/server/web-scraper.ts`

Purpose:

- fetch scam-related content from external sources
- filter weak or irrelevant content early
- deduplicate incoming articles
- store new articles in Supabase

Implemented source types:

- NewsAPI
- RSS feeds
- Reddit RSS feeds
- scraped pages

Important implementation details:

- ingestion runs multiple source fetches in parallel
- articles are cleaned with local text sanitization
- heuristic fraud checks run before database insert
- duplicate removal uses URL and title/source keys
- inserted rows go into `fraud_articles`
- run-level metrics go into `ingestion_runs`

Important ingestion behaviors in code:

- target is at least 5 inserted articles per run
- articles can be dropped before insert if they look like advisories or non-scam content
- negative and positive pattern scoring is used before database write

#### 7.2 Relevance and signal scoring layer

Main file:

- `src/lib/server/fraud-signals.ts`

Purpose:

- decide whether an article is a real scam case or just related discussion
- score category hints before calling an LLM
- provide fallback classification content when AI is weak or unavailable

Implemented logic includes:

- weighted keyword matching per fraud category
- scam incident pattern scoring
- non-scam context detection
- signal strength calculation
- relevance confidence estimation
- review status decision

This layer matters because the repo does not trust external content blindly. It tries to reject:

- awareness articles
- advisories
- policy writeups
- legal/crime reporting that does not describe a usable scam pattern

#### 7.3 Classification layer

Main files:

- `src/lib/server/ai-classifier.ts`
- `src/lib/server/extraction.ts`
- `src/lib/server/phase1-ml.ts`
- `src/lib/server/json-utils.ts`

Purpose:

- convert raw article text into structured fraud data

Classification output includes:

- `fraud_type`
- `channel`
- `scenario_summary`
- `victim_profile`
- `clues`
- `red_flags`
- `tip`

Provider order implemented in code:

- OpenRouter models if configured
- Gemini if configured
- Ollama if configured
- Groq as another supported path in the classifier flow

Other important classification details:

- JSON output is validated with Zod
- heuristic fallback classification exists
- ML-assisted category prediction exists
- confidence is estimated after reconciliation
- results can be auto-approved or marked `needs_review`
- raw articles with repeated failures are retried and can move to `failed`
- irrelevant articles can move to `irrelevant`

Database behavior:

- reads from `fraud_articles` where status is `raw`
- writes structured output back to `fraud_articles`
- logs metrics to `classification_runs`

#### 7.4 Mission generation layer

Main files:

- `src/lib/server/mission-generator.ts`
- `src/lib/server/mission-rendering.ts`
- `src/lib/server/missions.ts`

Purpose:

- convert structured fraud data into a playable mission

Mission fields generated by the repo:

- simulation type
- sender
- message body
- clues
- difficulty
- tip
- simulation HTML
- variant number

Important implementation details:

- mission output is validated with Zod
- up to 3 variants can be generated
- clue text must match message body text
- non-English content is sanitized or replaced in some read paths
- rendered mission HTML is generated server-side

Mission rendering behavior:

- a simple HTML card is generated with a header and body
- simulation labels vary by type such as SMS, WhatsApp, email, or call transcript

Database behavior:

- generated missions are stored in `missions`
- active missions can be fetched by article, by random selection, or by mission ID
- old missions can be archived when force regeneration is used

#### 7.5 Content read layer for the frontend

Main files:

- `src/lib/server/classified-articles.ts`
- `src/lib/server/missions.ts`

Purpose:

- normalize database records for page rendering

What this layer currently does:

- reads classified articles for the homepage
- reads a single classified article for article detail pages
- reads active missions for gameplay
- builds fallback mission objects from article data when generated missions are missing
- sanitizes some non-English or unsafe display content before sending it to the UI

### 8. Frontend Experience

#### 8.1 Home page

Main files:

- `src/routes/+page.server.ts`
- `src/routes/+page.svelte`
- `src/lib/components/home/Hero.svelte`
- `src/lib/components/home/SwipeDeck.svelte`
- `src/lib/components/home/ThreatCard.svelte`
- `src/lib/components/home/TrainingDeck.svelte`
- `src/lib/components/home/MissionPanel.svelte`

What the home page currently does:

- loads recent classified articles
- chooses a featured article
- tries to load a related mission for that article
- shows a queue of scam cases
- links users into article detail pages and gameplay

#### 8.2 Global layout

Main file:

- `src/routes/+layout.svelte`

What it currently provides:

- app-wide navigation
- global fonts
- brand styling
- links to:
  - Home
  - Play
  - Profile

#### 8.3 Article detail pages

Main files:

- `src/routes/articles/[id]/+page.server.ts`
- `src/routes/articles/[id]/+page.svelte`

What they do:

- load a classified article by ID
- show extracted scam information from the article
- connect article content to generated mission content when available

#### 8.4 Play screen

Main files:

- `src/routes/play/+page.server.ts`
- `src/routes/play/+page.svelte`
- `src/lib/components/gameplay/GameplayEngine.svelte`
- `src/lib/gameplay/engine.ts`

What the play flow currently does:

- loads either a random mission or a mission tied to a selected article
- supports optional difficulty and fraud type filtering
- supports a fallback mission if no generated mission exists
- sends the mission into the gameplay engine

### 9. Gameplay System Report

The gameplay engine is one of the largest implemented pieces in the repo.

Main files:

- `src/lib/components/gameplay/GameplayEngine.svelte`
- `src/lib/gameplay/engine.ts`
- `src/lib/server/gameplay.ts`

#### 9.1 Gameplay rules implemented

- each mission lasts 60 seconds
- low-time threshold is 15 seconds
- player starts with 3 lives
- wrong actions consume lives
- lives regenerate over time
- the player first makes a `scam` or `safe` verdict
- after that, the player taps suspicious message phrases
- clue text is matched inside the message body and wrapped as interactive segments
- mission ends on:
  - success
  - timeout
  - failed

#### 9.2 XP calculation implemented

The code currently calculates:

- base XP
- speed bonus
- perfect multiplier
- streak multiplier

Current constants and rules in `src/lib/gameplay/engine.ts`:

- base XP starts at `100`
- speed bonus is based on remaining time
- perfect run multiplier is `2`
- streak multiplier is capped at `2`
- failed missions return `0` XP

#### 9.3 Lives system implemented

Current implementation:

- max lives: `3`
- one life regenerates every hour
- server-backed lives state exists
- client also shows countdown updates
- lives sync through `/api/lives`

#### 9.4 Result handling implemented

When a mission ends:

- a mission result summary is built locally
- attempt data is sent to `/api/missions/attempt`
- profile snapshot can be returned
- updated lives can be returned
- badge rewards can be returned
- rank-up info can be returned
- AI feedback request is triggered after the attempt save

### 10. Persistence, Progress, and Gamification

Main files:

- `src/lib/server/gameplay.ts`
- `src/lib/server/badge-engine.ts`
- `src/routes/api/missions/attempt/+server.ts`
- `src/routes/api/user/profile/+server.ts`
- `src/routes/profile/+page.server.ts`
- `src/routes/profile/+page.svelte`

What this subsystem currently does:

- validates mission attempts with Zod
- records attempts in `mission_attempts`
- records XP ledger rows in `xp_transactions`
- updates `user_stats`
- calculates rank from XP thresholds
- updates streak logic
- awards badges
- returns profile-like data after mission completion

Current rank thresholds in code:

- `Rookie Agent`
- `Field Investigator`
- `Senior Analyst`
- `Cyber Commander`

Current badge IDs in code:

- `speed_demon`
- `sharpshooter`
- `upi_guardian`
- `kyc_defender`
- `viral_protector`
- `week_warrior`
- `perfect_week`
- `mentor`
- `fraud_hunter`

Important note:

- not every badge has a fully wired front-to-back feature flow yet

### 11. AI Feedback Engine

Main files:

- `src/lib/server/feedback-engine.ts`
- `src/routes/api/feedback/generate/+server.ts`
- `src/lib/server/gemini.ts`
- `src/lib/server/openrouter.ts`
- `src/lib/server/ollama.ts`

Purpose:

- explain the missed scam clues after a mission

What it currently generates:

- `feedbackText`
- `patternIdentified`
- `actionableTip`
- `encouragement`

Important implementation details:

- output is schema-validated
- output is saved to `feedback_log`
- provider fallback exists
- language is intentionally kept simple in the prompt design

### 12. Duel / Challenge System

Main files:

- `src/routes/api/challenges/create/+server.ts`
- `src/routes/api/challenges/submit/+server.ts`
- `src/routes/api/challenges/[code]/+server.ts`
- `src/routes/duel/[code]/+page.server.ts`
- `src/routes/duel/[code]/+page.svelte`

What this subsystem currently does:

- creates a short challenge code
- stores challenger performance in `challenges`
- loads the same mission for the opponent
- accepts opponent result submission
- decides a winner based on:
  - higher XP first
  - lower time second

Current challenge statuses in code:

- `pending`
- `completed`

### 13. WhatsApp Backend Report

Main files:

- `src/routes/api/whatsapp/webhook/+server.ts`
- `src/lib/server/whatsapp/state-machine.ts`
- `src/lib/server/whatsapp/messenger.ts`

What this subsystem currently does:

- verifies webhook requests
- receives incoming WhatsApp messages
- starts a mission when user sends `start` or `play`
- stores session state in `whatsapp_sessions`
- fetches a random mission for the WhatsApp user
- allows simple clue matching through text replies
- handles quit/stop
- sends mission success or failure messages

Current WhatsApp state values in code and migrations:

- `IDLE`
- `IN_MISSION`
- `WAITING_FOR_FEEDBACK`

Important repo-backed limitation:

- this is a backend conversational path, not a full parallel product surface like the web app

### 14. Authentication and Request Protection

Main files:

- `src/lib/server/auth.ts`
- `src/routes/api/user/token/+server.ts`

Current implementation:

- guest-like player IDs are created in the frontend
- backend can sign a player token with HMAC-SHA256
- protected routes can verify the player token
- this is lightweight request protection, not full user auth

Important current reality:

- there is no full Google auth product flow in the route tree
- there is no full session/account system beyond this lightweight token flow

### 15. API Report

#### 15.1 Page routes

- `/`
- `/play`
- `/profile`
- `/articles/[id]`
- `/duel/[code]`

#### 15.2 Server/API routes

- `GET /api/cron/ingest`
- `GET /api/cron/classify`
- `GET /api/cron/generate-missions`
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
- `POST /generate-mission`

#### 15.3 Notes on route behavior

- cron routes require `x-cron-secret`
- lives update route requires token-based verification
- mission attempt route requires token-based verification
- mission random route is public
- generate mission route is a non-`/api` server endpoint

### 16. Database Report

The repo uses Supabase and includes the following migration files:

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

Main tables used by current code:

- `fraud_articles`
- `ingestion_runs`
- `classification_runs`
- `missions`
- `mission_attempts`
- `xp_transactions`
- `user_stats`
- `user_badges`
- `feedback_log`
- `whatsapp_sessions`
- `challenges`

Referral-related tables exist in migrations:

- `referral_links`
- `referral_claims`

Important note:

- referral database support exists, but matching app routes are not present in the current `src/routes`

### 17. Environment Variables Report

#### Required for core backend

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `API_SECRET`

#### Required for ingestion

- `NEWSAPI_KEY`

#### Gemini variables

- `GEMINI_API_KEY`
- `GEMINI_CLASSIFIER_MODEL`
- `GEMINI_MISSION_MODEL`
- `GEMINI_FEEDBACK_MODEL`

#### Groq variables

- `GROQ_API_KEY`

#### OpenRouter variables

- `OPENROUTER_API_KEY`
- `OPENROUTER_API_KEY_2`
- `OPENROUTER_API_KEY_3`
- `OPENROUTER_CLASSIFIER_MODELS`
- `OPENROUTER_MISSION_MODELS`
- `OPENROUTER_FEEDBACK_MODELS`

#### Ollama variables

- `OLLAMA_BASE_URL`
- `OLLAMA_CLASSIFIER_MODEL`
- `OLLAMA_MISSION_MODEL`
- `OLLAMA_FEEDBACK_MODEL`

#### Optional variables

- `PHASE1_CATEGORY_MODEL_PATH`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

### 18. Cron and Operations Report

Current `vercel.json` schedules:

- `/api/cron/ingest` at `0 6 * * *`
- `/api/cron/classify` at `0 7 * * *`
- `/api/cron/generate-missions` at `0 8 * * *`

Operational notes from code:

- ingestion route has an in-memory overlap guard
- cron routes expect `x-cron-secret`
- generation route supports a `force` query parameter for regeneration

### 19. Scripts Report

Main scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run prepare`
- `npm run check`
- `npm run check:watch`

Phase 1 and evaluation scripts:

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

Script files currently present in `scripts/`:

- `build-phase1-category-dataset.mjs`
- `build-phase1-relevance-dataset.mjs`
- `check-table.mjs`
- `estimate-phase1-gated-accuracy.mjs`
- `evaluate-phase1-accuracy.mjs`
- `evaluate-phase1-relevance-model.mjs`
- `export-phase1-eval-sample.mjs`
- `export-phase1-weak-label-candidates.mjs`
- `review-phase1-sample.mjs`
- `run-migration.mjs`
- `run-phase1-cron.mjs`
- `test-endpoints.mjs`
- `test-phase2.mjs`
- `train-phase1-ml-model.mjs`
- `train-phase1-relevance-model.mjs`
- `verify-phase1-live.mjs`

### 20. File and Module Layout

```text
src/
  app.d.ts
  app.html
  lib/
    assets/
    components/
      gameplay/
      home/
    gameplay/
    server/
      whatsapp/
    types/
  routes/
    api/
    articles/
    duel/
    play/
    profile/

docs/
scripts/
supabase/migrations/
static/
```

### 21. Setup and Run

1. Install packages

```sh
npm install
```

2. Copy the env template

```sh
copy .env.example .env
```

3. Fill in the environment variables

4. Run the app

```sh
npm run dev
```

Useful checks:

```sh
npm run check
npm run build
```

### 22. Known Gaps and Missing Pieces

Based on the current repo, these are the main gaps:

- no full Google auth flow in the current route tree
- referral feature is only partially present through SQL migrations
- WhatsApp flow is backend-first and simpler than the web flow
- status docs and SRS describe a broader target product than what the current routes expose
- some badges are defined ahead of their full feature support

### 23. Practical Status Summary

If this repo is viewed as a project report, the correct summary is:

ShieldByte already has a working fraud-content pipeline, a working mission generation pipeline, a playable web mission loop, progression tracking, profile pages, AI feedback, and a duel challenge mode. It also has backend WhatsApp handling and migration-level support for referral-style growth features. The biggest missing parts are full auth/account flows, referral route wiring, and a more complete WhatsApp product surface.
