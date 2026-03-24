import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	MissionGenerationRequestSchema,
	generateMissionsFromFraudData
} from '$lib/server/mission-generator.js';

export const POST: RequestHandler = async ({ request }) => {
	let payload: unknown;

	try {
		payload = await request.json();
	} catch {
		error(400, 'Request body must be valid JSON.');
	}

	const parsed = MissionGenerationRequestSchema.safeParse(payload);

	if (!parsed.success) {
		error(400, parsed.error.issues[0]?.message ?? 'Invalid mission generation payload.');
	}

	try {
		const result = await generateMissionsFromFraudData(parsed.data);

		return json({
			success: true,
			generated: result.generated,
			failed: result.failed,
			missions: result.missions
		});
	} catch (err) {
		console.error('[generate-mission] Generation failed:', err);
		error(500, 'Mission generation failed.');
	}
};
