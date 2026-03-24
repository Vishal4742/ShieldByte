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

## Phase 1 Deployment

Apply these Supabase migrations in order:

1. `supabase/migrations/001_create_articles_table.sql`
2. `supabase/migrations/002_create_missions_table.sql`
3. `supabase/migrations/003_harden_phase1_pipeline.sql`
4. `supabase/migrations/004_phase1_observability_and_retries.sql`

If the live database is still on the old schema, you can instead run the bundled finalization file once:

- `supabase/migrations/phase1_finalize.sql`

Phase 2 schema follow-up:

- `supabase/migrations/005_add_simulation_html_to_missions.sql`

After the migrations are applied, Phase 1 is operational through the configured Vercel cron jobs in `vercel.json`:

- `/api/cron/ingest`
- `/api/cron/classify`

Minimum production validation for Phase 1:

```sql
select count(*) from ingestion_runs order by ran_at desc;
select count(*) from classification_runs order by ran_at desc;
select id, status, category, classification_confidence, classification_method, review_status, retry_count from fraud_articles order by id desc limit 20;
```

Success criteria to verify against the SRS:

- each daily ingestion run inserts at least 5 new relevant articles
- classified articles receive structured output with 3-6 clues
- low-confidence or heuristic classifications land in `needs_review`
- articles only move to `failed` after 3 unsuccessful classification attempts

## Phase 1 Accuracy Evaluation

The SRS target of `>85% classification accuracy` must be measured against labeled examples. Use the local workflow below:

```sh
npm run eval:phase1:export -- 25
```

This writes a review file under `tmp/phase1-eval-sample-*.json`. For each record:

- fill `review.actual_category` with the true category
- optionally set `review.is_prediction_correct`
- optionally add `review.reviewer_notes`

Then score the labeled file:

```sh
npm run eval:phase1:score -- tmp/phase1-eval-sample-YYYY-MM-DDTHH-MM-SS-sssZ.json
```

The evaluator reports:

- overall accuracy
- whether the `>85%` SRS target was met
- per-category accuracy
- a confusion summary
- auto-approved accuracy for the highest-confidence subset

You can verify whether the live Supabase project is on the required Phase 1 schema with:

```sh
npm run verify:phase1:live
```

## Phase 2 Mission Generation

The repo supports both scheduled generation and direct generation from classified fraud JSON.

- Scheduled pipeline: `GET /api/cron/generate-missions`
- Direct endpoint: `POST /generate-mission`

Example payload for `POST /generate-mission`:

```json
{
  "fraudData": {
    "fraud_type": "UPI_fraud",
    "channel": "SMS",
    "scenario_summary": "Scammers send a refund pretext and trick the victim into approving a collect request.",
    "victim_profile": "Digital payment users who act quickly under pressure.",
    "clues": [
      {
        "clue_text": "refund collect request",
        "type": "credential_request",
        "explanation": "The victim is being tricked into approving an outgoing payment."
      },
      {
        "clue_text": "act in 5 minutes",
        "type": "urgency",
        "explanation": "Urgency is used to reduce verification."
      },
      {
        "clue_text": "unknown support number",
        "type": "unknown_sender",
        "explanation": "The sender cannot be independently verified."
      }
    ],
    "red_flags": [
      "Unexpected refund request",
      "Pressure to act immediately",
      "Unverified sender identity"
    ],
    "tip": "Never approve a payment request to receive money."
  },
  "variantCount": 3,
  "persist": true
}
```

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
