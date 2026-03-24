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
	clues: z.array(ClueSchema).min(3).max(6),
	red_flags: z.array(z.string()).min(3).max(5),
	tip: z.string()
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;
const GENERIC_RED_FLAGS = [
	'Unexpected pressure to act quickly',
	'Request to trust a link, number, or sender without verification',
	'Request for sensitive details, approval, or money'
];
const GENERIC_CLUE_TEXTS = [
	'Unexpected urgency or pressure',
	'Unverified sender or contact details',
	'Request for credentials, OTP, or payment approval'
];

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

function firstNonEmptyString(...values: unknown[]): string {
	for (const value of values) {
		const text = asString(value);
		if (text) {
			return text;
		}
	}

	return '';
}

function objectToSentence(value: unknown): string {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return '';
	}

	const parts = Object.entries(value as Record<string, unknown>)
		.map(([key, entry]) => {
			const text = asString(entry);
			return text ? `${key.replace(/_/g, ' ')}: ${text}` : '';
		})
		.filter((entry) => entry.length > 0);

	return parts.join('; ');
}

function padRedFlags(flags: string[]): string[] {
	const uniqueFlags = [...new Set(flags.filter((entry) => entry.length > 0))];
	for (const fallback of GENERIC_RED_FLAGS) {
		if (uniqueFlags.length >= 3) {
			break;
		}
		if (!uniqueFlags.includes(fallback)) {
			uniqueFlags.push(fallback);
		}
	}

	return uniqueFlags.slice(0, 5);
}

function padClues(clues: z.infer<typeof ClueSchema>[]): z.infer<typeof ClueSchema>[] {
	const result = [...clues];
	for (const fallback of GENERIC_CLUE_TEXTS) {
		if (result.length >= 3) {
			break;
		}
		result.push({
			clue_text: fallback,
			type: result.length === 2 ? 'credential_request' : result.length === 1 ? 'unknown_sender' : 'urgency',
			explanation: 'This pattern should be checked carefully before you trust the message.'
		});
	}

	return result.slice(0, 6);
}

function normalizeFraudType(value: unknown): ClassificationResult['fraud_type'] | null {
	const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, '_');

	const aliases: Record<string, ClassificationResult['fraud_type']> = {
		upi: 'UPI_fraud',
		upi_fraud: 'UPI_fraud',
		upi_scam: 'UPI_fraud',
		kyc: 'KYC_fraud',
		kyc_fraud: 'KYC_fraud',
		kyc_scam: 'KYC_fraud',
		lottery: 'lottery_fraud',
		lottery_fraud: 'lottery_fraud',
		lottery_scam: 'lottery_fraud',
		job: 'job_scam',
		job_scam: 'job_scam',
		job_fraud: 'job_scam',
		employment_scam: 'job_scam',
		investment: 'investment_fraud',
		investment_fraud: 'investment_fraud',
		investment_scam: 'investment_fraud',
		customer_support: 'customer_support_scam',
		customer_support_scam: 'customer_support_scam',
		customer_care_scam: 'customer_support_scam',
		support_scam: 'customer_support_scam'
	};

	return aliases[normalized] ?? null;
}

function normalizeChannel(value: unknown): ClassificationResult['channel'] {
	const normalized = asString(value).toLowerCase().replace(/[\s-]+/g, '_');

	const aliases: Record<string, ClassificationResult['channel']> = {
		sms: 'SMS',
		text: 'SMS',
		text_message: 'SMS',
		whatsapp: 'WhatsApp',
		email: 'email',
		phone: 'phone_call',
		call: 'phone_call',
		phone_call: 'phone_call',
		voice_call: 'phone_call',
		social: 'social_media',
		social_media: 'social_media',
		socialmedia: 'social_media'
	};

	return aliases[normalized] ?? 'SMS';
}

function normalizeClueType(value: unknown): (typeof CLUE_TYPES)[number] {
	const normalized = asString(value, 'urgency').toLowerCase().replace(/[\s-]+/g, '_');

	const aliases: Record<string, (typeof CLUE_TYPES)[number]> = {
		urgency: 'urgency',
		urgent: 'urgency',
		fake_link: 'fake_link',
		link: 'fake_link',
		suspicious_link: 'fake_link',
		unknown_sender: 'unknown_sender',
		unknown_contact: 'unknown_sender',
		credential_request: 'credential_request',
		credentials: 'credential_request',
		otp_request: 'credential_request',
		too_good: 'too_good',
		too_good_to_be_true: 'too_good',
		fake_authority: 'fake_authority',
		authority: 'fake_authority',
		upfront_fee: 'upfront_fee',
		advance_fee: 'upfront_fee'
	};

	return aliases[normalized] ?? 'urgency';
}

