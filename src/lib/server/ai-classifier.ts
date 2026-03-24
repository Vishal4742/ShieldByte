/**
 * ShieldByte - AI Classification Service
 * Uses Groq (Llama 3) to classify fraud articles into the 6 SRS categories
 * and extract structured data (clues, red flags, tips).
 */

import Groq from 'groq-sdk';
import { supabase } from './supabase.js';
import { GROQ_API_KEY } from '$env/static/private';
import {
	ClassificationSchema,
	type ClassificationResult,
	normalizeClassificationResult
} from './extraction.js';
import {
	analyzeFraudSignals,
	buildFallbackClassification,
	determineReviewStatus,
	estimateClassificationConfidence
} from './fraud-signals.js';
import type { FraudCategory } from './constants.js';

let groqClient: Groq | null = null;

function getGroq(): Groq {
	if (!groqClient) {
		if (!GROQ_API_KEY) {
			throw new Error('GROQ_API_KEY is not set in environment variables.');
		}
		groqClient = new Groq({ apiKey: GROQ_API_KEY });
	}
	return groqClient;
}

const SYSTEM_PROMPT = `You are a structured data extraction expert specializing in financial crime and cyber fraud. Your job is to convert raw news articles into clean JSON data that will be used to generate scam simulation scenarios.`;

function buildUserPrompt(title: string, body: string): string {
	return `Read the following fraud news article carefully. Extract the following information and return ONLY a valid JSON object with no additional text:

{
  "fraud_type": "one of: UPI_fraud | KYC_fraud | lottery_fraud | job_scam | investment_fraud | customer_support_scam",
  "channel": "one of: SMS | WhatsApp | email | phone_call | social_media",
  "scenario_summary": "2-3 sentence plain English summary of how the scam works",
  "victim_profile": "who is typically targeted and why",
  "clues": [
    {
      "clue_text": "exact pattern or phrase",
      "type": "urgency | fake_link | unknown_sender | credential_request | too_good | fake_authority | upfront_fee",
      "explanation": "why this is suspicious"
    }
  ],
  "red_flags": ["list of 3-5 simple red flags a layperson would notice"],
  "tip": "one actionable prevention tip in plain language"
}

Article Title: ${title}
Article Body: ${body}`;
}

async function classifyArticle(title: string, body: string): Promise<ClassificationResult | null> {
	const groq = getGroq();

	try {
		const completion = await groq.chat.completions.create({
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: buildUserPrompt(title, body || title) }
			],
			temperature: 0.2,
			max_tokens: 1024,
			response_format: { type: 'json_object' }
		});

		const rawContent = completion.choices[0]?.message?.content;
		if (!rawContent) {
			console.error('[classify] Empty response from Groq');
			return null;
		}

		const parsed = JSON.parse(rawContent);
		const validated = ClassificationSchema.safeParse(parsed);

		if (!validated.success) {
			console.warn('[classify] Validation failed:', validated.error.issues);
			return normalizeClassificationResult(parsed);
		}

		return normalizeClassificationResult(validated.data);
	} catch (err) {
		console.error('[classify] Groq API error:', err);
		return null;
	}
}

interface ClassificationDecision {
	result: ClassificationResult;
	method: 'ai' | 'heuristic';
	confidence: number;
	reviewStatus: 'auto_approved' | 'needs_review';
	model: string | null;
}

interface ClassificationRunMetrics {
	classified: number;
	retried: number;
	failed: number;
	total: number;
	autoApproved: number;
	needsReview: number;
	usedAI: number;
	usedHeuristic: number;
	runLogged: boolean;
}

async function classifyWithFallback(params: {
	title: string;
	body: string;
	categoryHint: FraudCategory | null;
	relevanceScore: number;
}): Promise<ClassificationDecision | null> {
	const aiResult = await classifyArticle(params.title, params.body);

	if (aiResult) {
		const confidence = estimateClassificationConfidence({
			result: aiResult,
			categoryHint: params.categoryHint,
			relevanceScore: params.relevanceScore,
			method: 'ai'
		});

		return {
			result: aiResult,
			method: 'ai',
			confidence,
			reviewStatus: determineReviewStatus({
				confidence,
				method: 'ai',
				categoryHint: params.categoryHint,
				result: aiResult
			}),
			model: 'llama-3.3-70b-versatile'
		};
	}

	if (!params.categoryHint) {
		return null;
	}

	const fallbackResult = buildFallbackClassification({
		title: params.title,
		body: params.body,
		categoryHint: params.categoryHint
	});
	const confidence = estimateClassificationConfidence({
		result: fallbackResult,
		categoryHint: params.categoryHint,
		relevanceScore: params.relevanceScore,
		method: 'heuristic'
	});

	return {
		result: fallbackResult,
		method: 'heuristic',
		confidence,
		reviewStatus: 'needs_review',
		model: null
	};
}

