import type { MissionClue } from '$lib/types/mission.js';

export const MISSION_DURATION_SECONDS = 60;
export const LOW_TIME_THRESHOLD_SECONDS = 15;
export const MAX_LIVES = 3;
export const LIFE_REGEN_MS = 60 * 60 * 1000;
export const LIVES_STORAGE_KEY = 'shieldbyte:lives-state';
export const PLAYER_ID_STORAGE_KEY = 'shieldbyte:player-id';

export interface MissionSegment {
	id: string;
	text: string;
	clueId: number | null;
	clue: MissionClue | null;
	isWhitespace: boolean;
}

export interface CalculateXPParams {
	secondsRemaining: number;
	wrongTaps: number;
	allCluesFound: boolean;
	streakDays: number;
	missionFailed?: boolean;
}

export interface LivesState {
	lives: number;
	lastUpdatedAt: number;
	nextLifeInMs: number | null;
}

export interface MissionResultClue extends MissionClue {
	status: 'found' | 'missed';
}

export interface MissionResultSummary {
	outcome: 'success' | 'timeout' | 'failed';
	xpEarned: number;
	baseXP: number;
	speedBonus: number;
	perfectMultiplier: number;
	streakMultiplier: number;
	secondsRemaining: number;
	wrongTaps: number;
	livesRemaining: number;
	foundCount: number;
	missedCount: number;
	clueResults: MissionResultClue[];
}

export interface PlayerStatsSnapshot {
	userId: string;
	totalXp: number;
	streakDays: number;
	rank: string;
	lastMissionAt: string | null;
}

interface Placement {
	clue: MissionClue;
	start: number;
	end: number;
}

function normalizeSearchValue(value: string): string {
	return value.toLocaleLowerCase();
}

function rangesOverlap(start: number, end: number, placements: Placement[]): boolean {
	return placements.some((placement) => start < placement.end && end > placement.start);
}

function findAvailableOccurrence(
	messageBody: string,
	triggerText: string,
	placements: Placement[]
): number {
	const exactIndex = messageBody.indexOf(triggerText);
	if (
		exactIndex >= 0 &&
		!rangesOverlap(exactIndex, exactIndex + triggerText.length, placements)
	) {
		return exactIndex;
	}

	const normalizedBody = normalizeSearchValue(messageBody);
	const normalizedTrigger = normalizeSearchValue(triggerText);
	let searchFrom = 0;

	while (searchFrom < normalizedBody.length) {
		const index = normalizedBody.indexOf(normalizedTrigger, searchFrom);
		if (index === -1) {
			return -1;
		}

		const end = index + triggerText.length;
		if (!rangesOverlap(index, end, placements)) {
			return index;
		}

		searchFrom = index + 1;
	}

	return -1;
}

export function buildMissionSegments(messageBody: string, clues: MissionClue[]): MissionSegment[] {
	if (!messageBody.trim()) {
		return [];
	}

	const placements: Placement[] = [];

	for (const clue of clues) {
		const triggerText = clue.triggerText.trim();
		if (!triggerText) {
			continue;
		}

		const start = findAvailableOccurrence(messageBody, triggerText, placements);
		if (start === -1) {
			continue;
		}

		placements.push({
			clue,
			start,
			end: start + triggerText.length
		});
	}

	placements.sort((left, right) => left.start - right.start);

	const segments: MissionSegment[] = [];
	let cursor = 0;

	for (const placement of placements) {
		if (placement.start > cursor) {
			const text = messageBody.slice(cursor, placement.start);
			segments.push({
				id: `plain-${cursor}`,
				text,
				clueId: null,
				clue: null,
				isWhitespace: text.trim().length === 0
			});
		}

		const text = messageBody.slice(placement.start, placement.end);
		segments.push({
			id: `clue-${placement.clue.id}-${placement.start}`,
			text,
			clueId: placement.clue.id,
			clue: placement.clue,
			isWhitespace: false
		});

		cursor = placement.end;
	}

	if (cursor < messageBody.length) {
		const text = messageBody.slice(cursor);
		segments.push({
			id: `plain-${cursor}`,
			text,
			clueId: null,
			clue: null,
			isWhitespace: text.trim().length === 0
		});
	}

	return segments;
}

