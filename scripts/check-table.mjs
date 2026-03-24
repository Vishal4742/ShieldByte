/**
 * Check if the fraud_articles table exists by trying to query it.
 * If it doesn't exist, instruct the user to run the migration.
 * Usage: node --env-file=.env scripts/check-table.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkTable() {
  console.log('Checking if fraud_articles table exists...\n');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/fraud_articles?select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log('✅ Table fraud_articles EXISTS!');
    console.log(`   Current rows: ${data.length === 0 ? '0 (empty)' : data.length + '+'}`);
    return true;
  } else {
    const error = await response.json();
    console.log('❌ Table fraud_articles does NOT exist.');
    console.log(`   Error: ${error.message || JSON.stringify(error)}`);
    console.log('\n📋 Please run the migration manually:');
    console.log('   1. Go to: https://supabase.com/dashboard → your project → SQL Editor');
    console.log('   2. Click "New Query"');
    console.log('   3. Paste contents of: supabase/migrations/001_create_articles_table.sql');
    console.log('   4. Click "Run"');
    return false;
  }
}

checkTable().catch(console.error);
