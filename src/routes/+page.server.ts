import type { PageServerLoad } from './$types';
import { fetchRecentClassifiedArticles } from '$lib/server/classified-articles.js';
import { fetchMissionForArticle } from '$lib/server/missions.js';

export const load: PageServerLoad = async () => {
	const articles = await fetchRecentClassifiedArticles(6);
	const featuredArticle = articles[0] ?? null;
	const featuredMission = featuredArticle ? await fetchMissionForArticle(featuredArticle.id) : null;

	return {
		articles,
		featuredArticle,
		featuredMission
	};
};
