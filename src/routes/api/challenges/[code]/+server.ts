import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import {
	getChallengesUnavailableMessage,
	isMissingChallengesTableError
} from '$lib/server/challenge-service.js';

export const GET: RequestHandler = async ({ params }) => {
	const code = params.code;

	if (!code) {
		return json({ error: 'Missing challenge code' }, { status: 400 });
	}

	const { data: challenge, error } = await supabase
		.from('challenges')
		.select('*')
		.eq('code', code)
		.single();

	if (error) {
		if (isMissingChallengesTableError(error)) {
			return json({ error: getChallengesUnavailableMessage() }, { status: 503 });
		}
		return json({ error: 'Failed to load challenge' }, { status: 500 });
	}

	if (!challenge) {
		return json({ error: 'Challenge not found' }, { status: 404 });
	}

	return json({ challenge });
};