export function normalizeClassificationResult(raw: unknown): ClassificationResult | null {
	if (typeof raw !== 'object' || raw === null) {
		return null;
	}

	const candidate = raw as Record<string, unknown>;
	const fraudType = normalizeFraudType(
		firstNonEmptyString(
			candidate.fraud_type,
			candidate.fraudType,
			candidate.scam_type,
			candidate.scamType,
			candidate.category,
			candidate.fraud_category
		)
	);

	if (!fraudType) {
		return null;
	}

	const normalizedClues = Array.isArray(candidate.clues)
		? candidate.clues
				.map((entry) => {
					if (typeof entry === 'string') {
						const clueText = prefersEnglish(
							asString(entry, 'Review this suspicious message pattern carefully.'),
							'Review this suspicious message pattern carefully.'
						);

						return {
							clue_text: clueText,
							type: 'urgency' as const,
							explanation: 'This message detail should be checked carefully before you trust it.'
						};
					}

					if (typeof entry !== 'object' || entry === null) {
						return null;
					}

					const clue = entry as Record<string, unknown>;
					const clueType = normalizeClueType(clue.type ?? clue.kind ?? clue.category);

					return {
						clue_text: prefersEnglish(
							firstNonEmptyString(
								clue.clue_text,
								clue.trigger_text,
								clue.text,
								clue.marker,
								'Review this suspicious message pattern carefully.'
							),
							'Review this suspicious message pattern carefully.'
						),
						type: clueType as (typeof CLUE_TYPES)[number],
						explanation: prefersEnglish(
							firstNonEmptyString(
								clue.explanation,
								clue.reason,
								clue.why,
								'This pattern should be verified carefully before you trust the message.'
							),
							'This pattern should be verified carefully before you trust the message.'
						)
					};
				})
				.filter((entry): entry is z.infer<typeof ClueSchema> => entry !== null)
				.slice(0, 6)
		: [];

	const normalizedRedFlags = (() => {
		const directFlags = asStringArray(candidate.red_flags);
		if (directFlags.length > 0) {
			return directFlags.map((entry) =>
				prefersEnglish(entry, 'Unexpected pressure or suspicious contact details')
			);
		}

		if (Array.isArray(candidate.requested_actions)) {
			return candidate.requested_actions
				.map((entry) => asString(entry))
				.filter((entry) => entry.length > 0)
				.slice(0, 5)
				.map((entry) => `Asked to ${entry}`);
		}

		return [];
	})();

	const victimProfile = firstNonEmptyString(
		candidate.victim_profile,
		candidate.target,
		candidate.target_user,
		objectToSentence(candidate.victim_profile)
	);

	const scenarioSummary = firstNonEmptyString(
		candidate.scenario_summary,
		candidate.summary,
		candidate.scam_summary,
		candidate.description,
		candidate.purpose
	);

	const tip = firstNonEmptyString(
		candidate.tip,
		candidate.actionable_tip,
		candidate.prevention_tip,
		candidate.safety_tip
	);

	const normalized = {
		fraud_type: fraudType,
		channel: normalizeChannel(candidate.channel ?? candidate.medium ?? candidate.platform),
		scenario_summary: prefersEnglish(
			asString(
				scenarioSummary,
				'ShieldByte classified this case and extracted the key scam patterns for review.'
			),
			'ShieldByte classified this case and extracted the key scam patterns for review.'
		),
		victim_profile: prefersEnglish(
			asString(
				victimProfile,
				'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
			),
			'General digital users exposed to high-pressure payment, identity, or authority-based scams.'
		),
		clues: normalizedClues,
		red_flags: padRedFlags(normalizedRedFlags),
		tip: prefersEnglish(
			asString(
				tip,
				'Verify the sender independently and never share credentials, OTPs, or payment approvals.'
			),
			'Verify the sender independently and never share credentials, OTPs, or payment approvals.'
		)
	};

	normalized.clues = padClues(normalized.clues);

	const validated = ClassificationSchema.safeParse(normalized);
	return validated.success ? validated.data : null;
}
