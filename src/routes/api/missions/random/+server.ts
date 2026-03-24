/**
 * ShieldByte - Random Mission Endpoint
 * Returns a random active mission for gameplay.
 * Public endpoint (no auth required).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchRandomActiveMission } from '$lib/server/missions.js';
import { FRAUD_CATEGORIES } from '$lib/server/constants.js';

const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const GET: RequestHandler = async ({ url }) => {
	const difficulty = url.searchParams.get('difficulty');
	const fraudType = url.searchParams.get('type');

	if (
		difficulty &&
		!ALLOWED_DIFFICULTIES.includes(difficulty as (typeof ALLOWED_DIFFICULTIES)[number])
	) {
		return json({ error: 'Invalid difficulty filter' }, { status: 400 });
	}

	if (fraudType && !FRAUD_CATEGORIES.includes(fraudType as (typeof FRAUD_CATEGORIES)[number])) {
		return json({ error: 'Invalid fraud type filter' }, { status: 400 });
	}

	try {
		const mission = await fetchRandomActiveMission({ difficulty, fraudType });

		if (!mission) {
			return json(
				{ error: 'No missions available', hint: 'Run the generation pipeline first' },
				{ status: 404 }
			);
		}

		return json({
			id: mission.id,
			fraud_type: mission.fraudType,
			simulation_type: mission.simulationType,
			sender: mission.sender,
			message_body: mission.messageBody,
			difficulty: mission.difficulty,
			tip: mission.tip,
			clue_count: mission.clues.length,
			_clues: mission.clues.map((clue) => ({
				id: clue.id,
				trigger_text: clue.triggerText,
				type: clue.type,
				difficulty: clue.difficulty,
				explanation: clue.explanation
			}))
		});
	} catch (err) {
		console.error('[missions/random] Error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
