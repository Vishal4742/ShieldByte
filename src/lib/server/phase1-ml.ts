import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { FRAUD_CATEGORIES, type FraudCategory } from './constants.js';
import type { FraudSignalAnalysis } from './fraud-signals.js';

const DEFAULT_MODEL_PATH = 'tmp/phase1-category-model.json';
const STOP_WORDS = new Set([
	'the',
	'a',
	'an',
	'and',
	'or',
	'of',
	'to',
	'in',
	'on',
	'for',
	'with',
	'from',
	'by',
	'at',
	'is',
	'was',
	'were',
	'be',
	'been',
	'being',
	'that',
	'this',
	'it',
	'as',
	'into',
	'after',
	'before',
	'about',
	'over',
	'under',
	'against',
	'allegedly',
	'through',
	'their',
	'them',
	'they',
	'he',
	'she',
	'his',
	'her',
	'you',
	'your',
	'we',
	'our',
	'has',
	'have',
	'had',
	'will',
	'would',
	'can',
	'could',
	'may',
	'might'
]);

interface StoredCategoryStats {
	docCount: number;
	tokenTotal: number;
	logPrior: number;
	defaultLogProb: number;
	tokenLogProbs: Record<string, number>;
}

interface Phase1CategoryModel {
	version: 1;
	trainedAt: string;
	labels: FraudCategory[];
	vocabularySize: number;
	tokenizer: {
		type: 'unigram-bigram';
		stopWordsRemoved: boolean;
	};
	stats: Record<FraudCategory, StoredCategoryStats>;
}

export interface Phase1MlPrediction {
	category: FraudCategory;
	confidence: number;
	scores: Record<FraudCategory, number>;
}

let modelCache: Promise<Phase1CategoryModel | null> | null = null;

function normalizeText(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenizeText(value: string): string[] {
	const normalized = normalizeText(value);
	if (!normalized) {
		return [];
	}

	const tokens = normalized
		.split(' ')
		.map((token) => token.trim())
		.filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
	const bigrams: string[] = [];

	for (let index = 0; index < tokens.length - 1; index += 1) {
		bigrams.push(`${tokens[index]}_${tokens[index + 1]}`);
	}

	return [...tokens, ...bigrams];
}

function buildFeatureText(params: {
	title: string;
	body: string;
	analysis?: FraudSignalAnalysis;
}): string {
	const parts = [params.title, params.body];

	if (params.analysis?.matchedKeywords.length) {
		parts.push(params.analysis.matchedKeywords.map((keyword) => `kw_${keyword}`).join(' '));
	}

	if (params.analysis?.categoryHint) {
		parts.push(`hint_${params.analysis.categoryHint}`);
	}

	if (params.analysis?.channelHint) {
		parts.push(`channel_${params.analysis.channelHint}`);
	}

	return parts.filter((part) => part.trim().length > 0).join(' ');
}

async function loadModel(): Promise<Phase1CategoryModel | null> {
	const configuredPath = env.PHASE1_CATEGORY_MODEL_PATH?.trim() || DEFAULT_MODEL_PATH;
	const absolutePath = path.isAbsolute(configuredPath)
		? configuredPath
		: path.resolve(configuredPath);

	try {
		const raw = await readFile(absolutePath, 'utf8');
		const parsed = JSON.parse(raw) as Phase1CategoryModel;

		if (!parsed || parsed.version !== 1 || !parsed.stats) {
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

async function getModel(): Promise<Phase1CategoryModel | null> {
	if (!modelCache) {
		modelCache = loadModel();
	}

	return modelCache;
}

function softmax(logScores: Record<FraudCategory, number>): Record<FraudCategory, number> {
	const maxScore = Math.max(...Object.values(logScores));
	const exps = FRAUD_CATEGORIES.map((category) => [category, Math.exp(logScores[category] - maxScore)] as const);
	const total = exps.reduce((sum, [, value]) => sum + value, 0);

	return Object.fromEntries(
		exps.map(([category, value]) => [category, Number((value / total).toFixed(4))])
	) as Record<FraudCategory, number>;
}

export async function predictPhase1Category(params: {
	title: string;
	body?: string | null;
	analysis?: FraudSignalAnalysis;
}): Promise<Phase1MlPrediction | null> {
	const model = await getModel();

	if (!model) {
		return null;
	}

	const featureText = buildFeatureText({
		title: params.title,
		body: params.body ?? '',
		analysis: params.analysis
	});
	const tokens = tokenizeText(featureText);

	if (tokens.length === 0) {
		return null;
	}

	const logScores = {} as Record<FraudCategory, number>;

	for (const category of model.labels) {
		const stats = model.stats[category];
		let score = stats.logPrior;

		for (const token of tokens) {
			score += stats.tokenLogProbs[token] ?? stats.defaultLogProb;
		}

		logScores[category] = Number(score.toFixed(6));
	}

	const probabilities = softmax(logScores);
	const ranked = [...FRAUD_CATEGORIES]
		.map((category) => [category, probabilities[category]] as const)
		.sort((left, right) => right[1] - left[1]);

	return {
		category: ranked[0][0],
		confidence: ranked[0][1],
		scores: probabilities
	};
}

export function resetPhase1CategoryModelCache(): void {
	modelCache = null;
}
