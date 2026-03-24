import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

function determineWinner(
	challengerXp: number,
	opponentXp: number,
	challengerTime: number,
	opponentTime: number
): 'challenger' | 'opponent' | 'draw' {
	// Primary: higher XP wins
	if (challengerXp > opponentXp) return 'challenger';
	if (opponentXp > challengerXp) return 'opponent';

	// Tiebreaker: faster time wins (lower time_taken = faster)
	if (challengerTime < opponentTime) return 'challenger';
	if (opponentTime < challengerTime) return 'opponent';

	return 'draw';
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const { code, user_id, xp_earned, time_taken, wrong_taps, clues_found, clues_total, outcome } =
			body;

		if (!code || !user_id) {
			return json({ error: 'Missing code or user_id' }, { status: 400 });
		}

		// Fetch the challenge
		const { data: challenge, error: fetchErr } = await supabase
			.from('challenges')
			.select('*')
			.eq('code', code)
			.single();

		if (fetchErr || !challenge) {
			return json({ error: 'Challenge not found' }, { status: 404 });
		}

		if (challenge.status === 'completed') {
			return json({ error: 'Challenge already completed', challenge }, { status: 409 });
		}

		if (challenge.challenger_id === user_id) {
			return json({ error: 'You cannot challenge yourself' }, { status: 400 });
		}

		const winner = determineWinner(
			challenge.challenger_xp,
			xp_earned ?? 0,
			challenge.challenger_time,
			time_taken ?? 60
		);

		const { data: updated, error: updateErr } = await supabase
			.from('challenges')
			.update({
				opponent_id: user_id,
				opponent_xp: xp_earned ?? 0,
				opponent_time: time_taken ?? 60,
				opponent_wrong_taps: wrong_taps ?? 0,
				opponent_clues_found: clues_found ?? 0,
				opponent_clues_total: clues_total ?? 0,
				opponent_outcome: outcome ?? 'success',
				winner,
				status: 'completed',
				completed_at: new Date().toISOString()
			})
			.eq('code', code)
			.select()
			.single();

		if (updateErr) {
			console.error('[challenges/submit] DB error:', updateErr);
			return json({ error: 'Failed to submit challenge result' }, { status: 500 });
		}

		return json({ winner, challenge: updated });
	} catch (e) {
		console.error('[challenges/submit] Error:', e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