export async function runClassificationPipeline(): Promise<ClassificationRunMetrics> {
	console.log('[classify] Starting classification pipeline...');

	const { data: rawArticles, error } = await supabase
		.from('fraud_articles')
		.select('id, title, body, category_hint, relevance_score, retry_count')
		.eq('status', 'raw')
		.lt('retry_count', 3)
		.limit(50);

	if (error) {
		console.error('[classify] DB fetch error:', error.message);
		return {
			classified: 0,
			retried: 0,
			failed: 0,
			total: 0,
			autoApproved: 0,
			needsReview: 0,
			usedAI: 0,
			usedHeuristic: 0,
			runLogged: false
		};
	}

	if (!rawArticles || rawArticles.length === 0) {
		console.log('[classify] No raw articles to classify.');
		return {
			classified: 0,
			retried: 0,
			failed: 0,
			total: 0,
			autoApproved: 0,
			needsReview: 0,
			usedAI: 0,
			usedHeuristic: 0,
			runLogged: false
		};
	}

	console.log(`[classify] Processing ${rawArticles.length} articles...`);

	let classified = 0;
	let retried = 0;
	let failed = 0;
	let autoApproved = 0;
	let needsReview = 0;
	let usedAI = 0;
	let usedHeuristic = 0;

	for (const article of rawArticles) {
		const heuristicAnalysis = analyzeFraudSignals(article.title, article.body || '');
		const categoryHint =
			(typeof article.category_hint === 'string' ? article.category_hint : null) ??
			heuristicAnalysis.categoryHint;
		const relevanceScore =
			typeof article.relevance_score === 'number'
				? article.relevance_score
				: heuristicAnalysis.relevanceScore;
		const decision = await classifyWithFallback({
			title: article.title,
			body: article.body || '',
			categoryHint: categoryHint as FraudCategory | null,
			relevanceScore
		});

		if (decision) {
			const { error: updateError } = await supabase
				.from('fraud_articles')
				.update({
					category: decision.result.fraud_type,
					category_hint: categoryHint,
					relevance_score: relevanceScore,
					classification_confidence: decision.confidence,
					classification_method: decision.method,
					classification_model: decision.model,
					review_status: decision.reviewStatus,
					retry_count: 0,
					failed_at: null,
					last_error: null,
					raw_extraction: decision.result,
					status: 'classified'
				})
				.eq('id', article.id);

			if (updateError) {
				console.error(`[classify] Update failed for ${article.id}:`, updateError.message);
				failed++;
			} else {
				classified++;
				if (decision.method === 'ai') {
					usedAI++;
				} else {
					usedHeuristic++;
				}
				if (decision.reviewStatus === 'auto_approved') {
					autoApproved++;
				} else {
					needsReview++;
				}
			}
		} else {
			const nextRetryCount =
				typeof article.retry_count === 'number' ? article.retry_count + 1 : 1;
			const shouldFail = nextRetryCount >= 3;
			await supabase
				.from('fraud_articles')
				.update({
					status: shouldFail ? 'failed' : 'raw',
					category_hint: categoryHint,
					relevance_score: relevanceScore,
					review_status: 'needs_review',
					retry_count: nextRetryCount,
					failed_at: shouldFail ? new Date().toISOString() : null,
					last_error: 'Classification returned no valid structured result and no fallback was possible.'
				})
				.eq('id', article.id);

			if (shouldFail) {
				failed++;
			} else {
				retried++;
			}
		}

		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log(
		`[classify] Done: ${classified} classified, ${retried} retried, ${failed} failed out of ${rawArticles.length}`
	);

	const { error: runLogError } = await supabase.from('classification_runs').insert({
		total_considered: rawArticles.length,
		classified,
		retried,
		failed,
		auto_approved: autoApproved,
		needs_review: needsReview,
		used_ai: usedAI,
		used_heuristic: usedHeuristic
	});

	if (runLogError) {
		console.error('[classify] Failed to log classification run:', runLogError.message);
	}

	return {
		classified,
		retried,
		failed,
		total: rawArticles.length,
		autoApproved,
		needsReview,
		usedAI,
		usedHeuristic,
		runLogged: !runLogError
	};
}
