import { FRAUD_CATEGORIES, type FraudCategory } from './constants.js';
import type { ClassificationResult } from './extraction.js';

type Channel = ClassificationResult['channel'];
type ClueType = ClassificationResult['clues'][number]['type'];

interface WeightedPattern {
	pattern: string;
	weight: number;
}

interface CategorySignalProfile {
	keywords: string[];
	weightedPatterns: WeightedPattern[];
	channelHint: Channel;
	tip: string;
	victimProfile: string;
	redFlags: string[];
	clues: Array<{ type: ClueType; marker: string; explanation: string }>;
}

const CATEGORY_PROFILES: Record<FraudCategory, CategorySignalProfile> = {
	UPI_fraud: {
		keywords: [
			'upi',
			'gpay',
			'google pay',
			'phonepe',
			'paytm',
			'bhim',
			'collect request',
			'request money',
			'payment request',
			'qr code',
			'upi id',
			'vpa',
			'scan and pay'
		],
		weightedPatterns: [
			{ pattern: 'collect request', weight: 4 },
			{ pattern: 'request money', weight: 4 },
			{ pattern: 'approve payment', weight: 4 },
			{ pattern: 'scan qr', weight: 3 },
			{ pattern: 'refund scam', weight: 2 },
			{ pattern: 'upi id', weight: 3 }
		],
		channelHint: 'SMS',
		tip: 'Never approve collect requests or QR payments unless you initiated the transaction yourself.',
		victimProfile:
			'Digital payment users who are comfortable approving UPI requests quickly without verifying the source.',
		redFlags: [
			'Unexpected payment request or QR code',
			'Pressure to approve a collect request immediately',
			'Refund or reward story used to trigger fast action'
		],
		clues: [
			{
				type: 'credential_request',
				marker: 'collect request',
				explanation: 'Scammers trick victims into approving an outgoing payment instead of receiving money.'
			},
			{
				type: 'urgency',
				marker: 'urgent payment approval',
				explanation: 'Urgency reduces the chance that the victim will verify the transaction properly.'
			},
			{
				type: 'unknown_sender',
				marker: 'unverified payment contact',
				explanation: 'A payment request from an unknown identity should always be independently verified.'
			}
		]
	},
	KYC_fraud: {
		keywords: [
			'kyc',
			'know your customer',
			'aadhaar',
			'pan card',
			'pan',
			're-kyc',
			'kyc update',
			'verify account',
			'account blocked',
			'account freeze',
			'document update'
		],
		weightedPatterns: [
			{ pattern: 'kyc update', weight: 4 },
			{ pattern: 'complete kyc', weight: 4 },
			{ pattern: 'account will be blocked', weight: 4 },
			{ pattern: 'update pan', weight: 3 },
			{ pattern: 'update aadhaar', weight: 3 },
			{ pattern: 're-verify', weight: 2 }
		],
		channelHint: 'SMS',
		tip: 'Do KYC updates only inside the official bank or wallet app, never from links or unknown calls.',
		victimProfile:
			'Banking and wallet users who fear service disruption and may rush through identity update requests.',
		redFlags: [
			'Threat that the account will be blocked or frozen',
			'Request to update documents through a shared link',
			'Identity or OTP request outside the official app'
		],
		clues: [
			{
				type: 'fake_authority',
				marker: 'account blocked',
				explanation: 'Fake authority language is used to pressure victims into fast compliance.'
			},
			{
				type: 'credential_request',
				marker: 'document or OTP request',
				explanation: 'Legitimate KYC flows do not ask for sensitive verification over random links or chats.'
			},
			{
				type: 'fake_link',
				marker: 'kyc update link',
				explanation: 'A shared link for urgent KYC action is a common sign of fraud.'
			}
		]
	},
	lottery_fraud: {
		keywords: [
			'lottery',
			'jackpot',
			'prize',
			'won rs',
			'winner',
			'lucky draw',
			'reward amount',
			'cash reward',
			'prize money',
			'registration fee'
		],
		weightedPatterns: [
			{ pattern: 'you have won', weight: 4 },
			{ pattern: 'lucky draw', weight: 3 },
			{ pattern: 'prize money', weight: 3 },
			{ pattern: 'claim your prize', weight: 4 },
			{ pattern: 'processing fee', weight: 3 },
			{ pattern: 'registration fee', weight: 3 }
		],
		channelHint: 'WhatsApp',
		tip: 'Any prize that asks for a fee, tax, or advance payment is a scam.',
		victimProfile:
			'People attracted by sudden prize claims, especially when the message creates excitement or scarcity.',
		redFlags: [
			'Prize claim from an unknown sender',
			'Advance payment or tax required to release winnings',
			'Too-good-to-be-true reward with pressure to respond fast'
		],
		clues: [
			{
				type: 'too_good',
				marker: 'unexpected prize claim',
				explanation: 'Large unexpected rewards are used to trigger greed and suspend skepticism.'
			},
			{
				type: 'upfront_fee',
				marker: 'fee before release',
				explanation: 'Real prizes do not require an advance payment to unlock winnings.'
			},
			{
				type: 'unknown_sender',
				marker: 'unknown contest source',
				explanation: 'A prize message from an unknown number or sender is a strong warning sign.'
			}
		]
	},
	job_scam: {
		keywords: [
			'job',
			'job offer',
			'work from home',
			'part time',
			'part-time',
			'recruitment',
			'hiring',
			'interview',
			'resume',
			'telegram task',
			'task scam',
			'data entry',
			'joining fee'
		],
		weightedPatterns: [
			{ pattern: 'work from home', weight: 3 },
			{ pattern: 'part time job', weight: 3 },
			{ pattern: 'telegram task', weight: 4 },
			{ pattern: 'data entry job', weight: 3 },
			{ pattern: 'registration fee', weight: 3 },
			{ pattern: 'pay to join', weight: 4 }
		],
		channelHint: 'email',
		tip: 'Real employers do not ask for money, deposits, or prepaid tasks to release a job offer.',
		victimProfile:
			'Job seekers looking for fast income opportunities, especially students and early-career candidates.',
		redFlags: [
			'Payment required before interview or onboarding',
			'Vague company identity or unverifiable recruiter details',
			'Promise of easy income with minimal screening'
		],
		clues: [
			{
				type: 'upfront_fee',
				marker: 'payment before hiring',
				explanation: 'Legitimate employers do not charge candidates to issue offers or process onboarding.'
			},
			{
				type: 'too_good',
				marker: 'easy money promise',
				explanation: 'Unusually high pay for little work is a common lure in job scams.'
			},
			{
				type: 'unknown_sender',
				marker: 'unverified recruiter identity',
				explanation: 'A recruiter who cannot be tied to a real company should not be trusted.'
			}
		]
	},
	investment_fraud: {
		keywords: [
			'investment',
			'investor',
			'trading',
			'stock tip',
			'trading app',
			'crypto',
			'guaranteed return',
			'guaranteed returns',
			'double your money',
			'profit',
			'forex',
			'demat'
		],
		weightedPatterns: [
			{ pattern: 'guaranteed return', weight: 4 },
			{ pattern: 'daily profit', weight: 3 },
			{ pattern: 'stock tip', weight: 3 },
			{ pattern: 'trading group', weight: 3 },
			{ pattern: 'crypto investment', weight: 4 },
			{ pattern: 'double your money', weight: 4 }
		],
		channelHint: 'social_media',
		tip: 'Avoid any investment promise that guarantees high returns or pressures you to act quickly.',
		victimProfile:
			'People looking for quick returns or insider tips, often through social groups and chat channels.',
		redFlags: [
			'Guaranteed returns with little or no risk',
			'Pressure to move funds quickly to a private account',
			'Claims backed by screenshots instead of regulated proof'
		],
		clues: [
			{
				type: 'too_good',
				marker: 'guaranteed returns',
				explanation: 'Guaranteed investment returns are a classic fraud signal.'
			},
			{
				type: 'urgency',
				marker: 'limited-time investment pressure',
				explanation: 'Time pressure is used to stop victims from verifying the offer or platform.'
			},
			{
				type: 'fake_authority',
				marker: 'expert-backed claim',
				explanation: 'Scammers often pretend to be trusted experts or insiders without real credentials.'
			}
		]
	},
	customer_support_scam: {
		keywords: [
			'customer care',
			'customer support',
			'helpline',
			'toll free',
			'service center',
			'refund',
			'refund desk',
			'complaint number',
			'remote access',
			'anydesk',
			'teamviewer',
			'quicksupport'
		],
		weightedPatterns: [
			{ pattern: 'customer care number', weight: 4 },
			{ pattern: 'helpline number', weight: 4 },
			{ pattern: 'remote access', weight: 4 },
			{ pattern: 'install anydesk', weight: 5 },
			{ pattern: 'install teamviewer', weight: 5 },
			{ pattern: 'refund support', weight: 3 }
		],
		channelHint: 'phone_call',
		tip: 'Never install remote-access apps or share OTPs with anyone claiming to fix an account issue.',
		victimProfile:
			'Users facing account or delivery issues who may trust a fake support agent under pressure.',
		redFlags: [
			'Unverified support number found in a message or search result',
			'Request to install remote-control software',
			'OTP, card, or payment approval demanded during support'
		],
		clues: [
			{
				type: 'unknown_sender',
				marker: 'unverified support contact',
				explanation: 'Support contact details must be verified through the official product or website.'
			},
			{
				type: 'credential_request',
				marker: 'OTP or card details request',
				explanation: 'No real support agent should ask for OTPs or full payment credentials.'
			},
			{
				type: 'upfront_fee',
				marker: 'payment to fix issue',
				explanation: 'A demand for payment to resolve an account problem is a major red flag.'
			}
		]
	}
};

