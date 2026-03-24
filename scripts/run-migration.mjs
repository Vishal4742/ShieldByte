/**
 * Run the SQL migration against Supabase.
 * Usage: node --env-file=.env scripts/run-migration.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS fraud_articles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source        TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  url           TEXT UNIQUE NOT NULL,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),
  category      TEXT CHECK (category IN (
                  'UPI_fraud',
                  'KYC_fraud',
                  'lottery_fraud',
                  'job_scam',
                  'investment_fraud',
                  'customer_support_scam'
                )),
  classification_confidence REAL,
  raw_extraction JSONB,
  status        TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'classified', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_fraud_articles_status ON fraud_articles (status);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_url ON fraud_articles (url);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_category ON fraud_articles (category);

ALTER TABLE fraud_articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role has full access' AND tablename = 'fraud_articles') THEN
    CREATE POLICY "Service role has full access" ON fraud_articles FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read classified articles' AND tablename = 'fraud_articles') THEN
    CREATE POLICY "Public can read classified articles" ON fraud_articles FOR SELECT TO anon USING (status = 'classified');
  END IF;
END $$;
`;

async function runMigration() {
  console.log('Running migration against:', SUPABASE_URL);

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({})
  });

  // The REST API doesn't support raw SQL. Use the SQL endpoint instead.
  const sqlResponse = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!sqlResponse.ok) {
    // Try the management API SQL endpoint
    const mgmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    const tables = await mgmtResponse.text();
    
    if (tables.includes('fraud_articles')) {
      console.log('✅ Table fraud_articles already exists!');
      return;
    }
    
    console.log('⚠️  Could not run SQL via API. Please run the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard → your project → SQL Editor');
    console.log('2. Paste the contents of supabase/migrations/001_create_articles_table.sql');
    console.log('3. Click Run');
    console.log('\nChecking if table exists via REST API...');
    console.log('REST API response:', tables.substring(0, 200));
    return;
  }

  console.log('✅ Migration completed successfully!');
}

runMigration().catch(console.error);
