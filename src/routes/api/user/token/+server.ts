/**
 * ShieldByte — Player Token Endpoint
 * POST /api/user/token
 *
 * Generates an HMAC token for a player ID. The client calls this
 * once on initialization and stores the token for subsequent API calls.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePlayerToken } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON.');
	}

	const body = payload as { user_id?: string };

	if (!body.user_id || typeof body.user_id !== 'string' || body.user_id.trim().length === 0) {
		error(400, 'Missing or invalid user_id.');
	}

	try {
		const token = await generatePlayerToken(body.user_id);
		return json({ token });
	} catch (err) {
		console.error('[api/user/token] Token generation failed:', err);
		error(500, 'Failed to generate player token.');
	}
};
