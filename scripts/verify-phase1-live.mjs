/**
 * Verify the live Supabase project has the required Phase 1 schema and data paths.
 * Usage:
 *   node --env-file=.env scripts/verify-phase1-live.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

async function query(path) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

async function checkFraudArticlesColumns() {
  const checks = [
    ['base table', '/rest/v1/fraud_articles?select=id,status,category&limit=1'],
    ['phase1 metadata columns', '/rest/v1/fraud_articles?select=category_hint,relevance_score,matched_keywords,ingestion_source_type&limit=1'],
    ['phase1 classification columns', '/rest/v1/fraud_articles?select=classification_method,classification_model,review_status,last_error&limit=1'],
    ['phase1 retry columns', '/rest/v1/fraud_articles?select=retry_count,failed_at&limit=1']
  ];

  const results = [];
  for (const [label, path] of checks) {
    const result = await query(path);
    results.push({ label, ...result });
  }

  return results;
}

async function checkRunTables() {
  const checks = [
    ['ingestion_runs', '/rest/v1/ingestion_runs?select=id,ran_at&limit=1'],
    ['classification_runs', '/rest/v1/classification_runs?select=id,ran_at&limit=1']
  ];

  const results = [];
  for (const [label, path] of checks) {
    const result = await query(path);
    results.push({ label, ...result });
  }

  return results;
}

function printResult(result) {
  console.log(`- ${result.label}: ${result.ok ? 'ok' : 'missing'} (HTTP ${result.status})`);
  if (!result.ok) {
    console.log(`  ${result.text.slice(0, 200)}`);
  }
}

async function main() {
  console.log('Checking live Phase 1 schema and run tables...\n');

  const fraudArticleChecks = await checkFraudArticlesColumns();
  const runTableChecks = await checkRunTables();

  console.log('fraud_articles checks:');
  fraudArticleChecks.forEach(printResult);

  console.log('\nrun table checks:');
  runTableChecks.forEach(printResult);

  const allOk = [...fraudArticleChecks, ...runTableChecks].every((entry) => entry.ok);
  console.log(`\nPhase 1 live schema ready: ${allOk ? 'yes' : 'no'}`);

  if (!allOk) {
    console.log('\nApply the bundled SQL file in Supabase SQL Editor:');
    console.log('  supabase/migrations/phase1_finalize.sql');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
