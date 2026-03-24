import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	GenerateFeedbackRequestSchema,
	generateFeedback
} from '$lib/server/feedback-engine.js';

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON.');
	}

	const parsed = GenerateFeedbackRequestSchema.safeParse(payload);

	if (!parsed.success) {
		error(400, parsed.error.issues[0]?.message ?? 'Invalid feedback request payload.');
	}

	try {
		const feedback = await generateFeedback({
			userId: parsed.data.user_id,
			missionId: parsed.data.mission_id,
			attemptId: parsed.data.attempt_id,
			fraudType: parsed.data.fraud_type,
			cluesFound: parsed.data.clues_found,
			cluesMissed: parsed.data.clues_missed,
			timeTaken: parsed.data.time_taken,
			livesRemaining: parsed.data.lives_remaining
		});

		return json({
			success: true,
			feedback
		});
	} catch (err) {
		console.error('[feedback/generate] Failed to generate feedback:', err);
		error(500, 'Failed to generate AI feedback.');
	}
};