const GENERAL_FRAUD_PATTERNS: WeightedPattern[] = [
	{ pattern: 'fraud', weight: 1 },
	{ pattern: 'scam', weight: 1 },
	{ pattern: 'phishing', weight: 2 },
	{ pattern: 'cyber crime', weight: 1 },
	{ pattern: 'cybercrime', weight: 1 },
	{ pattern: 'online scam', weight: 2 },
	{ pattern: 'digital arrest', weight: 1 },
	{ pattern: 'otp', weight: 1 },
	{ pattern: 'fake call', weight: 1 },
	{ pattern: 'fake message', weight: 1 },
	{ pattern: 'suspicious link', weight: 1 }
];

export interface FraudSignalAnalysis {
	categoryHint: FraudCategory | null;
	relevanceScore: number;
	matchedKeywords: string[];
	isFraudLike: boolean;
	categoryScores: Record<FraudCategory, number>;
	scoreMargin: number;
	signalStrength: 'weak' | 'medium' | 'strong';
	channelHint: Channel | null;
}

export interface FraudRelevanceDecision {
	isRelevant: boolean;
	confidence: number;
	reasons: string[];
}

const NON_SCAM_CONTEXT_PATTERNS: WeightedPattern[] = [
	{ pattern: 'fight fraud', weight: 3 },
	{ pattern: 'fraud prevention', weight: 4 },
	{ pattern: 'prevent fraud', weight: 3 },
	{ pattern: 'anti money laundering', weight: 5 },
	{ pattern: 'money laundering', weight: 4 },
	{ pattern: 'awareness campaign', weight: 4 },
	{ pattern: 'compensation proposal', weight: 4 },
	{ pattern: 'proposal', weight: 1 },
	{ pattern: 'guidelines', weight: 2 },
	{ pattern: 'advisory', weight: 3 },
	{ pattern: 'policy', weight: 2 },
	{ pattern: 'compliance', weight: 3 },
	{ pattern: 'tooling', weight: 2 },
	{ pattern: 'software', weight: 1 },
	{ pattern: 'platform', weight: 1 },
	{ pattern: 'ai vs ai', weight: 5 },
	{ pattern: 'future of fraud prevention', weight: 5 },
	{ pattern: 'to fight money laundering', weight: 5 },
	{ pattern: 'rolls out', weight: 3 },
	{ pattern: 'to launch in india', weight: 4 },
	{ pattern: 'smartphone', weight: 4 },
	{ pattern: 'feature', weight: 2 },
	{ pattern: 'government rescuing', weight: 3 },
	{ pattern: 'workshop', weight: 3 },
	{ pattern: 'study', weight: 2 },
	{ pattern: 'delegation', weight: 2 },
	{ pattern: 'announcement', weight: 2 },
	{ pattern: 'announces', weight: 2 },
	{ pattern: 'ministry', weight: 3 },
	{ pattern: 'railways', weight: 3 },
	{ pattern: 'pm-kisan', weight: 5 },
	{ pattern: 'घोषणा', weight: 3 },
	{ pattern: 'कार्यशाला', weight: 3 },
	{ pattern: 'अध्ययन', weight: 2 },
	{ pattern: 'मंत्रालय', weight: 3 },
	{ pattern: 'किसान', weight: 4 },
	{ pattern: 'सहकारी', weight: 4 },
	{ pattern: 'युवा', weight: 2 }
];

