/**
 * ShieldByte — Mission Generation Cron Endpoint
 * Generates playable scam simulation missions from classified articles.
 * Protected by CRON_SECRET header.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CRON_SECRET } from '$env/static/private';
import { runMissionGenerationPipeline } from '$lib/server/mission-generator.js';

export const GET: RequestHandler = async ({ request }) => {
	// Auth check
	const secret = request.headers.get('x-cron-secret');
	if (secret !== CRON_SECRET) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const requestUrl = new URL(request.url);
		const forceRegenerate = ['1', 'true', 'yes'].includes(
			requestUrl.searchParams.get('force')?.toLowerCase() ?? ''
		);
		const result = await runMissionGenerationPipeline({ forceRegenerate });

		return json({
			success: true,
			forceRegenerate,
			...result,
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('[cron/generate-missions] Pipeline error:', err);
		return json(
			{ error: 'Mission generation failed', details: String(err) },
			{ status: 500 }
		);
	}
};
