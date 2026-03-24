import { z } from 'zod';
import { FRAUD_CATEGORIES } from './constants.js';

const CHANNELS = ['SMS', 'WhatsApp', 'email', 'phone_call', 'social_media'] as const;
const CLUE_TYPES = [
	'urgency',
	'fake_link',
	'unknown_sender',
	'credential_request',
	'too_good',
	'fake_authority',
	'upfront_fee'
] as const;

export const ClueSchema = z.object({
	clue_text: z.string(),
	type: z.enum(CLUE_TYPES),
	explanation: z.string()
});

export const ClassificationSchema = z.object({
	fraud_type: z.enum(FRAUD_CATEGORIES),
	channel: z.enum(CHANNELS),
	scenario_summary: z.string(),
	victim_profile: z.string(),
	clues: z.array(ClueSchema).min(1).max(6),
	red_flags: z.array(z.string()).min(1).max(5),
	tip: z.string()
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function asString(value: unknown, fallback = ''): string {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => asString(entry))
		.filter((entry) => entry.length > 0)
		.slice(0, 5);
}

function prefersEnglish(value: string, fallback: string): string {
	return DEVANAGARI_REGEX.test(value) ? fallback : value;
}

export function normalizeClassificationResult(raw: unknown): ClassificationResult | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;
	const fraudType = asString(candidate.fraud_type);

	if (!FRAUD_CATEGORIES.includes(fraudType as (typeof FRAUD_CATEGORIES)[number])) {
		return null;
	}

	const normalizedClues = Array.isArray(candidate.clues)
		? candidate.clues
				.map((entry) => {
					if (typeof entry !== 'object' || entry === null) {
						return null;
					}

					const clue = entry as Record<string, unknown>;
					const clueType = asString(clue.type, 'urgency');

					if (!CLUE_TYPES.includes(clueType as (typeof CLUE_TYPES)[number])) {
						return null;
					}

					return {
						clue_text: prefersEnglish(
							asString(clue.clue_text, 'Review this suspicious message pattern carefully.'),
							'Review this suspicious message pattern carefully.'
						),
						type: clueType as (typeof CLUE_TYPES)[number],
						explanation: prefersEnglish(
							asString(
								clue.explanation,
								'This pattern should be verified carefully before you trust the message.'
							),
							'This pattern should be verified carefully before you trust the message.'
						)
					};
				})
				.filter((entry): entry is z.infer<typeof ClueSchema> => entry !== null)
				.slice(0, 6)
		: [];

	const normalized = {
		fraud_type: fraudType as ClassificationResult['fraud_type'],
		channel: CHANNELS.includes(asString(candidate.channel) as (typeof CHANNELS)[number])
			? (asString(candidate.channel) as ClassificationResult['channel'])
			: 'SMS',
		scenario_summary: prefersEnglish(
			asString(
				candidate.scenario_summary,
				'ShieldByte classified this case and extracted the key scam patterns for review.'
			),
			'ShieldByte classified this case and extracted the key scam patterns for review.'
		),
		victim_profile: prefersEnglish(
			asString(
				candidate.victim_profile,
				'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
			),
			'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
		),
		clues:
			normalizedClues.length > 0
				? normalizedClues
				: [
						{
							clue_text: 'Review this suspicious message pattern carefully.',
							type: 'urgency' as const,
							explanation:
								'This pattern should be verified carefully before you trust the message.'
						}
					],
		red_flags: (() => {
			const flags = asStringArray(candidate.red_flags).map((entry) =>
				prefersEnglish(entry, 'Unexpected pressure or suspicious contact details')
			);
			return flags.length > 0 ? flags : ['Unexpected pressure or suspicious contact details'];
		})(),
		tip: prefersEnglish(
			asString(
				candidate.tip,
				'Verify the sender independently and never share credentials, OTPs, or payment approvals.'
			),
			'Verify the sender independently and never share credentials, OTPs, or payment approvals.'
		)
	};

	const validated = ClassificationSchema.safeParse(normalized);
	return validated.success ? validated.data : null;
}
