import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';
import { fetchMissionById } from '$lib/server/missions.js';

export const load: PageServerLoad = async ({ params }) => {
	const code = params.code;

	// 1. Fetch challenge data
	const { data: challenge } = await supabase
		.from('challenges')
		.select('*')
		.eq('code', code)
		.single();

	if (!challenge) {
		throw error(404, 'Challenge not found or expired.');
	}

	// 2. Fetch the mission
	const mission = await fetchMissionById(challenge.mission_id);
	if (!mission) {
		throw error(404, 'Mission data unavailable.');
	}

	// 3. Fetch challenger rank
	const { data: challengerStats } = await supabase
		.from('user_stats')
		.select('rank')
		.eq('user_id', challenge.challenger_id)
		.maybeSingle();

	return {
		code,
		challenge,
		mission,
		challengerRank: challengerStats?.rank ?? 'Rookie Agent'
	};
};
