/**
 * Test Phase 2: Mission Generation Pipeline
 * Usage: node --env-file=.env scripts/test-phase2.mjs
 */

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = 'http://localhost:5173';

async function testEndpoint(path, name, method = 'GET') {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Testing: ${name} (${method} ${path})`);
  console.log('═'.repeat(60));

  try {
    const headers = {};
    if (path.includes('cron')) {
      headers['x-cron-secret'] = CRON_SECRET;
    }

    const response = await fetch(`${BASE_URL}${path}`, { method, headers });
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { status: response.status, data };
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('ShieldByte — Phase 2 Pipeline Test\n');

  // Test 1: Generate missions from classified articles
  console.log('⏳ Generating missions (this takes ~2-3 minutes for 3 variants per article)...');
  const genResult = await testEndpoint('/api/cron/generate-missions', 'Mission Generation');
  
  if (genResult?.data?.generated > 0) {
    console.log(`\n🎉 Generated ${genResult.data.generated} mission variants!`);
  }

  // Test 2: Get a random mission (Phase 3 preview)
  console.log('\n⏳ Fetching a random mission...');
  const missionResult = await testEndpoint('/api/missions/random', 'Random Mission');
  
  if (missionResult?.status === 200) {
    console.log('\n🎮 Sample Mission Preview:');
    console.log(`   Type: ${missionResult.data.simulation_type}`);
    console.log(`   Sender: ${missionResult.data.sender}`);
    console.log(`   Difficulty: ${missionResult.data.difficulty}`);
    console.log(`   Clues: ${missionResult.data.clue_count}`);
    console.log(`   Message: ${missionResult.data.message_body?.substring(0, 100)}...`);
  }
}

main().catch(console.error);
