import { supabase } from './supabase.js';
import type { ThreatArticle, ThreatClue, ThreatExtractionField } from '$lib/types/threat.js';
import { normalizeClassificationResult } from './extraction.js';

interface FraudArticleRow {
	id: number;
	source: string | null;
	title: string | null;
	body: string | null;
	url: string | null;
	published_at: string | null;
	category: string | null;
	classification_confidence: number | null;
	raw_extraction: unknown;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function asString(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function sanitizeEnglishText(value: unknown, fallback: string): string {
	const normalized = asString(value, fallback);
	return DEVANAGARI_REGEX.test(normalized) ? fallback : normalized;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => asString(entry))
		.filter((entry) => entry.length > 0 && !DEVANAGARI_REGEX.test(entry))
		.slice(0, 5);
}

function asClues(value: unknown): ThreatClue[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((entry) => {
			if (typeof entry !== 'object' || entry === null) {
				return null;
			}

			const clue = entry as Record<string, unknown>;
			const clueText = sanitizeEnglishText(
				clue.clue_text,
				'Review this suspicious message pattern carefully.'
			);
			const type = asString(clue.type, 'signal');
			const explanation = sanitizeEnglishText(
				clue.explanation,
				'This pattern should be verified carefully before you trust the message.'
			);

			if (!clueText || !explanation) {
				return null;
			}

			return {
				clueText,
				type,
				explanation
			};
		})
		.filter((entry): entry is ThreatClue => entry !== null)
		.slice(0, 6);
}

function titleizeKey(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function asDisplayValue(value: unknown): string | string[] | null {
	if (typeof value === 'string') {
		const normalized = value.trim();
		return normalized.length > 0 && !DEVANAGARI_REGEX.test(normalized) ? normalized : null;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (Array.isArray(value)) {
		const entries = value
			.map((entry) => {
				if (typeof entry === 'string') {
					return DEVANAGARI_REGEX.test(entry.trim()) ? '' : entry.trim();
				}

				if (typeof entry === 'number' || typeof entry === 'boolean') {
					return String(entry);
				}

				if (typeof entry === 'object' && entry !== null) {
					const clue = entry as Record<string, unknown>;
					return (
						sanitizeEnglishText(clue.clue_text, '') ||
						sanitizeEnglishText(clue.explanation, '') ||
						''
					);
				}

				return '';
			})
			.filter((entry) => entry.length > 0)
			.slice(0, 6);

		return entries.length > 0 ? entries : null;
	}

	if (typeof value === 'object' && value !== null) {
		return JSON.stringify(value);
	}

	return null;
}

function toRawExtractionFields(extraction: Record<string, unknown>): ThreatExtractionField[] {
	return Object.entries(extraction)
		.map(([key, value]) => {
			const displayValue = asDisplayValue(value);
			if (!displayValue) {
				return null;
			}

			return {
				label: titleizeKey(key),
				value: displayValue
			};
		})
		.filter((entry): entry is ThreatExtractionField => entry !== null);
}

function normalizeArticle(row: FraudArticleRow): ThreatArticle {
	const extraction = normalizeClassificationResult(row.raw_extraction);
	const safeExtraction = (extraction ?? {}) as Record<string, unknown>;
	const scenarioSummary = asString(
		extraction?.scenario_summary,
		'ShieldByte has classified this case and extracted the most relevant scam patterns for review.'
	);
	const victimProfile = asString(
		extraction?.victim_profile,
		'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
	);
	const clues = asClues(extraction?.clues);
	const redFlags = asStringArray(extraction?.red_flags);

	return {
		id: row.id,
		source: asString(row.source, 'Unknown source'),
		title: sanitizeEnglishText(row.title, 'Untitled threat bulletin'),
		body: sanitizeEnglishText(row.body, 'No English body content is available for this article.'),
		url: asString(row.url, '#'),
		publishedAt: row.published_at,
		category: asString(row.category, extraction?.fraud_type ?? 'unclassified'),
		confidence:
			typeof row.classification_confidence === 'number' ? row.classification_confidence : null,
		channel: sanitizeEnglishText(extraction?.channel, 'Mixed channel'),
		scenarioSummary: sanitizeEnglishText(
			scenarioSummary,
			'ShieldByte has classified this case and extracted the most relevant scam patterns for review.'
		),
		victimProfile: sanitizeEnglishText(
			victimProfile,
			'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
		),
		clues,
		redFlags,
		tip: sanitizeEnglishText(
			extraction?.tip,
			'Verify the sender, slow the interaction down, and never share sensitive credentials or OTPs.'
		),
		rawExtractionFields: toRawExtractionFields(safeExtraction)
	};
}

function sortArticlesByPublishedDate(articles: ThreatArticle[]): ThreatArticle[] {
	return [...articles].sort((left, right) => {
		const leftTime = left.publishedAt ? Date.parse(left.publishedAt) : Number.NEGATIVE_INFINITY;
		const rightTime = right.publishedAt ? Date.parse(right.publishedAt) : Number.NEGATIVE_INFINITY;
		return rightTime - leftTime;
	});
}

export async function fetchRecentClassifiedArticles(limit = 6): Promise<ThreatArticle[]> {
	const { data, error } = await supabase
		.from('fraud_articles')
		.select(
			'id, source, title, body, url, published_at, category, classification_confidence, raw_extraction'
		)
		.eq('status', 'classified')
		.order('published_at', { ascending: false })
		.limit(limit);

	if (error) {
		console.error('[classified-articles] Failed to fetch articles:', error.message);
		return [];
	}

	return sortArticlesByPublishedDate(((data as FraudArticleRow[] | null) ?? []).map(normalizeArticle));
}

export async function fetchClassifiedArticleById(id: number): Promise<ThreatArticle | null> {
	const { data, error } = await supabase
		.from('fraud_articles')
		.select(
			'id, source, title, body, url, published_at, category, classification_confidence, raw_extraction'
		)
		.eq('id', id)
		.eq('status', 'classified')
		.maybeSingle();

	if (error) {
		console.error('[classified-articles] Failed to fetch article:', error.message);
		return null;
	}

	if (!data) {
		return null;
	}

	return normalizeArticle(data as FraudArticleRow);
}
