/**
 * ShieldByte — Phase 5: Badge Evaluator Engine
 *
 * Checks all 9 SRS badge conditions after each mission attempt and awards
 * newly earned badges. The UNIQUE(user_id, badge_id) constraint in the DB
 * guarantees a badge is never awarded twice.
 *
 * Badge IDs (SRS Section 4.6):
 *   speed_demon      — Complete a mission in under 20 seconds
 *   sharpshooter     — 3 missions with zero wrong taps
 *   upi_guardian     — 5 perfect UPI fraud missions
 *   kyc_defender     — 5 perfect KYC fraud missions
 *   viral_protector  — 10 shared links clicked (deferred to Phase 7)
 *   week_warrior     — Maintain a 7-day streak
 *   perfect_week     — 7 consecutive days with perfect scores
 *   mentor           — 5 referred friends complete first mission (deferred to Phase 7)
 *   fraud_hunter     — Reach Cyber Commander rank
 */

import { supabase } from './supabase.js';

// ─── Badge Definitions ──────────────────────────────────────

export interface BadgeDefinition {
	id: string;
	name: string;
	description: string;
	category: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
	{ id: 'speed_demon', name: 'Speed Demon', description: 'Complete a mission in under 20 seconds', category: 'Speed' },
	{ id: 'sharpshooter', name: 'Sharpshooter', description: '3 missions with zero wrong taps', category: 'Accuracy' },
	{ id: 'upi_guardian', name: 'UPI Guardian', description: 'Correctly identify all clues in 5 UPI fraud missions', category: 'Mastery' },
	{ id: 'kyc_defender', name: 'KYC Defender', description: 'Correctly identify all clues in 5 KYC fraud missions', category: 'Mastery' },
	{ id: 'viral_protector', name: 'Viral Protector', description: 'Share 10 challenge links that get clicked', category: 'Sharing' },
	{ id: 'week_warrior', name: 'Week Warrior', description: 'Maintain a 7-day streak', category: 'Consistency' },
	{ id: 'perfect_week', name: 'Perfect Week', description: 'Complete 7 days in a row with perfect scores', category: 'Consistency' },
	{ id: 'mentor', name: 'Mentor', description: 'Refer 5 friends who complete their first mission', category: 'Sharing' },
	{ id: 'fraud_hunter', name: 'Fraud Hunter', description: 'Reach Cyber Commander rank', category: 'Progression' }
];

// ─── Types ──────────────────────────────────────────────────

export interface BadgeEventData {
	userId: string;
	missionId: number;
	attemptId: number;
	timeTaken: number;
	wrongTaps: number;
	cluesFound: number;
	cluesMissed: number;
	outcome: string;
	streakDays: number;
	rank: string;
	fraudType: string;
}

export interface EarnedBadge {
	badgeId: string;
	name: string;
	description: string;
	category: string;
	earnedAt: string;
}

// ─── Core Evaluator ─────────────────────────────────────────

export async function evaluateBadges(event: BadgeEventData): Promise<EarnedBadge[]> {
	// 1. Load already-earned badges for this user
	const { data: existingBadges, error: fetchError } = await supabase
		.from('user_badges')
		.select('badge_id')
		.eq('user_id', event.userId);

	if (fetchError) {
		console.error('[badge-engine] Failed to load existing badges:', fetchError.message);
		return [];
	}

	const earnedSet = new Set((existingBadges ?? []).map((b: { badge_id: string }) => b.badge_id));

	// 2. Check each badge condition
	const candidateIds: string[] = [];

	// ── speed_demon: mission under 20 seconds ──
	if (!earnedSet.has('speed_demon') && event.outcome === 'success' && event.timeTaken < 20) {
		candidateIds.push('speed_demon');
	}

	// ── sharpshooter: 3 missions with 0 wrong taps ──
	if (!earnedSet.has('sharpshooter') && event.wrongTaps === 0 && event.outcome === 'success') {
		const count = await countPerfectTapMissions(event.userId);
		if (count >= 3) {
			candidateIds.push('sharpshooter');
		}
	}

	// ── upi_guardian: 5 perfect UPI fraud missions ──
	if (!earnedSet.has('upi_guardian') && event.outcome === 'success' && event.fraudType === 'UPI_fraud') {
		const count = await countPerfectFraudTypeMissions(event.userId, 'UPI_fraud');
		if (count >= 5) {
			candidateIds.push('upi_guardian');
		}
	}

	// ── kyc_defender: 5 perfect KYC fraud missions ──
	if (!earnedSet.has('kyc_defender') && event.outcome === 'success' && event.fraudType === 'KYC_fraud') {
		const count = await countPerfectFraudTypeMissions(event.userId, 'KYC_fraud');
		if (count >= 5) {
			candidateIds.push('kyc_defender');
		}
	}

	// ── week_warrior: 7-day streak ──
	if (!earnedSet.has('week_warrior') && event.streakDays >= 7) {
		candidateIds.push('week_warrior');
	}

	// ── perfect_week: 7 consecutive perfect-score days ──
	if (!earnedSet.has('perfect_week') && event.streakDays >= 7) {
		const hasPerfectWeek = await checkPerfectWeek(event.userId);
		if (hasPerfectWeek) {
			candidateIds.push('perfect_week');
		}
	}

	// ── fraud_hunter: Cyber Commander rank ──
	if (!earnedSet.has('fraud_hunter') && event.rank === 'Cyber Commander') {
		candidateIds.push('fraud_hunter');
	}

	// ── viral_protector + mentor: deferred to Phase 7 ──
	// Referral-based badges are currently inactive.

	if (candidateIds.length === 0) {
		return [];
	}

	// 3. Insert new badges (ON CONFLICT DO NOTHING for safety)
	const now = new Date().toISOString();
	const rows = candidateIds.map((badgeId) => ({
		user_id: event.userId,
		badge_id: badgeId,
		earned_at: now
	}));

	const { error: insertError } = await supabase
		.from('user_badges')
		.upsert(rows, { onConflict: 'user_id,badge_id', ignoreDuplicates: true });

	if (insertError) {
		console.error('[badge-engine] Failed to insert badges:', insertError.message);
		return [];
	}

	// 4. Return newly earned badges with metadata
	return candidateIds.map((badgeId) => {
		const def = BADGE_DEFINITIONS.find((b) => b.id === badgeId)!;
		return {
			badgeId: def.id,
			name: def.name,
			description: def.description,
			category: def.category,
			earnedAt: now
		};
	});
}

