import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';
import { fetchMissionById } from '$lib/server/missions.js';
import {
	getChallengesUnavailableMessage,
	isMissingChallengesTableError
} from '$lib/server/challenge-service.js';

export const load: PageServerLoad = async ({ params }) => {
	const code = params.code;

	// 1. Fetch challenge data
	const { data: challenge, error: challengeError } = await supabase
		.from('challenges')
		.select('*')
		.eq('code', code)
		.single();

	if (challengeError) {
		if (isMissingChallengesTableError(challengeError)) {
			throw error(503, getChallengesUnavailableMessage());
		}
		throw error(500, 'Failed to load challenge.');
	}

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
