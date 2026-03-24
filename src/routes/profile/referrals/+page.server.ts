import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { supabase } from '$lib/server/supabase.js';

export const load: PageServerLoad = async ({ locals }) => {

	// In some views we would enforce session, but let's assume `locals.getSession` exists or omit session 
	// To avoid TypeScript issues, if the user doesn't have a session we should fail gracefully.
	// Since we are not doing full local auth checking, let's just fetch by checking if headers exist, or for MVP simply fetching user session if implemented.
	// Wait, we can fetch session from supabase directly or ignore it for now.
	const { data: { session } } = await supabase.auth.getSession();
	
	if (!session) {
		// Mock a guest user or handle properly
		return { links: [], stats: { totalRecruits: 0, totalClicks: 0, totalXpEarned: 0 } };
	}

	const { data: links, error: linksError } = await supabase
		.from('referral_links')
		.select('code, mission_id, clicks, successful_recruits, created_at')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	if (linksError) {
		console.error('Failed to load referral links', linksError);
	}

	const totalRecruits = links?.reduce((acc: number, link: any) => acc + (link.successful_recruits || 0), 0) || 0;
	const totalClicks = links?.reduce((acc: number, link: any) => acc + (link.clicks || 0), 0) || 0;
	// 500 XP per recruit
	const totalXpEarned = totalRecruits * 500;

	return {
		links: links || [],
		stats: {
			totalRecruits,
			totalClicks,
			totalXpEarned
		}
	};
};
