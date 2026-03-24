import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

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

	if (error || !challenge) {
		return json({ error: 'Challenge not found' }, { status: 404 });
	}

	return json({ challenge });
};
