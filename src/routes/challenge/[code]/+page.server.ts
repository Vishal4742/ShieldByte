import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';
import { fetchMissionById } from '$lib/server/missions.js';

export const load: PageServerLoad = async ({ params }) => {
	const code = params.code;

	// 1. Fetch referral link to get the referrer and mission id
	const { data: link } = await supabase
		.from('referral_links')
		.select('mission_id, user_id')
		.eq('code', code)
		.single();

	if (!link) {
		throw error(404, 'Challenge link not found or expired.');
	}

	// 2. Fetch the referrer's generic profile to say "User X challenged you"
	// We'll just show their ID or wait, auth.users doesn't expose names usually, 
	// unless we check user_stats. We'll say "A friend" for simplicity or show their rank.
	const { data: referrerStats } = await supabase
		.from('user_stats')
		.select('rank')
		.eq('user_id', link.user_id)
		.maybeSingle();

	const referrerName = referrerStats ? referrerStats.rank : 'An Agent';

	// 3. Fetch the mission
	const mission = await fetchMissionById(link.mission_id);
	if (!mission) {
		throw error(404, 'Mission data unavailable.');
	}

	// 4. To claim the referral, the recruit needs to be logged in, or we do it when they finish?
	// ACTUALLY: Let's do a trick! They play the mission. When GameplayEngine finishes, 
	// it POSTs to `/api/missions/attempt`. If they win/lose, it returns attempt data.
	// But `recordMissionAttempt` requires auth.
	// We'll pass `referralCode` to the frontend, and let the frontend POST to `/api/referrals/claim` 
	// after they login or finish. Wait, the frontend requires the user to be logged in to play?
	// The web app uses a Guest ID if not logged in.
	
	const { data: { session } } = await supabase.auth.getSession();
	const recruitId = session?.user?.id;

	return {
		code,
		mission,
		referrerName,
		recruitId
	};
};