// ─── Helper Queries ─────────────────────────────────────────

/** Count missions where user had 0 wrong taps and succeeded */
async function countPerfectTapMissions(userId: string): Promise<number> {
	const { count, error } = await supabase
		.from('mission_attempts')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)
		.eq('wrong_taps', 0)
		.eq('outcome', 'success');

	if (error) {
		console.error('[badge-engine] countPerfectTapMissions error:', error.message);
		return 0;
	}

	return count ?? 0;
}

/** Count perfect missions for a specific fraud type (requires join with missions table) */
async function countPerfectFraudTypeMissions(userId: string, fraudType: string): Promise<number> {
	// Use RPC or a raw query since Supabase JS doesn't support joins natively for counts.
	// We do a two-step: get mission IDs of the fraud type, then count matching attempts.
	const { data: missions, error: missionsError } = await supabase
		.from('missions')
		.select('id')
		.eq('fraud_type', fraudType);

	if (missionsError || !missions || missions.length === 0) {
		return 0;
	}

	const missionIds = missions.map((m: { id: number }) => m.id);

	const { count, error } = await supabase
		.from('mission_attempts')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId)
		.eq('outcome', 'success')
		.eq('clues_missed', 0)
		.in('mission_id', missionIds);

	if (error) {
		console.error('[badge-engine] countPerfectFraudTypeMissions error:', error.message);
		return 0;
	}

	return count ?? 0;
}

/** Check if the user's last 7 missions (on distinct days) all had perfect scores */
async function checkPerfectWeek(userId: string): Promise<boolean> {
	const { data, error } = await supabase
		.from('mission_attempts')
		.select('wrong_taps, clues_missed, outcome, created_at')
		.eq('user_id', userId)
		.eq('outcome', 'success')
		.order('created_at', { ascending: false })
		.limit(20); // fetch extra to find 7 distinct days

	if (error || !data) {
		return false;
	}

	// Group by calendar day and check the first 7 distinct days
	const seenDays = new Set<string>();
	let perfectDays = 0;

	for (const attempt of data) {
		const day = new Date(attempt.created_at).toISOString().slice(0, 10);
		if (seenDays.has(day)) {
			continue;
		}

		seenDays.add(day);

		if (attempt.wrong_taps === 0 && attempt.clues_missed === 0) {
			perfectDays++;
		} else {
			// Non-perfect day breaks the consecutive window
			break;
		}

		if (perfectDays >= 7) {
			return true;
		}
	}

	return false;
}

// ─── Public Utils ───────────────────────────────────────────

/** Get all badges earned by a user */
export async function getUserBadges(userId: string): Promise<EarnedBadge[]> {
	const { data, error } = await supabase
		.from('user_badges')
		.select('badge_id, earned_at')
		.eq('user_id', userId)
		.order('earned_at', { ascending: true });

	if (error || !data) {
		return [];
	}

	return data.map((row: { badge_id: string; earned_at: string }) => {
		const def = BADGE_DEFINITIONS.find((b) => b.id === row.badge_id);
		return {
			badgeId: row.badge_id,
			name: def?.name ?? row.badge_id,
			description: def?.description ?? '',
			category: def?.category ?? '',
			earnedAt: row.earned_at
		};
	});
}
