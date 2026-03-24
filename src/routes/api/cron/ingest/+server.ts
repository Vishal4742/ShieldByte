/**
 * ShieldByte — Cron: Ingest Fraud News
 * GET /api/cron/ingest
 *
 * Fetches fraud-related articles from NewsAPI + RSS feeds,
 * deduplicates, and stores them in Supabase.
 *
 * Protected by CRON_SECRET header check.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CRON_SECRET } from '$env/static/private';
import { runIngestionPipeline } from '$lib/server/news-ingestion';

export const GET: RequestHandler = async ({ request }) => {
	// Verify cron secret
	const authHeader = request.headers.get('x-cron-secret');
	if (authHeader !== CRON_SECRET) {
		error(401, 'Unauthorized');
	}

	try {
		const result = await runIngestionPipeline();

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			...result
		});
	} catch (err) {
		console.error('[cron/ingest] Pipeline failed:', err);
		error(500, 'Ingestion pipeline failed');
	}
};
