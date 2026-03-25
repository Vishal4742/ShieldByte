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

export async function fetchMissionForArticle(articleId: number): Promise<ThreatMission | null> {
	const { data, error } = await supabase
		.from('missions')
		.select(
			'id, article_id, fraud_type, expected_verdict, simulation_type, sender, message_body, difficulty, tip, variant, clues_json'
		)
		.eq('article_id', articleId)
		.eq('status', 'active')
		.order('variant', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('[missions] Failed to fetch mission for article:', error.message);
		return null;
	}

	if (!data) {
		return null;
	}

	return normalizeMission(data as MissionRow);
}

export async function fetchRandomActiveMission(filters?: {
	difficulty?: string | null;
	fraudType?: string | null;
}): Promise<ThreatMission | null> {
	const { difficulty, fraudType } = filters ?? {};
	let query = supabase
		.from('missions')
		.select(
			'id, article_id, fraud_type, expected_verdict, simulation_type, sender, message_body, difficulty, tip, variant, clues_json'
		)
		.eq('status', 'active');

	if (difficulty) {
		query = query.eq('difficulty', difficulty);
	}

	if (fraudType) {
		query = query.eq('fraud_type', fraudType);
	}

	const { data, error } = await query;

	if (error) {
		console.error('[missions] Failed to fetch random mission pool:', error.message);
		return null;
	}

	if (!data || data.length === 0) {
		return null;
	}

	const randomIndex = Math.floor(Math.random() * data.length);
	return normalizeMission(data[randomIndex] as MissionRow);
}

export async function fetchMissionById(id: number): Promise<ThreatMission | null> {
	const { data, error } = await supabase
		.from('missions')
		.select('id, article_id, fraud_type, expected_verdict, simulation_type, sender, message_body, difficulty, tip, variant, clues_json')
		.eq('id', id)
		.maybeSingle();

	if (error || !data) {
		console.error('[missions] Failed to fetch mission by ID:', error?.message);
		return null;
	}

	return normalizeMission(data as MissionRow);
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
