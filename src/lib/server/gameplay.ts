import { z } from 'zod';
import { supabase } from './supabase.js';
import { resolveLivesState, MAX_LIVES, LIFE_REGEN_MS } from '$lib/gameplay/engine.js';
import { evaluateBadges, type EarnedBadge } from './badge-engine.js';

const ATTEMPT_OUTCOMES = ['success', 'timeout', 'failed'] as const;

export const MissionAttemptSchema = z.object({
	user_id: z.string().trim().min(1),
	mission_id: z.number().int().positive(),
	xp_earned: z.number().int().min(0),
	base_xp: z.number().int().min(0).default(0),
	speed_bonus: z.number().int().min(0).default(0),
	perfect_multiplier: z.number().min(1).default(1),
	streak_multiplier: z.number().min(1).default(1),
	clues_found: z.number().int().min(0),
	clues_missed: z.number().int().min(0),
	wrong_taps: z.number().int().min(0),
	lives_remaining: z.number().int().min(0).max(3),
	time_taken: z.number().int().min(0).max(60),
	seconds_remaining: z.number().int().min(0).max(60),
	outcome: z.enum(ATTEMPT_OUTCOMES)
});

export type MissionAttemptPayload = z.infer<typeof MissionAttemptSchema>;

interface UserStatsRow {
	user_id: string;
	total_xp: number | null;
	streak_days: number | null;
	rank: string | null;
	last_mission_at: string | null;
}

function evaluateRank(totalXp: number) {
	if (totalXp >= 5000) {
		return 'Cyber Commander';
	}

	if (totalXp >= 2000) {
		return 'Senior Analyst';
	}

	if (totalXp >= 500) {
		return 'Field Investigator';
	}

	return 'Rookie Agent';
}

function computeNextStreak(lastMissionAt: string | null, currentStreak: number, now = new Date()) {
	if (!lastMissionAt) {
		return 1;
	}

	const previous = new Date(lastMissionAt);

	if (Number.isNaN(previous.getTime())) {
		return 1;
	}

	const currentDay = now.toISOString().slice(0, 10);
	const previousDay = previous.toISOString().slice(0, 10);

	if (currentDay === previousDay) {
		return null;
	}

	const diffMs = now.getTime() - previous.getTime();
	const diffHours = diffMs / (1000 * 60 * 60);

	return diffHours <= 48 ? (currentStreak + 1) : 1;
}

