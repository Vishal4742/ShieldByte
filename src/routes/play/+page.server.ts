import type { PageServerLoad } from './$types';
import { fetchRandomActiveMission } from '$lib/server/missions.js';

export const load: PageServerLoad = async ({ url }) => {
	const difficulty = url.searchParams.get('difficulty');
	const fraudType = url.searchParams.get('type');
	const streakDays = Math.max(0, Number.parseInt(url.searchParams.get('streak') ?? '0', 10) || 0);
	const mission = await fetchRandomActiveMission({ difficulty, fraudType });

	return {
		mission,
		streakDays
	};
};
