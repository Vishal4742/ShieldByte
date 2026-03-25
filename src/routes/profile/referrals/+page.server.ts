import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';

export const load: PageServerLoad = async ({ url }) => {
	const userId = url.searchParams.get('user_id');

	if (!userId) {
		return {
			links: [],
			stats: { totalRecruits: 0, totalClicks: 0, totalXpEarned: 0 },
			userId: null
		};
	}

	try {
		const { data: links, error: linksError } = await supabase
			.from('referral_links')
			.select('code, mission_id, clicks, successful_recruits, created_at')
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (linksError) {
			console.error('[referrals] Failed to load referral links', linksError);
		}

		const totalRecruits =
			links?.reduce((acc: number, link: { successful_recruits?: number | null }) => acc + (link.successful_recruits || 0), 0) || 0;
		const totalClicks =
			links?.reduce((acc: number, link: { clicks?: number | null }) => acc + (link.clicks || 0), 0) || 0;

		return {
			links: links || [],
			stats: {
				totalRecruits,
				totalClicks,
				totalXpEarned: totalRecruits * 500
			},
			userId
		};
	} catch (error) {
		console.error('[referrals] Error loading referral page:', error);
		return {
			links: [],
			stats: { totalRecruits: 0, totalClicks: 0, totalXpEarned: 0 },
			userId
		};
	}
};
