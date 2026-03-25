import type { ThreatMission, MissionClue } from '$lib/types/mission.js';
import type { ThreatArticle } from '$lib/types/threat.js';
import { supabase } from './supabase.js';

interface MissionRow {
	id: number;
	article_id: number | null;
	fraud_type: string | null;
	expected_verdict: string | null;
	simulation_type: string | null;
	sender: string | null;
	message_body: string | null;
	difficulty: string | null;
	tip: string | null;
	variant: number | null;
	clues_json: unknown;
}

const MISSION_SELECT =
	'id, article_id, fraud_type, expected_verdict, simulation_type, sender, message_body, difficulty, tip, variant, clues_json';
const LEGACY_MISSION_SELECT =
	'id, article_id, fraud_type, simulation_type, sender, message_body, difficulty, tip, variant, clues_json';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function asString(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function sanitizeEnglishText(value: unknown, fallback: string): string {
	const normalized = asString(value, fallback);
	return DEVANAGARI_REGEX.test(normalized) ? fallback : normalized;
}

function normalizeClues(value: unknown): MissionClue[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => {
			if (typeof entry !== 'object' || entry === null) {
				return null;
			}

			const clue = entry as Record<string, unknown>;
			const triggerText = sanitizeEnglishText(
				clue.trigger_text,
				'Review this suspicious phrase in the message.'
			);
			const explanation = sanitizeEnglishText(
				clue.explanation,
				'This pattern should be treated as a warning sign.'
			);

			if (!triggerText || !explanation) {
				return null;
			}

			return {
				id: typeof clue.id === 'number' ? clue.id : 0,
				triggerText,
				type: asString(clue.type, 'signal'),
				difficulty: asString(clue.difficulty, 'medium'),
				explanation
			};
		})
		.filter((entry): entry is MissionClue => entry !== null);
}

function normalizeMission(row: MissionRow): ThreatMission {
	const expectedVerdict = row.expected_verdict === 'safe' ? 'safe' : 'scam';
	return {
		id: row.id,
		articleId: row.article_id,
		fraudType: asString(row.fraud_type, 'unclassified'),
		expectedVerdict,
		simulationType: asString(row.simulation_type, 'message'),
		sender: sanitizeEnglishText(row.sender, 'Unknown sender'),
		messageBody: sanitizeEnglishText(
			row.message_body,
			'No English simulation copy is available for this mission yet.'
		),
		difficulty: asString(row.difficulty, 'medium'),
		tip: sanitizeEnglishText(
			row.tip,
			'Pause before responding, verify the sender independently, and never share credentials or payment approvals.'
		),
		variant: typeof row.variant === 'number' ? row.variant : 1,
		clues: normalizeClues(row.clues_json)
	};
}

function isMissingExpectedVerdictColumn(error: { message?: string } | null): boolean {
	return Boolean(error?.message?.includes('column missions.expected_verdict does not exist'));
}

function withDefaultExpectedVerdict(row: unknown): MissionRow {
	const mission = row as Partial<MissionRow>;

	return {
		id: typeof mission.id === 'number' ? mission.id : 0,
		article_id: typeof mission.article_id === 'number' ? mission.article_id : null,
		fraud_type: mission.fraud_type ?? null,
		expected_verdict: mission.expected_verdict ?? 'scam',
		simulation_type: mission.simulation_type ?? null,
		sender: mission.sender ?? null,
		message_body: mission.message_body ?? null,
		difficulty: mission.difficulty ?? null,
		tip: mission.tip ?? null,
		variant: typeof mission.variant === 'number' ? mission.variant : null,
		clues_json: mission.clues_json ?? null
	};
}

export async function fetchMissionForArticle(articleId: number): Promise<ThreatMission | null> {
	let { data, error } = await supabase
		.from('missions')
		.select(MISSION_SELECT)
		.eq('article_id', articleId)
		.eq('status', 'active')
		.order('variant', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (isMissingExpectedVerdictColumn(error)) {
		({ data, error } = await supabase
			.from('missions')
			.select(LEGACY_MISSION_SELECT)
			.eq('article_id', articleId)
			.eq('status', 'active')
			.order('variant', { ascending: true })
			.limit(1)
			.maybeSingle());
	}

	if (error) {
		console.error('[missions] Failed to fetch mission for article:', error.message);
		return null;
	}

	if (!data) {
		return null;
	}

	return normalizeMission(withDefaultExpectedVerdict(data));
}

export async function fetchRandomActiveMission(filters?: {
	difficulty?: string | null;
	fraudType?: string | null;
}): Promise<ThreatMission | null> {
	const { difficulty, fraudType } = filters ?? {};
	let query = supabase
		.from('missions')
		.select(MISSION_SELECT)
		.eq('status', 'active');

	if (difficulty) {
		query = query.eq('difficulty', difficulty);
	}

	if (fraudType) {
		query = query.eq('fraud_type', fraudType);
	}

	let { data, error } = await query;

	if (isMissingExpectedVerdictColumn(error)) {
		let legacyQuery = supabase.from('missions').select(LEGACY_MISSION_SELECT).eq('status', 'active');

		if (difficulty) {
			legacyQuery = legacyQuery.eq('difficulty', difficulty);
		}

		if (fraudType) {
			legacyQuery = legacyQuery.eq('fraud_type', fraudType);
		}

		const legacyResult = await legacyQuery;
		data = legacyResult.data as typeof data;
		error = legacyResult.error;
	}

	if (error) {
		console.error('[missions] Failed to fetch random mission pool:', error.message);
		return null;
	}

	if (!data || data.length === 0) {
		return null;
	}

	const randomIndex = Math.floor(Math.random() * data.length);
	return normalizeMission(withDefaultExpectedVerdict(data[randomIndex]));
}

export async function fetchMissionById(id: number): Promise<ThreatMission | null> {
	let { data, error } = await supabase
		.from('missions')
		.select(MISSION_SELECT)
		.eq('id', id)
		.maybeSingle();

	if (isMissingExpectedVerdictColumn(error)) {
		({ data, error } = await supabase
			.from('missions')
			.select(LEGACY_MISSION_SELECT)
			.eq('id', id)
			.maybeSingle());
	}

	if (error || !data) {
		console.error('[missions] Failed to fetch mission by ID:', error?.message);
		return null;
	}

	return normalizeMission(withDefaultExpectedVerdict(data));
}

function buildFallbackMessageBody(article: ThreatArticle): string {
	const segments = [
		`Source: ${article.source}`,
		`Channel: ${article.channel}`,
		'',
		article.scenarioSummary,
		'',
		article.body
	]
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);

	const combined = segments.join('\n\n');
	return combined.length > 1400 ? `${combined.slice(0, 1397)}...` : combined;
}

export function buildFallbackMissionFromArticle(article: ThreatArticle): ThreatMission {
	const clues: MissionClue[] = article.clues.map((clue, index) => ({
		id: index + 1,
		triggerText: clue.clueText,
		type: clue.type,
		difficulty: 'medium',
		explanation: clue.explanation
	}));

	return {
		id: article.id,
		articleId: article.id,
		fraudType: article.category,
		expectedVerdict: 'scam',
		simulationType: 'message',
		sender: article.source,
		messageBody: buildFallbackMessageBody(article),
		difficulty: 'medium',
		tip: article.tip,
		variant: 1,
		clues
	};
}
