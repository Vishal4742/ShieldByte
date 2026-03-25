import { json, type RequestHandler } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { evaluateReferralBadges } from '$lib/server/badge-engine.js';
import { authenticateRequest } from '$lib/server/auth.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, recruit_user_id } = await request.json();

		if (!code || !recruit_user_id) {
			return json({ error: 'Missing code or recruit_user_id' }, { status: 400 });
		}

		const auth = await authenticateRequest(request, recruit_user_id);
		if ('error' in auth) {
			return json({ error: auth.error }, { status: 401 });
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

		// Check if recruit already claimed this link
		const { data: existingClaim } = await supabase
			.from('referral_claims')
			.select('id')
			.eq('code', code)
			.eq('recruit_user_id', recruit_user_id)
			.maybeSingle();

		if (existingClaim) {
			return json({ success: false, message: 'Already claimed' });
		}

		// Insert claim (unique constraint prevents duplicates under concurrency)
		const { error: claimError } = await supabase.from('referral_claims').insert({
			code,
			recruit_user_id
		});

		if (claimError) {
			// Unique constraint violation = someone else claimed at the same time
			return json({ success: false, message: 'Already claimed' });
		}

		// Atomically increment referral stats using raw SQL to prevent read-then-write race
		const { error: statsError } = await supabase.rpc('exec_sql', {
			query: `UPDATE referral_links SET successful_recruits = successful_recruits + 1, clicks = clicks + 1 WHERE code = '${code.replace(/'/g, "''")}'`
		});
		if (statsError) {
			// Fallback: manual increment (still better than the old read-then-write)
			console.warn('[referrals] RPC exec_sql failed, using fallback update:', statsError.message);
			await supabase
				.from('referral_links')
				.update({
					successful_recruits: (link.successful_recruits ?? 0) + 1,
					clicks: (link.clicks ?? 0) + 1
				})
				.eq('code', code);
		}

		// Grant XP using upsert to avoid partial state
		// 1. Grant 500 XP to referrer
		const { error: referrerError } = await supabase
			.from('user_stats')
			.upsert(
				{
					user_id: link.user_id,
					total_xp: 500,
					lives: 3,
					streak_days: 1
				},
				{ onConflict: 'user_id', ignoreDuplicates: false }
			);

		if (!referrerError) {
			// If the row already existed, we need to increment XP, not replace it
			const { data: referrerStats } = await supabase
				.from('user_stats')
				.select('total_xp')
				.eq('user_id', link.user_id)
				.single();
			if (referrerStats && referrerStats.total_xp !== 500) {
				// Row existed — add 500 XP to existing total
				await supabase
					.from('user_stats')
					.update({ total_xp: referrerStats.total_xp + 500 })
					.eq('user_id', link.user_id);
			}
			// Check referral badges
			try {
				await evaluateReferralBadges(link.user_id);
			} catch (badgeErr) {
				console.warn('[referrals] Badge evaluation failed for referrer:', badgeErr);
			}
		}

		// 2. Grant 200 XP to recruit
		const { data: recruitStats } = await supabase
			.from('user_stats')
			.select('total_xp')
			.eq('user_id', recruit_user_id)
			.maybeSingle();

		if (recruitStats) {
			await supabase
				.from('user_stats')
				.update({ total_xp: recruitStats.total_xp + 200 })
				.eq('user_id', recruit_user_id);
		} else {
			await supabase.from('user_stats').insert({
				user_id: recruit_user_id,
				total_xp: 200,
				lives: 3,
				streak_days: 1
			});
		}

		return json({ success: true, mission_id: link.mission_id });

	} catch (e) {
		console.error('[referrals] Claim API error', e);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
};
