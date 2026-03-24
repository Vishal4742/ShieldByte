import { FRAUD_CATEGORIES, type FraudCategory } from './constants.js';
import type { ClassificationResult } from './extraction.js';

const CATEGORY_KEYWORDS: Record<FraudCategory, string[]> = {
	UPI_fraud: [
		'upi',
		'gpay',
		'google pay',
		'phonepe',
		'paytm',
		'collect request',
		'payment request',
		'qr code',
		'refund scam'
	],
	KYC_fraud: [
		'kyc',
		'know your customer',
		'aadhaar',
		'pan card',
		'account blocked',
		'account suspension',
		're-verify',
		'document update'
	],
	lottery_fraud: [
		'lottery',
		'jackpot',
		'prize',
		'won rs',
		'lucky draw',
		'cash reward',
		'registration fee'
	],
	job_scam: [
		'job offer',
		'work from home',
		'part time',
		'recruitment',
		'hiring',
		'interview',
		'telegram task',
		'joining fee'
	],
	investment_fraud: [
		'investment',
		'trading',
		'stock tip',
		'crypto',
		'guaranteed return',
		'double your money',
		'profit',
		'forex'
	],
	customer_support_scam: [
		'customer care',
		'customer support',
		'helpline',
		'refund',
		'remote access',
		'anydesk',
		'teamviewer',
		'service center'
	]
};

const GENERAL_FRAUD_KEYWORDS = [
	'fraud',
	'scam',
	'phishing',
	'cyber crime',
	'cybercrime',
	'online scam',
	'digital arrest',
	'otp',
	'suspicious link',
	'fake call',
	'fake message'
];

const CATEGORY_CHANNELS: Record<FraudCategory, ClassificationResult['channel']> = {
	UPI_fraud: 'SMS',
	KYC_fraud: 'SMS',
	lottery_fraud: 'WhatsApp',
	job_scam: 'email',
	investment_fraud: 'social_media',
	customer_support_scam: 'phone_call'
};

const CATEGORY_TIPS: Record<FraudCategory, string> = {
	UPI_fraud: 'Never approve collect requests or QR payments unless you initiated the transaction yourself.',
	KYC_fraud: 'Do KYC updates only inside the official bank or wallet app, never from links or unknown calls.',
	lottery_fraud: 'Any prize that asks for a fee, tax, or advance payment is a scam.',
	job_scam: 'Real employers do not ask for money, deposits, or prepaid tasks to release a job offer.',
	investment_fraud: 'Avoid any investment promise that guarantees high returns or pressures you to act quickly.',
	customer_support_scam: 'Never install remote-access apps or share OTPs with anyone claiming to fix an account issue.'
};

const CATEGORY_VICTIMS: Record<FraudCategory, string> = {
	UPI_fraud: 'Digital payment users who are comfortable approving UPI requests quickly without verifying the source.',
	KYC_fraud: 'Banking and wallet users who fear service disruption and may rush through identity update requests.',
	lottery_fraud: 'People attracted by sudden prize claims, especially when the message creates excitement or scarcity.',
	job_scam: 'Job seekers looking for fast income opportunities, especially students and early-career candidates.',
	investment_fraud: 'People looking for quick returns or insider tips, often through social groups and chat channels.',
	customer_support_scam: 'Users facing account or delivery issues who may trust a fake support agent under pressure.'
};

const CATEGORY_RED_FLAGS: Record<FraudCategory, string[]> = {
	UPI_fraud: [
		'Unexpected payment request or QR code',
		'Pressure to approve a collect request immediately',
		'Refund or reward story used to trigger fast action'
	],
	KYC_fraud: [
		'Threat that the account will be blocked or frozen',
		'Request to update documents through a shared link',
		'Identity or OTP request outside the official app'
	],
	lottery_fraud: [
		'Prize claim from an unknown sender',
		'Advance payment or tax required to release winnings',
		'Too-good-to-be-true reward with pressure to respond fast'
	],
	job_scam: [
		'Payment required before interview or onboarding',
		'Vague company identity or unverifiable recruiter details',
		'Promise of easy income with minimal screening'
	],
	investment_fraud: [
		'Guaranteed returns with little or no risk',
		'Pressure to move funds quickly to a private account',
		'Claims backed by screenshots instead of regulated proof'
	],
	customer_support_scam: [
		'Unverified support number found in a message or search result',
		'Request to install remote-control software',
		'OTP, card, or payment approval demanded during support'
	]
};

const CATEGORY_CLUES: Record<
	FraudCategory,
	Array<{ type: ClassificationResult['clues'][number]['type']; marker: string; explanation: string }>
