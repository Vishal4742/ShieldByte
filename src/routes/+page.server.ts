import type { PageServerLoad } from './$types';
import { fetchRecentClassifiedArticles } from '$lib/server/classified-articles.js';

export const load: PageServerLoad = async () => {
	const articles = await fetchRecentClassifiedArticles(6);

	return {
		articles
	};
};
