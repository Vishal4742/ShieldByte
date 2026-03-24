/**
 * Test the cron endpoints locally.
 * Usage: node --env-file=.env scripts/test-endpoints.mjs
 */

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = 'http://localhost:5173';

async function testEndpoint(path, name) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Testing: ${name} (${path})`);
  console.log('═'.repeat(50));

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'x-cron-secret': CRON_SECRET
      }
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('ShieldByte — Phase 1 Pipeline Test');
  console.log(`CRON_SECRET: ${CRON_SECRET ? '✅ set' : '❌ missing'}`);

  // Test 1: Ingest
  const ingestResult = await testEndpoint('/api/cron/ingest', 'News Ingestion');
  
  if (ingestResult?.inserted > 0) {
    console.log(`\n🎉 Ingested ${ingestResult.inserted} articles!`);
    
    // Test 2: Classify (only if we have new articles)
    console.log('\nWaiting 3s before classification...');
    await new Promise(r => setTimeout(r, 3000));
    
    const classifyResult = await testEndpoint('/api/cron/classify', 'AI Classification');
    
    if (classifyResult) {
      console.log(`\n🎉 Classified ${classifyResult.classified} articles!`);
    }
  } else {
    console.log('\n⚠️  No new articles ingested. This could mean:');
    console.log('   - NewsAPI key is invalid or rate-limited');
    console.log('   - All articles were duplicates');
    console.log('   - Network issues with news sources');
    
    // Still try classify in case there are raw articles from a previous run
    const classifyResult = await testEndpoint('/api/cron/classify', 'AI Classification');
  }
}

main().catch(console.error);