export async function recordMissionAttempt(payload: MissionAttemptPayload) {
	const now = new Date();
	const { data: currentStats, error: statsError } = await supabase
		.from('user_stats')
		.select('user_id, total_xp, streak_days, rank, last_mission_at')
		.eq('user_id', payload.user_id)
		.maybeSingle<UserStatsRow>();

	if (statsError) {
		throw new Error(`Failed to load user stats: ${statsError.message}`);
	}

	const { data: attemptRow, error: attemptError } = await supabase
		.from('mission_attempts')
		.insert({
			user_id: payload.user_id,
			mission_id: payload.mission_id,
			xp_earned: payload.xp_earned,
			clues_found: payload.clues_found,
			clues_missed: payload.clues_missed,
			wrong_taps: payload.wrong_taps,
			lives_remaining: payload.lives_remaining,
			time_taken: payload.time_taken,
			outcome: payload.outcome,
			result_json: payload
		})
		.select('id')
		.single<{ id: number }>();

	if (attemptError || !attemptRow) {
		throw new Error(`Failed to store mission attempt: ${attemptError?.message ?? 'unknown error'}`);
	}

	const existingXp = currentStats?.total_xp ?? 0;
	const streakDays = computeNextStreak(currentStats?.last_mission_at ?? null, currentStats?.streak_days ?? 0, now);
	const nextTotalXp = existingXp + payload.xp_earned;
	const nextStreakDays =
		streakDays === null ? (currentStats?.streak_days ?? 1) : Math.max(1, streakDays);
	const nextRank = evaluateRank(nextTotalXp);

	const combinedMultiplier = Number(
		(payload.perfect_multiplier * payload.streak_multiplier).toFixed(2)
	);

	const { error: xpError } = await supabase.from('xp_transactions').insert({
		user_id: payload.user_id,
		mission_attempt_id: attemptRow.id,
		event_type: 'mission_completion',
		base_xp: payload.base_xp + payload.speed_bonus,
		multiplier: combinedMultiplier,
		final_xp: payload.xp_earned,
		metadata: {
			mission_id: payload.mission_id,
			outcome: payload.outcome,
			seconds_remaining: payload.seconds_remaining,
			wrong_taps: payload.wrong_taps
		}
	});

	if (xpError) {
		throw new Error(`Failed to store XP transaction: ${xpError.message}`);
	}

	const { error: upsertError } = await supabase.from('user_stats').upsert(
		{
			user_id: payload.user_id,
			total_xp: nextTotalXp,
			streak_days: nextStreakDays,
			rank: nextRank,
			last_mission_at: now.toISOString(),
			updated_at: now.toISOString(),
			lives: payload.lives_remaining,
			lives_updated_at: now.toISOString()
		},
		{ onConflict: 'user_id' }
	);

	if (upsertError) {
		throw new Error(`Failed to update user stats: ${upsertError.message}`);
	}

	// ── Rank-up detection ──
	const previousRank = currentStats?.rank ?? 'Rookie Agent';
	const rankUp =
		previousRank !== nextRank ? { from: previousRank, to: nextRank } : null;

	// ── Badge evaluation (non-blocking — errors are caught internally) ──
	let newBadges: EarnedBadge[] = [];
	try {
		// Fetch fraud_type for badge conditions
		const { data: missionRow } = await supabase
			.from('missions')
			.select('fraud_type')
			.eq('id', payload.mission_id)
			.maybeSingle<{ fraud_type: string }>();

		newBadges = await evaluateBadges({
			userId: payload.user_id,
			missionId: payload.mission_id,
			attemptId: attemptRow.id,
			timeTaken: payload.time_taken,
			wrongTaps: payload.wrong_taps,
			cluesFound: payload.clues_found,
			cluesMissed: payload.clues_missed,
			outcome: payload.outcome,
			streakDays: nextStreakDays,
			rank: nextRank,
			fraudType: missionRow?.fraud_type ?? ''
		});
	} catch (err) {
		console.error('[gameplay] Badge evaluation failed (non-blocking):', err);
	}

	return {
		attemptId: attemptRow.id,
		profile: {
			userId: payload.user_id,
			totalXp: nextTotalXp,
			streakDays: nextStreakDays,
			rank: nextRank,
			lastMissionAt: now.toISOString()
		},
		lives: {
			lives: payload.lives_remaining,
			lastUpdatedAt: now.getTime(),
			nextLifeInMs: payload.lives_remaining >= MAX_LIVES ? null : LIFE_REGEN_MS
		},
		newBadges,
		rankUp
	};
}

// ─── Server-side Lives ──────────────────────────────────────

export async function getOrInitLives(userId: string) {
	const now = Date.now();

	const { data, error } = await supabase
		.from('user_stats')
		.select('lives, lives_updated_at')
		.eq('user_id', userId)
		.maybeSingle<{ lives: number; lives_updated_at: string }>();

	if (error) {
		throw new Error(`Failed to load lives: ${error.message}`);
	}

	if (!data) {
		// First-time player: create row with full lives
		const { error: insertErr } = await supabase.from('user_stats').upsert(
			{
				user_id: userId,
				lives: MAX_LIVES,
				lives_updated_at: new Date(now).toISOString()
			},
			{ onConflict: 'user_id' }
		);

		if (insertErr) {
			throw new Error(`Failed to init lives: ${insertErr.message}`);
		}

		return resolveLivesState({ lives: MAX_LIVES, lastUpdatedAt: now }, now);
	}

	const lastUpdatedAt = new Date(data.lives_updated_at).getTime();
	const resolved = resolveLivesState({ lives: data.lives, lastUpdatedAt }, now);

	// If regeneration happened, persist the new state
	if (resolved.lives !== data.lives) {
		await supabase
			.from('user_stats')
			.update({
				lives: resolved.lives,
				lives_updated_at: new Date(resolved.lastUpdatedAt).toISOString()
			})
			.eq('user_id', userId);
	}

	return resolved;
}

export async function updateServerLives(userId: string, livesRemaining: number) {
	const clamped = Math.min(MAX_LIVES, Math.max(0, livesRemaining));
	const now = new Date();

	const { error } = await supabase.from('user_stats').upsert(
		{
			user_id: userId,
			lives: clamped,
			lives_updated_at: now.toISOString()
		},
		{ onConflict: 'user_id' }
	);

	if (error) {
		throw new Error(`Failed to update lives: ${error.message}`);
	}

	return resolveLivesState({ lives: clamped, lastUpdatedAt: now.getTime() }, now.getTime());
}