export function calculateXP({
	secondsRemaining,
	wrongTaps,
	allCluesFound,
	streakDays,
	missionFailed = false
}: CalculateXPParams) {
	if (missionFailed) {
		return {
			baseXP: 0,
			speedBonus: 0,
			perfectMultiplier: 1,
			streakMultiplier: 1,
			totalXP: 0
		};
	}

	const baseXP = 100;
	const speedBonus = Math.floor((Math.max(0, secondsRemaining) / MISSION_DURATION_SECONDS) * 50);
	const perfectMultiplier = wrongTaps === 0 && allCluesFound ? 2 : 1;
	const streakMultiplier = Math.min(1 + Math.max(0, streakDays) * 0.1, 2);
	const totalXP = Math.round((baseXP + speedBonus) * perfectMultiplier * streakMultiplier);

	return {
		baseXP,
		speedBonus,
		perfectMultiplier,
		streakMultiplier,
		totalXP
	};
}

export function resolveLivesState(state: { lives?: number; lastUpdatedAt?: number }, now: number) {
	const lastUpdatedAt =
		typeof state.lastUpdatedAt === 'number' && Number.isFinite(state.lastUpdatedAt)
			? state.lastUpdatedAt
			: now;
	const startingLives =
		typeof state.lives === 'number' && Number.isFinite(state.lives)
			? Math.min(MAX_LIVES, Math.max(0, Math.floor(state.lives)))
			: MAX_LIVES;

	const elapsed = Math.max(0, now - lastUpdatedAt);
	const regeneratedLives = Math.floor(elapsed / LIFE_REGEN_MS);
	const lives = Math.min(MAX_LIVES, startingLives + regeneratedLives);
	const nextLifeInMs =
		lives >= MAX_LIVES ? null : Math.max(0, LIFE_REGEN_MS - (elapsed % LIFE_REGEN_MS));

	return {
		lives,
		lastUpdatedAt: lives >= MAX_LIVES ? now : lastUpdatedAt + regeneratedLives * LIFE_REGEN_MS,
		nextLifeInMs
	} satisfies LivesState;
}

export function parseLivesState(rawValue: string | null, now: number): LivesState {
	if (!rawValue) {
		return resolveLivesState({}, now);
	}

	try {
		const parsed = JSON.parse(rawValue) as { lives?: number; lastUpdatedAt?: number };
		return resolveLivesState(parsed, now);
	} catch {
		return resolveLivesState({}, now);
	}
}

export function serializeLivesState(state: Pick<LivesState, 'lives' | 'lastUpdatedAt'>) {
	return JSON.stringify({
		lives: state.lives,
		lastUpdatedAt: state.lastUpdatedAt
	});
}

export function getOrCreatePlayerId(storageValue: string | null) {
	if (storageValue && storageValue.trim().length > 0) {
		return storageValue;
	}

	const uuid =
		typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

	return `guest:${uuid}`;
}

export function consumeLife(currentState: LivesState, now: number): LivesState {
	const nextLives = Math.max(0, currentState.lives - 1);

	return {
		lives: nextLives,
		lastUpdatedAt: now,
		nextLifeInMs: nextLives >= MAX_LIVES ? null : LIFE_REGEN_MS
	};
}

export function buildMissionResultSummary(params: {
	clues: MissionClue[];
	foundIds: number[];
	wrongTaps: number;
	secondsRemaining: number;
	streakDays: number;
	livesRemaining: number;
	outcome: 'success' | 'timeout' | 'failed';
}): MissionResultSummary {
	const foundIdSet = new Set(params.foundIds);
	const clueResults: MissionResultClue[] = params.clues.map((clue) => ({
		...clue,
		status: foundIdSet.has(clue.id) ? 'found' : 'missed'
	}));
	const foundCount = clueResults.filter((clue) => clue.status === 'found').length;
	const missedCount = clueResults.length - foundCount;
	const xp = calculateXP({
		secondsRemaining: params.secondsRemaining,
		wrongTaps: params.wrongTaps,
		allCluesFound: foundCount === params.clues.length,
		streakDays: params.streakDays,
		missionFailed: params.outcome === 'failed'
	});

	return {
		outcome: params.outcome,
		xpEarned: xp.totalXP,
		baseXP: xp.baseXP,
		speedBonus: xp.speedBonus,
		perfectMultiplier: xp.perfectMultiplier,
		streakMultiplier: xp.streakMultiplier,
		secondsRemaining: params.secondsRemaining,
		wrongTaps: params.wrongTaps,
		livesRemaining: params.livesRemaining,
		foundCount,
		missedCount,
		clueResults
	};
}
