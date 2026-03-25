import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { RequestEvent } from './$types';

export async function GET({ url }: RequestEvent) {
	const userId = url.searchParams.get('user_id');

	if (!userId) {
		return json({ error: 'Missing user_id parameter' }, { status: 400 });
	}

	try {
		// 1. Fetch user stats
		const { data: stats, error: statsError } = await supabase
			.from('user_stats')
			.select('*')
			.eq('user_id', userId)
			.maybeSingle();

		if (statsError) throw statsError;

		// 2. Fetch earned badges
		const { data: badgesData, error: badgesError } = await supabase
			.from('user_badges')
			.select('*')
			.eq('user_id', userId)
			.order('earned_at', { ascending: false });

		if (badgesError) throw badgesError;

		// 3. Fetch recent mission attempts
		const { data: recentAttempts, error: attemptsError } = await supabase
			.from('mission_attempts')
			.select('mission_id, outcome, xp_earned, wrong_taps, time_taken, completed_at')
			.eq('user_id', userId)
			.order('completed_at', { ascending: false })
			.limit(10);

		if (attemptsError) throw attemptsError;

		return json({
			profile: {
				stats: stats || {
					user_id: userId,
					total_xp: 0,
					rank: 'Rookie Agent',
					streak_days: 0,
					last_mission_at: null
				},
				badges: badgesData || [],
				recent_attempts:
					recentAttempts?.map((attempt) => ({
						mission_id: attempt.mission_id,
						status: attempt.outcome,
						xp_earned: attempt.xp_earned,
						wrong_taps: attempt.wrong_taps,
						time_taken: attempt.time_taken,
						created_at: attempt.completed_at
					})) || []
			}
		});
	} catch (error) {
		console.error('[Profile API] Error fetching profile:', error);
		return json({ error: 'Failed to fetch user profile' }, { status: 500 });
	}
}
