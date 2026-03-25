import type { PageServerLoad } from './$types';
import { fetchMissionForArticle, fetchRandomActiveMission } from '$lib/server/missions.js';

export const load: PageServerLoad = async ({ url }) => {
	const difficulty = url.searchParams.get('difficulty');
	const fraudType = url.searchParams.get('type');
	const articleId = Number.parseInt(url.searchParams.get('article') ?? '', 10);
	const streakDays = Math.max(0, Number.parseInt(url.searchParams.get('streak') ?? '0', 10) || 0);
	const requestedArticleId = Number.isFinite(articleId) ? articleId : null;
	const mission = requestedArticleId
		? await fetchMissionForArticle(requestedArticleId)
		: await fetchRandomActiveMission({ difficulty, fraudType });

	return {
		mission,
		streakDays,
		selectionMode: requestedArticleId ? 'swipe_deck' : 'random_queue',
		requestedArticleId,
		requestedFraudType: fraudType
	};
};
