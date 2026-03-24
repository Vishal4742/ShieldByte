/**
 * ShieldByte — Cron: Classify Articles
 * GET /api/cron/classify
 *
 * Picks up all 'raw' articles from the DB and runs AI classification
 * using Groq (Llama 3) to assign fraud categories and extract clues.
 *
 * Protected by CRON_SECRET header check.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CRON_SECRET } from '$env/static/private';
import { runClassificationPipeline } from '$lib/server/ai-classifier';

export const GET: RequestHandler = async ({ request }) => {
	// Verify cron secret
	const authHeader = request.headers.get('x-cron-secret');
	if (authHeader !== CRON_SECRET) {
		error(401, 'Unauthorized');
	}

	try {
		const result = await runClassificationPipeline();

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			...result
		});
	} catch (err) {
		console.error('[cron/classify] Pipeline failed:', err);
		error(500, 'Classification pipeline failed');
	}
};
