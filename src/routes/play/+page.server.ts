import type { PageServerLoad } from './$types';
import { fetchMissionForArticle, fetchRandomActiveMission, buildFallbackMissionFromArticle } from '$lib/server/missions.js';
import { fetchClassifiedArticleById, fetchRecentClassifiedArticles } from '$lib/server/classified-articles.js';

export const load: PageServerLoad = async ({ url }) => {
	const difficulty = url.searchParams.get('difficulty');
	const fraudType = url.searchParams.get('type');
	const articleId = Number.parseInt(url.searchParams.get('article') ?? '', 10);
	const streakDays = Math.max(0, Number.parseInt(url.searchParams.get('streak') ?? '0', 10) || 0);
	const requestedArticleId = Number.isFinite(articleId) ? articleId : null;
	let mission = requestedArticleId
		? await fetchMissionForArticle(requestedArticleId)
		: await fetchRandomActiveMission({ difficulty, fraudType });

	if (!mission && requestedArticleId) {
		const article = await fetchClassifiedArticleById(requestedArticleId);
		if (article) {
			mission = buildFallbackMissionFromArticle(article);
		}
	}

	if (!mission) {
		const articles = await fetchRecentClassifiedArticles(12);
		const fallbackArticle =
			articles.find((article) => !fraudType || article.category === fraudType) ?? articles[0] ?? null;

		if (fallbackArticle) {
			mission = buildFallbackMissionFromArticle(fallbackArticle);
		}
	}

	return {
		mission,
		streakDays,
		selectionMode: requestedArticleId ? 'swipe_deck' : 'random_queue',
		requestedArticleId,
		requestedFraudType: fraudType
	};
};
