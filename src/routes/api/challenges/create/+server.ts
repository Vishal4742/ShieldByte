import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import {
	getChallengesUnavailableMessage,
	isMissingChallengesTableError
} from '$lib/server/challenge-service.js';

function generateChallengeCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
	let result = '';
	for (let i = 0; i < 8; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		const {
			user_id,
			mission_id,
			xp_earned,
			time_taken,
			wrong_taps,
			clues_found,
			clues_total,
			outcome
		} = body;

		if (!user_id || !mission_id) {
			return json({ error: 'Missing user_id or mission_id' }, { status: 400 });
		}

		// Generate unique code
		let code = generateChallengeCode();
		let codeExists = true;

		while (codeExists) {
			const { data, error: lookupError } = await supabase
				.from('challenges')
				.select('code')
				.eq('code', code)
				.maybeSingle();
			if (lookupError) {
				if (isMissingChallengesTableError(lookupError)) {
					return json({ error: getChallengesUnavailableMessage() }, { status: 503 });
				}
				console.error('[challenges/create] Lookup error:', lookupError);
				return json({ error: 'Failed to verify challenge code availability' }, { status: 500 });
			}
			if (!data) codeExists = false;
			else code = generateChallengeCode();
		}

		const { error } = await supabase.from('challenges').insert({
			code,
			mission_id,
			challenger_id: user_id,
			challenger_xp: xp_earned ?? 0,
			challenger_time: time_taken ?? 60,
			challenger_wrong_taps: wrong_taps ?? 0,
			challenger_clues_found: clues_found ?? 0,
			challenger_clues_total: clues_total ?? 0,
			challenger_outcome: outcome ?? 'success'
		});

		if (error) {
			if (isMissingChallengesTableError(error)) {
				return json({ error: getChallengesUnavailableMessage() }, { status: 503 });
			}
			console.error('[challenges/create] DB error:', error);
			return json({ error: 'Failed to create challenge' }, { status: 500 });
		}

		return json({ code });
	} catch (e) {
		console.error('[challenges/create] Error:', e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
