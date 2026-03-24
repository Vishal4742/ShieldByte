import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

function generateShortCode() {
	// A simple 6-character alphanumeric code
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < 6; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { user_id, mission_id } = await request.json();

		if (!user_id || !mission_id) {
			return json({ error: 'Missing user_id or mission_id' }, { status: 400 });
		}

		// Check if link already exists for this pair
		const { data: existing } = await supabase
			.from('referral_links')
			.select('code')
			.eq('user_id', user_id)
			.eq('mission_id', mission_id)
			.maybeSingle();

		if (existing) {
			return json({ code: existing.code });
		}

		// Generate new code 
		let code = generateShortCode();
		let codeExists = true;
		
		// Ensure uniqueness
		while(codeExists) {
			const { data } = await supabase.from('referral_links').select('code').eq('code', code).maybeSingle();
			if (!data) codeExists = false;
			else code = generateShortCode();
		}

		const { error } = await supabase.from('referral_links').insert({
			code,
			user_id,
			mission_id
		});

		if (error) {
			console.error('[referrals] Failed to create link', error);
			return json({ error: 'Database error' }, { status: 500 });
		}

		return json({ code });
	} catch (e) {
		console.error('[referrals] Generate API error', e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
