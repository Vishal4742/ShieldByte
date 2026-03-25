import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrInitLives, updateServerLives } from '$lib/server/gameplay.js';
import { authenticateRequest } from '$lib/server/auth.js';

export const GET: RequestHandler = async ({ url }) => {
	const userId = url.searchParams.get('user_id');

	if (!userId || userId.trim().length === 0) {
		error(400, 'Missing user_id query parameter.');
	}

	try {
		const lives = await getOrInitLives(userId);

		return json({
			lives: lives.lives,
			lastUpdatedAt: lives.lastUpdatedAt,
			nextLifeInMs: lives.nextLifeInMs
		});
	} catch (err) {
		console.error('[api/lives] Failed to get lives:', err);
		error(500, 'Failed to retrieve lives state.');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON.');
	}

	const body = payload as { user_id?: string; lives_remaining?: number };

	if (!body.user_id || typeof body.user_id !== 'string' || body.user_id.trim().length === 0) {
		error(400, 'Missing or invalid user_id.');
	}

	const auth = await authenticateRequest(request, body.user_id);
	if ('error' in auth) {
		error(401, auth.error);
	}

	if (typeof body.lives_remaining !== 'number' || body.lives_remaining < 0 || body.lives_remaining > 3) {
		error(400, 'lives_remaining must be a number between 0 and 3.');
	}

	try {
		// Verify client can only decrement lives, not increase them
		const currentLives = await getOrInitLives(body.user_id);
		if (body.lives_remaining > currentLives.lives) {
			error(403, 'Cannot increase lives via API. Lives only regenerate over time.');
		}

		const result = await updateServerLives(body.user_id, body.lives_remaining);

		return json({
			lives: result.lives,
			lastUpdatedAt: result.lastUpdatedAt,
			nextLifeInMs: result.nextLifeInMs
		});
	} catch (err) {
		console.error('[api/lives] Failed to update lives:', err);
		error(500, 'Failed to update lives state.');
	}
};
