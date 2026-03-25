import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MissionAttemptSchema, recordMissionAttempt } from '$lib/server/gameplay.js';
import { authenticateRequest } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON.');
	}

	const parsed = MissionAttemptSchema.safeParse(payload);

	if (!parsed.success) {
		error(400, parsed.error.issues[0]?.message ?? 'Invalid mission attempt payload.');
	}

	const auth = await authenticateRequest(request, parsed.data.user_id);
	if ('error' in auth) {
		error(401, auth.error);
	}

	try {
		const result = await recordMissionAttempt(parsed.data);

		return json({
			success: true,
			attempt_id: result.attemptId,
			profile: result.profile,
			lives: result.lives,
			new_badges: result.newBadges,
			rank_up: result.rankUp
		});
	} catch (err) {
		console.error('[missions/attempt] Failed to record mission attempt:', err);
		error(500, 'Failed to record mission attempt.');
	}
};
