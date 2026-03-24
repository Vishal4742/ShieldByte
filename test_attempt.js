async function test() {
  const req = await fetch('http://localhost:5173/api/missions/attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'test-gamification-user',
      mission_id: 1, // Must be int
      xp_earned: 500,
      base_xp: 300,
      speed_bonus: 200,
      perfect_multiplier: 1,
      streak_multiplier: 1,
      clues_found: 3,
      clues_missed: 0,
      lives_remaining: 3,
      wrong_taps: 0,
      time_taken: 15, // Must be int <= 60
      seconds_remaining: 45, // Must be int <= 60
      outcome: 'success',
      fraud_type: 'Bank KYC' // this isn't in Zod schema actually...
    })
  });
  const res = await req.json();
  console.log(JSON.stringify(res, null, 2));

  // Now test profile endpoint
  const profileReq = await fetch('http://localhost:5173/api/user/profile?user_id=test-gamification-user');
  const profileRes = await profileReq.json();
  console.log('\n--- PROFILE ---');
  console.log(JSON.stringify(profileRes, null, 2));
}

test().catch(console.error);