const SCAM_INCIDENT_PATTERNS: WeightedPattern[] = [
	{ pattern: 'victim', weight: 2 },
	{ pattern: 'scammers', weight: 2 },
	{ pattern: 'posed as', weight: 3 },
	{ pattern: 'pretending to be', weight: 3 },
	{ pattern: 'duped', weight: 3 },
	{ pattern: 'cheated', weight: 2 },
	{ pattern: 'defrauded', weight: 2 },
	{ pattern: 'lost rs', weight: 3 },
	{ pattern: 'lost money', weight: 3 },
	{ pattern: 'transferred money', weight: 2 },
	{ pattern: 'shared otp', weight: 4 },
	{ pattern: 'clicked the link', weight: 3 },
	{ pattern: 'collect request', weight: 4 },
	{ pattern: 'remote access', weight: 4 },
	{ pattern: 'job offer', weight: 2 },
	{ pattern: 'guaranteed return', weight: 4 }
];

function normalizeText(...values: Array<string | null | undefined>): string {
	return values
		.map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function findKeywordHits(text: string, keywords: string[]): string[] {
	return keywords.filter((keyword) => text.includes(keyword.toLowerCase()));
}

function findWeightedHits(text: string, patterns: WeightedPattern[]): WeightedPattern[] {
	return patterns.filter((entry) => text.includes(entry.pattern));
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

function toSentenceCase(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function extractSnippet(text: string, markers: string[], fallback: string): string {
	const lowerText = text.toLowerCase();

	for (const marker of markers) {
		const index = lowerText.indexOf(marker.toLowerCase());
		if (index === -1) continue;

		const start = Math.max(0, index - 24);
		const end = Math.min(text.length, index + marker.length + 24);
		return text.slice(start, end).replace(/\s+/g, ' ').trim();
	}

	return fallback;
}

function inferSignalStrength(bestScore: number, margin: number): FraudSignalAnalysis['signalStrength'] {
	if (bestScore >= 8 && margin >= 3) {
		return 'strong';
	}

	if (bestScore >= 4 && margin >= 1) {
		return 'medium';
	}

	return 'weak';
}

function chooseFallbackChannel(
	current: Channel,
	category: FraudCategory,
	analysis: FraudSignalAnalysis
): Channel {
	if (analysis.channelHint && analysis.signalStrength === 'strong') {
		return analysis.channelHint;
	}

	return current || CATEGORY_PROFILES[category].channelHint;
}

export function analyzeFraudSignals(title: string, body?: string | null): FraudSignalAnalysis {
	const text = normalizeText(title, body);
	const generalHits = findWeightedHits(text, GENERAL_FRAUD_PATTERNS);
	const categoryScores = {} as Record<FraudCategory, number>;
	const matchedKeywords: string[] = [];

	let bestCategory: FraudCategory | null = null;
	let bestScore = 0;
	let secondBestScore = 0;

	for (const category of FRAUD_CATEGORIES) {
		const profile = CATEGORY_PROFILES[category];
		const keywordHits = findKeywordHits(text, profile.keywords);
		const weightedHits = findWeightedHits(text, profile.weightedPatterns);
		const score =
			keywordHits.length * 1.4 +
			weightedHits.reduce((sum, entry) => sum + entry.weight, 0) +
			Math.min(2, generalHits.length * 0.3);

		categoryScores[category] = Number(score.toFixed(2));

		if (keywordHits.length > 0) {
			matchedKeywords.push(...keywordHits);
		}
		if (weightedHits.length > 0) {
			matchedKeywords.push(...weightedHits.map((entry) => entry.pattern));
		}

		if (score > bestScore) {
			secondBestScore = bestScore;
			bestScore = score;
			bestCategory = category;
		} else if (score > secondBestScore) {
			secondBestScore = score;
		}
	}

	const scoreMargin = Number(Math.max(0, bestScore - secondBestScore).toFixed(2));
	const signalStrength = inferSignalStrength(bestScore, scoreMargin);
	const relevanceScore = Number(
		Math.min(1, (bestScore + Math.min(3, generalHits.length)) / 10).toFixed(2)
	);
	const isFraudLike =
		relevanceScore >= 0.35 && (bestCategory !== null || generalHits.length >= 2);

	return {
		categoryHint: bestCategory,
		relevanceScore,
		matchedKeywords: unique([...matchedKeywords, ...generalHits.map((entry) => entry.pattern)]).slice(
			0,
			16
		),
		isFraudLike,
		categoryScores,
		scoreMargin,
		signalStrength,
		channelHint: bestCategory ? CATEGORY_PROFILES[bestCategory].channelHint : null
	};
}

export function assessFraudRelevance(
	title: string,
	body: string | null | undefined,
	analysis?: FraudSignalAnalysis
): FraudRelevanceDecision {
	const signalAnalysis = analysis ?? analyzeFraudSignals(title, body);
	const text = normalizeText(title, body);
	const negativeHits = findWeightedHits(text, NON_SCAM_CONTEXT_PATTERNS);
	const positiveHits = findWeightedHits(text, SCAM_INCIDENT_PATTERNS);
	const negativeScore = negativeHits.reduce((sum, entry) => sum + entry.weight, 0);
	const positiveScore = positiveHits.reduce((sum, entry) => sum + entry.weight, 0) + signalAnalysis.relevanceScore * 4;
	const reasons = unique([
		...negativeHits.map((entry) => `non_scam:${entry.pattern}`),
		...positiveHits.map((entry) => `scam:${entry.pattern}`)
	]).slice(0, 8);

	if (negativeScore >= positiveScore + 3) {
		return {
			isRelevant: false,
			confidence: Number(Math.min(0.98, 0.7 + Math.min(0.24, (negativeScore - positiveScore) * 0.04)).toFixed(2)),
			reasons
		};
	}

	if (signalAnalysis.relevanceScore < 0.28 && negativeScore >= 2 && positiveScore < 4) {
		return {
			isRelevant: false,
			confidence: 0.78,
			reasons
		};
	}

	const normalizedBody = normalizeText(body);
	if (!normalizedBody && signalAnalysis.relevanceScore < 0.4 && positiveScore < 3) {
		return {
			isRelevant: false,
			confidence: 0.76,
			reasons
		};
	}

	return {
		isRelevant: true,
		confidence: Number(Math.min(0.95, 0.55 + Math.min(0.3, positiveScore * 0.03 + signalAnalysis.relevanceScore * 0.2)).toFixed(2)),
		reasons
	};
}

export function buildFallbackClassification(input: {
	title: string;
	body?: string | null;
	categoryHint: FraudCategory;
}): ClassificationResult {
	const combinedText = `${input.title} ${input.body ?? ''}`.trim();
	const profile = CATEGORY_PROFILES[input.categoryHint];
	const clues = profile.clues.map((template) => ({
		clue_text: extractSnippet(combinedText, [template.marker], toSentenceCase(template.marker)),
		type: template.type,
		explanation: template.explanation
	}));

	return {
		fraud_type: input.categoryHint,
		channel: profile.channelHint,
		scenario_summary: `${input.title.trim()} This article describes a ${input.categoryHint.replace(/_/g, ' ')} pattern affecting everyday users in India.`,
		victim_profile: profile.victimProfile,
		clues,
		red_flags: profile.redFlags,
		tip: profile.tip
	};
}

export function reconcileClassificationResult(params: {
	result: ClassificationResult;
	analysis: FraudSignalAnalysis;
}): ClassificationResult {
	const { result, analysis } = params;
	const categoryHint = analysis.categoryHint;

	if (!categoryHint) {
		return result;
	}

	if (result.fraud_type === categoryHint) {
		return {
			...result,
			channel: chooseFallbackChannel(result.channel, categoryHint, analysis)
		};
	}

	if (analysis.signalStrength !== 'strong') {
		return result;
	}

	const modelScore = analysis.categoryScores[result.fraud_type] ?? 0;
	const hintScore = analysis.categoryScores[categoryHint] ?? 0;

	if (hintScore < modelScore + 2) {
		return result;
	}

	return {
		...result,
		fraud_type: categoryHint,
		channel: chooseFallbackChannel(result.channel, categoryHint, analysis),
		victim_profile: result.victim_profile || CATEGORY_PROFILES[categoryHint].victimProfile,
		tip: result.tip || CATEGORY_PROFILES[categoryHint].tip
	};
}

export function estimateClassificationConfidence(params: {
	result: ClassificationResult;
	categoryHint: FraudCategory | null;
	relevanceScore: number;
	method: 'ai' | 'heuristic';
	signalStrength?: FraudSignalAnalysis['signalStrength'];
	scoreMargin?: number;
}): number {
	const { result, categoryHint, relevanceScore, method, signalStrength, scoreMargin = 0 } = params;
	let confidence = method === 'ai' ? 0.58 : 0.46;

	if (categoryHint && result.fraud_type === categoryHint) {
		confidence += signalStrength === 'strong' ? 0.18 : signalStrength === 'medium' ? 0.12 : 0.06;
	} else if (categoryHint && signalStrength === 'strong') {
		confidence -= 0.12;
	}

	if (result.clues.length >= 3) {
		confidence += 0.06;
	}

	if (result.red_flags.length >= 3) {
		confidence += 0.05;
	}

	if (result.scenario_summary.length >= 50) {
		confidence += 0.05;
	}

	if (result.tip.length >= 20) {
		confidence += 0.03;
	}

	confidence += Math.min(0.12, relevanceScore * 0.12);
	confidence += Math.min(0.08, scoreMargin * 0.02);

	return Number(Math.min(method === 'ai' ? 0.96 : 0.76, Math.max(0.2, confidence)).toFixed(2));
}

export function determineReviewStatus(params: {
	confidence: number;
	method: 'ai' | 'heuristic';
	categoryHint: FraudCategory | null;
	result: ClassificationResult;
	signalStrength?: FraudSignalAnalysis['signalStrength'];
}): 'auto_approved' | 'needs_review' {
	const { confidence, method, categoryHint, result, signalStrength } = params;

	if (method !== 'ai') {
		return 'needs_review';
	}

	if (categoryHint && result.fraud_type !== categoryHint && signalStrength === 'strong') {
		return 'needs_review';
	}

	return confidence >= 0.86 ? 'auto_approved' : 'needs_review';
}
