/**
 * Estimate Phase 1 accuracy after applying the current relevance gate
 * to an existing labeled review file.
 *
 * Usage:
 *   node scripts/estimate-phase1-gated-accuracy.mjs tmp/phase1-eval-sample-*.json
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const NON_SCAM_CONTEXT_PATTERNS = [
	['fight fraud', 3],
	['fraud prevention', 4],
	['prevent fraud', 3],
	['warn consumers', 4],
	['warning for', 3],
	['stay vigilant', 3],
	['verify through official channels', 5],
	['anti money laundering', 5],
	['money laundering', 4],
	['awareness campaign', 4],
	['compensation proposal', 4],
	['proposal', 1],
	['guidelines', 2],
	['advisory', 3],
	['explainer', 4],
	['5 things to know', 5],
	['policy', 2],
	['privacy policy', 5],
	['compliance', 3],
	['tooling', 2],
	['software', 1],
	['platform', 1],
	['ai vs ai', 5],
	['future of fraud prevention', 5],
	['to fight money laundering', 5],
	['rolls out', 3],
	['to launch in india', 4],
	['smartphone', 4],
	['feature', 2],
	['government rescuing', 3],
	['workshop', 3],
	['study', 2],
	['delegation', 2],
	['announcement', 2],
	['announces', 2],
	['partnership', 3],
	['high court', 4],
	['consumer court', 4],
	['denies bail', 4],
	['police', 2],
	['cbi', 3],
	['crime gang', 4],
	['mule account', 4],
	['mule accounts', 4],
	['ministry', 3],
	['railways', 3],
	['government', 2],
	['malicious smses', 4],
	['how can i', 4],
	['need advice', 4],
	['questions about', 4],
	['confused about next steps', 5],
	['is it legit', 5],
	['warranty issue', 5],
	['issue', 1],
	['pm-kisan', 5],
	['घोषणा', 3],
	['कार्यशाला', 3],
	['अध्ययन', 2],
	['मंत्रालय', 3],
	['किसान', 4],
	['सहकारी', 4],
	['युवा', 2]
];

const SCAM_INCIDENT_PATTERNS = [
	['victim', 2],
	['scammers', 2],
	['fraudsters', 2],
	['posed as', 3],
	['pretending to be', 3],
	['duped', 3],
	['cheated', 2],
	['defrauded', 2],
	['lost rs', 3],
	['lost money', 3],
	['transferred money', 2],
	['shared otp', 4],
	['clicked the link', 3],
	['collect request', 4],
	['remote access', 4],
	['job offer', 2],
	['guaranteed return', 4],
	['daily profits', 5],
	['fake payment screenshots', 5],
	['malicious sms', 3]
];

const DIRECT_SCAM_MECHANISM_PATTERNS = [
	'collect request',
	'request money',
	'payment request',
	'qr code',
	'upi id',
	'kyc update',
	'account blocked',
	'account freeze',
	'update aadhaar',
	'update pan',
	'you have won',
	'lucky draw',
	'prize money',
	'telegram task',
	'registration fee',
	'pay to join',
	'joining fee',
	'guaranteed return',
	'daily profits',
	'trading group',
	'double your money',
	'customer care number',
	'helpline number',
	'install anydesk',
	'install teamviewer',
	'remote access',
	'refund support',
	'shared otp',
	'fake payment screenshots'
];

function normalizeText(...parts) {
	return parts
		.map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function sumHits(text, patterns) {
	let score = 0;

	for (const [pattern, weight] of patterns) {
		if (text.includes(pattern)) {
			score += weight;
		}
	}

	return score;
}

function gatedPrediction(record) {
	const text = normalizeText(record.title, record.body);
	const negativeScore = sumHits(text, NON_SCAM_CONTEXT_PATTERNS);
	const positiveScore = sumHits(text, SCAM_INCIDENT_PATTERNS);
	const hasDirectMechanism = DIRECT_SCAM_MECHANISM_PATTERNS.some((pattern) =>
		text.includes(pattern)
	);
	const hasQuestionLikeNoise =
		text.includes('is it legit') ||
		text.includes('is this a scam') ||
		text.includes('need advice') ||
		text.includes('questions about') ||
		text.includes('how can i') ||
		text.includes('confused about next steps');
	const hasCrimeOrPolicyFrame =
		text.includes('police') ||
		text.includes('cbi') ||
		text.includes('high court') ||
		text.includes('consumer court') ||
		text.includes('denies bail') ||
		text.includes('advisory') ||
		text.includes('explainer') ||
		text.includes('privacy policy');

	if (!hasDirectMechanism && negativeScore >= 5 && positiveScore < 8) {
		return 'not_fraud_relevant';
	}

	if (!hasDirectMechanism && hasQuestionLikeNoise && negativeScore >= 3) {
		return 'not_fraud_relevant';
	}

	if (!hasDirectMechanism && hasCrimeOrPolicyFrame && negativeScore >= positiveScore) {
		return 'not_fraud_relevant';
	}

	if (negativeScore >= positiveScore + 3) {
		return 'not_fraud_relevant';
	}

	if ((record.relevance_score ?? 0) < 0.28 && negativeScore >= 2 && positiveScore < 4) {
		return 'not_fraud_relevant';
	}

	if ((!record.body || !String(record.body).trim()) && (record.relevance_score ?? 0) < 0.4 && positiveScore < 3) {
		return 'not_fraud_relevant';
	}

	return record.predicted_category ?? 'not_fraud_relevant';
}

async function main() {
	const inputPath = process.argv[2];

	if (!inputPath) {
		throw new Error('Pass the labeled JSON review file path.');
	}

	const absolutePath = path.resolve(inputPath);
	const raw = await readFile(absolutePath, 'utf8');
	const parsed = JSON.parse(raw);
	const records = Array.isArray(parsed.records) ? parsed.records : [];

	let correct = 0;
	let labeled = 0;

	for (const record of records) {
		const actual = record?.review?.actual_category;
		if (typeof actual !== 'string' || !actual) {
			continue;
		}

		const predicted = gatedPrediction(record);
		labeled += 1;

		if (predicted === actual) {
			correct += 1;
		}
	}

	const accuracy = labeled > 0 ? correct / labeled : 0;
	console.log(`Estimated gated accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${labeled})`);
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