> = {
	UPI_fraud: [
		{
			type: 'credential_request',
			marker: 'payment approval request',
			explanation: 'Scammers trick victims into approving outgoing payments instead of receiving money.'
		},
		{
			type: 'urgency',
			marker: 'urgent refund pressure',
			explanation: 'Urgency reduces the chance that the victim will verify the transaction properly.'
		},
		{
			type: 'unknown_sender',
			marker: 'unverified payment contact',
			explanation: 'A payment request from an unknown identity should always be independently verified.'
		}
	],
	KYC_fraud: [
		{
			type: 'fake_authority',
			marker: 'account suspension warning',
			explanation: 'Fake authority language is used to pressure victims into fast compliance.'
		},
		{
			type: 'credential_request',
			marker: 'document or OTP request',
			explanation: 'Legitimate KYC flows do not ask for sensitive verification over random links or chats.'
		},
		{
			type: 'fake_link',
			marker: 'external KYC update link',
			explanation: 'A shared link for urgent KYC action is a common sign of fraud.'
		}
	],
	lottery_fraud: [
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
	],
	job_scam: [
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
	],
	investment_fraud: [
		{
			type: 'too_good',
			marker: 'guaranteed high returns',
			explanation: 'Guaranteed investment returns are a classic fraud signal.'
		},
		{
			type: 'urgency',
			marker: 'act now pressure',
			explanation: 'Time pressure is used to stop victims from verifying the offer or platform.'
		},
		{
			type: 'fake_authority',
			marker: 'unverified expert claim',
			explanation: 'Scammers often pretend to be trusted experts or insiders without real credentials.'
		}
	],
	customer_support_scam: [
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
};

export interface FraudSignalAnalysis {
	categoryHint: FraudCategory | null;
	relevanceScore: number;
	matchedKeywords: string[];
	isFraudLike: boolean;
}

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

export function analyzeFraudSignals(title: string, body?: string | null): FraudSignalAnalysis {
	const text = normalizeText(title, body);
	const generalHits = findKeywordHits(text, GENERAL_FRAUD_KEYWORDS);

	let bestCategory: FraudCategory | null = null;
	let bestScore = 0;
	const matchedKeywords: string[] = [];

	for (const category of FRAUD_CATEGORIES) {
		const hits = findKeywordHits(text, CATEGORY_KEYWORDS[category]);
		const score = hits.length * 2 + generalHits.length;

		if (hits.length > 0) {
			matchedKeywords.push(...hits);
		}

		if (score > bestScore) {
			bestScore = score;
			bestCategory = category;
		}
	}

	const totalSignals = bestScore + generalHits.length;
	const relevanceScore = Math.min(1, totalSignals / 8);
	const isFraudLike = relevanceScore >= 0.35 && (bestCategory !== null || generalHits.length >= 2);

	return {
		categoryHint: bestCategory,
		relevanceScore,
		matchedKeywords: unique([...matchedKeywords, ...generalHits]).slice(0, 12),
		isFraudLike
	};
}

export function buildFallbackClassification(input: {
	title: string;
	body?: string | null;
	categoryHint: FraudCategory;
}): ClassificationResult {
	const combinedText = `${input.title} ${input.body ?? ''}`.trim();
	const templates = CATEGORY_CLUES[input.categoryHint];
	const clues = templates.map((template) => ({
		clue_text: extractSnippet(combinedText, [template.marker], toSentenceCase(template.marker)),
		type: template.type,
		explanation: template.explanation
	}));

	return {
		fraud_type: input.categoryHint,
		channel: CATEGORY_CHANNELS[input.categoryHint],
		scenario_summary: `${input.title.trim()} This article describes a ${input.categoryHint.replace(/_/g, ' ')} pattern affecting everyday users in India.`,
		victim_profile: CATEGORY_VICTIMS[input.categoryHint],
		clues,
		red_flags: CATEGORY_RED_FLAGS[input.categoryHint],
		tip: CATEGORY_TIPS[input.categoryHint]
	};
}

export function estimateClassificationConfidence(params: {
	result: ClassificationResult;
	categoryHint: FraudCategory | null;
	relevanceScore: number;
	method: 'ai' | 'heuristic';
}): number {
	const { result, categoryHint, relevanceScore, method } = params;
	let confidence = method === 'ai' ? 0.62 : 0.48;

	if (categoryHint && result.fraud_type === categoryHint) {
		confidence += 0.12;
	}

	if (result.clues.length >= 3) {
		confidence += 0.08;
	}

	if (result.red_flags.length >= 3) {
		confidence += 0.06;
	}

	if (result.scenario_summary.length >= 40) {
		confidence += 0.05;
	}

	if (result.tip.length >= 20) {
		confidence += 0.04;
	}

	confidence += Math.min(0.12, relevanceScore * 0.12);

	return Number(Math.min(method === 'ai' ? 0.94 : 0.72, confidence).toFixed(2));
}

export function determineReviewStatus(params: {
	confidence: number;
	method: 'ai' | 'heuristic';
	categoryHint: FraudCategory | null;
	result: ClassificationResult;
}): 'auto_approved' | 'needs_review' {
	const { confidence, method, categoryHint, result } = params;

	if (method !== 'ai') {
		return 'needs_review';
	}

	if (categoryHint && result.fraud_type !== categoryHint) {
		return 'needs_review';
	}

	return confidence >= 0.85 ? 'auto_approved' : 'needs_review';
}
