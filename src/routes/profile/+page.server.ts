import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';
import { BADGE_DEFINITIONS } from '$lib/server/badge-engine.js';

export const load: PageServerLoad = async ({ url }) => {
	const userId = url.searchParams.get('user_id');

	// Default empty profile for guests
	const emptyProfile = {
		stats: { total_xp: 0, rank: 'Rookie Agent', streak_days: 0, last_mission_at: null, missions_completed: 0 },
		badges: BADGE_DEFINITIONS.map((b) => ({
			id: b.id,
			name: b.name,
			description: b.description,
			category: b.category,
			earned: false,
			earnedAt: null as string | null
		})),
		recentAttempts: []
	};

	if (!userId) {
		// Try localStorage in the browser via client-side fetch. For SSR, return empty.
		return { profile: emptyProfile, userId: null };
	}

	try {
		// 1. Fetch user stats
		const { data: stats } = await supabase
			.from('user_stats')
			.select('total_xp, rank, streak_days, last_mission_at')
			.eq('user_id', userId)
			.maybeSingle();

		// 2. Fetch earned badges
		const { data: userBadges } = await supabase
			.from('user_badges')
			.select('badge_id, earned_at')
			.eq('user_id', userId);

		const earnedMap = new Map(
			(userBadges ?? []).map((b: { badge_id: string; earned_at: string }) => [b.badge_id, b.earned_at])
		);

		const badges = BADGE_DEFINITIONS.map((b) => ({
			id: b.id,
			name: b.name,
			description: b.description,
			category: b.category,
			earned: earnedMap.has(b.id),
			earnedAt: earnedMap.get(b.id) ?? null
		}));

		const { count: missionCount } = await supabase
			.from('mission_attempts')
			.select('*', { count: 'exact', head: true })
			.eq('user_id', userId);

		// 3. Recent mission attempts
		const { data: attempts } = await supabase
			.from('mission_attempts')
			.select('id, mission_id, outcome, judgment_choice, judgment_correct, xp_earned, wrong_taps, time_taken, clues_found, clues_missed, completed_at')
			.eq('user_id', userId)
			.order('completed_at', { ascending: false })
			.limit(20);

		return {
			profile: {
				stats: {
					...emptyProfile.stats,
					...(stats ?? {}),
					missions_completed: missionCount ?? 0
				},
				badges,
				recentAttempts: attempts ?? []
			},
			userId
		};
	} catch (error) {
		console.error('[Profile] Error loading profile:', error);
		return { profile: emptyProfile, userId };
	}
};
