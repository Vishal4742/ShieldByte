import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { evaluateReferralBadges } from '$lib/server/badge-engine.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, recruit_user_id } = await request.json();

		if (!code || !recruit_user_id) {
			return json({ error: 'Missing code or recruit_user_id' }, { status: 400 });
		}

		// Fetch the referral link
		const { data: link, error: linkError } = await supabase
			.from('referral_links')
			.select('*')
			.eq('code', code)
			.single();

		if (linkError || !link) {
			return json({ error: 'Invalid referral code' }, { status: 404 });
		}

		if (link.user_id === recruit_user_id) {
			return json({ error: 'Cannot recruit yourself!' }, { status: 400 });
		}

		// Check if recruit already exists
		const { data: existingClaim } = await supabase
			.from('referral_claims')
			.select('id')
			.eq('code', code)
			.eq('recruit_user_id', recruit_user_id)
			.maybeSingle();

		if (existingClaim) {
			return json({ success: false, message: 'Already claimed' });
		}

		// Insert claim
		const { error: claimError } = await supabase.from('referral_claims').insert({
			code,
			recruit_user_id
		});

		if (claimError) {
			// Could be unique constraint violation if racing
			return json({ success: false, message: 'Failed to claim' });
		}

		// Increment clicks and successful_recruits
		await supabase.rpc('increment_referral_stats', { link_code: code });
		// Wait, we don't have an RPC function. We'll manually update for MVP.
		await supabase
			.from('referral_links')
			.update({ successful_recruits: link.successful_recruits + 1, clicks: link.clicks + 1 })
			.eq('code', code);

		// Grant XP to referrer and recruit
		// Since we don't have an XP transaction abstraction, we fetch their current stats and update them.
		
		// 1. Grant 500 XP to referrer
		const { data: referrerStats } = await supabase.from('user_stats').select('total_xp').eq('user_id', link.user_id).single();
		if (referrerStats) {
			await supabase.from('user_stats').update({ total_xp: referrerStats.total_xp + 500 }).eq('user_id', link.user_id);
			// Check badges for referrer! (Specifically viral_protector and mentor)
			await evaluateReferralBadges(link.user_id);
		}

		// 2. Grant 200 XP to recruit
		let recruitXp = 200;
		const { data: recruitStats } = await supabase.from('user_stats').select('total_xp').eq('user_id', recruit_user_id).maybeSingle();
		if (recruitStats) {
			recruitXp += recruitStats.total_xp;
			await supabase.from('user_stats').update({ total_xp: recruitXp }).eq('user_id', recruit_user_id);
		} else {
			// They will get initialized when they play their first mission via GameplayEngine, 
			// but we can initialize their row now.
			await supabase.from('user_stats').insert({
				user_id: recruit_user_id,
				total_xp: recruitXp,
				lives_remaining: 3,
				streak_days: 1
			});
		}

		return json({ success: true, mission_id: link.mission_id });

	} catch (e) {
		console.error('[referrals] Claim API error', e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
