import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchClassifiedArticleById } from '$lib/server/classified-articles.js';

export const load: PageServerLoad = async ({ params }) => {
	const articleId = Number(params.id);

	if (!Number.isInteger(articleId) || articleId < 1) {
		throw error(404, 'Article not found');
	}

	const article = await fetchClassifiedArticleById(articleId);

	if (!article) {
		throw error(404, 'Classified article not found');
	}

	return {
		article
	};
};
