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
	assessFraudRelevance,
	buildFallbackClassification,
	determineReviewStatus,
	estimateClassificationConfidence,
	reconcileClassificationResult,
	type FraudSignalAnalysis
} from './fraud-signals.js';
import type { FraudCategory } from './constants.js';
import { generateGeminiJson, getGeminiApiKey } from './gemini.js';
import { GEMINI_CLASSIFIER_MODEL } from '$env/static/private';
import { generateOllamaJson, getOllamaClassifierModel } from './ollama.js';
import { generateOpenRouterJson, getOpenRouterClassifierModels } from './openrouter.js';
import { parseJsonObjectLoose } from './json-utils.js';
import { predictPhase1Category } from './phase1-ml.js';

let groqClient: Groq | null = null;
const CLASSIFIER_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'] as const;
const DEFAULT_GEMINI_CLASSIFIER_MODEL = GEMINI_CLASSIFIER_MODEL || 'gemini-2.0-flash';
const DEFAULT_OLLAMA_CLASSIFIER_MODEL = getOllamaClassifierModel();
const OPENROUTER_CLASSIFIER_MODELS = getOpenRouterClassifierModels();

const CLASSIFICATION_JSON_SCHEMA = {
	type: 'object',
	properties: {
		fraud_type: {
			type: 'string',
			enum: [
				'UPI_fraud',
				'KYC_fraud',
				'lottery_fraud',
				'job_scam',
				'investment_fraud',
				'customer_support_scam'
			]
		},
		channel: {
			type: 'string',
			enum: ['SMS', 'WhatsApp', 'email', 'phone_call', 'social_media']
		},
		scenario_summary: { type: 'string' },
		victim_profile: { type: 'string' },
		clues: {
			type: 'array',
			minItems: 3,
			maxItems: 6,
			items: {
				type: 'object',
				properties: {
					clue_text: { type: 'string' },
					type: {
						type: 'string',
						enum: [
							'urgency',
							'fake_link',
							'unknown_sender',
							'credential_request',
							'too_good',
							'fake_authority',
							'upfront_fee'
						]
					},
					explanation: { type: 'string' }
				},
				required: ['clue_text', 'type', 'explanation']
			}
		},
		red_flags: {
			type: 'array',
			minItems: 3,
			maxItems: 5,
			items: { type: 'string' }
		},
		tip: { type: 'string' }
	},
	required: [
		'fraud_type',
		'channel',
		'scenario_summary',
		'victim_profile',
		'clues',
		'red_flags',
		'tip'
	]
} as const;

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

function buildUserPrompt(title: string, body: string, analysis?: FraudSignalAnalysis): string {
	const evidenceBlock =
		analysis && analysis.categoryHint
			? `

Evidence hints from the article text:
- likely_category_hint: ${analysis.categoryHint}
- signal_strength: ${analysis.signalStrength}
- matched_terms: ${analysis.matchedKeywords.slice(0, 8).join(', ') || 'none'}

Use these hints only if the article supports them. Do not force the hinted category when the article clearly describes a different scam type.`
			: '';

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

Rules:
- Return at least 3 clues and 3 red_flags when the article describes a concrete scam or fraud pattern.
- Keep every clue explanation short and plain.
- Prefer the most specific fraud category that fits the article.
- Distinguish carefully between these common confusions:
  - UPI_fraud: collect requests, QR code payments, payment approvals, UPI IDs.
  - KYC_fraud: account freeze/block warnings, PAN/Aadhaar updates, document verification links.
  - customer_support_scam: fake helpline numbers, refund desk impersonation, remote-access app requests.
  - job_scam: hiring or task-job lures, recruitment onboarding payments.
  - investment_fraud: guaranteed returns, trading or crypto profit groups.
  - lottery_fraud: prize or lucky draw claims that require a fee or tax.

Article Title: ${title}
Article Body: ${body}${evidenceBlock}`;
}

async function classifyArticle(
	title: string,
	body: string,
	analysis?: FraudSignalAnalysis
): Promise<{ result: ClassificationResult; model: string } | null> {
	for (const model of OPENROUTER_CLASSIFIER_MODELS) {
		try {
			const rawContent = await generateOpenRouterJson({
				model,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: buildUserPrompt(title, body || title, analysis),
				temperature: 0.2,
				maxOutputTokens: 700,
				schema: CLASSIFICATION_JSON_SCHEMA
			});

			if (!rawContent) {
				continue;
			}

			const parsed = parseJsonObjectLoose(rawContent);
			const validated = ClassificationSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn(
					`[classify] Validation failed for OpenRouter ${model}:`,
					validated.error.issues
				);
				const normalized = normalizeClassificationResult(parsed);
				if (normalized) {
					return { result: normalized, model: `openrouter:${model}` };
				}
				continue;
			}

			const normalized = normalizeClassificationResult(validated.data);
			if (normalized) {
				return { result: normalized, model: `openrouter:${model}` };
			}
		} catch (err) {
			console.error(`[classify] OpenRouter API error for ${model}:`, err);
		}
	}

	if (getGeminiApiKey()) {
		try {
			const rawContent = await generateGeminiJson({
				model: DEFAULT_GEMINI_CLASSIFIER_MODEL,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: buildUserPrompt(title, body || title, analysis),
				temperature: 0.2,
				maxOutputTokens: 700
			});

			if (rawContent) {
				const parsed = parseJsonObjectLoose(rawContent);
				const validated = ClassificationSchema.safeParse(parsed);

				if (!validated.success) {
					console.warn(
						`[classify] Validation failed for Gemini ${DEFAULT_GEMINI_CLASSIFIER_MODEL}:`,
						validated.error.issues
					);
					const normalized = normalizeClassificationResult(parsed);
					if (normalized) {
						return { result: normalized, model: DEFAULT_GEMINI_CLASSIFIER_MODEL };
					}
				} else {
					const normalized = normalizeClassificationResult(validated.data);
					if (normalized) {
						return { result: normalized, model: DEFAULT_GEMINI_CLASSIFIER_MODEL };
					}
				}
			}
		} catch (err) {
			console.error(`[classify] Gemini API error for ${DEFAULT_GEMINI_CLASSIFIER_MODEL}:`, err);
		}
	}

	if (DEFAULT_OLLAMA_CLASSIFIER_MODEL) {
		try {
			const rawContent = await generateOllamaJson({
				model: DEFAULT_OLLAMA_CLASSIFIER_MODEL,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt: buildUserPrompt(title, body || title, analysis),
				temperature: 0.2,
				maxOutputTokens: 700,
				schema: CLASSIFICATION_JSON_SCHEMA
			});

			if (rawContent) {
				const parsed = parseJsonObjectLoose(rawContent);
				const validated = ClassificationSchema.safeParse(parsed);

				if (!validated.success) {
					console.warn(
						`[classify] Validation failed for Ollama ${DEFAULT_OLLAMA_CLASSIFIER_MODEL}:`,
						validated.error.issues
					);
					const normalized = normalizeClassificationResult(parsed);
					if (normalized) {
						return { result: normalized, model: `ollama:${DEFAULT_OLLAMA_CLASSIFIER_MODEL}` };
					}
				} else {
					const normalized = normalizeClassificationResult(validated.data);
					if (normalized) {
						return { result: normalized, model: `ollama:${DEFAULT_OLLAMA_CLASSIFIER_MODEL}` };
					}
				}
			}
		} catch (err) {
			console.error(
				`[classify] Ollama API error for ${DEFAULT_OLLAMA_CLASSIFIER_MODEL}:`,
				err
			);
		}
	}

	let groq: Groq;
	try {
		groq = getGroq();
	} catch (err) {
		console.error('[classify] Groq client unavailable:', err);
		return null;
	}

	for (const model of CLASSIFIER_MODELS) {
		try {
			const completion = await groq.chat.completions.create({
				model,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: buildUserPrompt(title, body || title, analysis) }
				],
				temperature: 0.2,
				max_tokens: 700,
				response_format: { type: 'json_object' }
			});

			const rawContent = completion.choices[0]?.message?.content;
			if (!rawContent) {
				console.error(`[classify] Empty response from Groq model ${model}`);
				continue;
			}

			const parsed = parseJsonObjectLoose(rawContent);
			const validated = ClassificationSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn(`[classify] Validation failed for ${model}:`, validated.error.issues);
				const normalized = normalizeClassificationResult(parsed);
				if (normalized) {
					return { result: normalized, model };
				}
				continue;
			}

			const normalized = normalizeClassificationResult(validated.data);
			if (normalized) {
				return { result: normalized, model };
			}
		} catch (err) {
			console.error(`[classify] Groq API error for ${model}:`, err);
		}
	}

	return null;
}

interface ClassificationDecision {
	result: ClassificationResult;
	method: 'ai' | 'heuristic';
	confidence: number;
	reviewStatus: 'auto_approved' | 'needs_review';
	model: string | null;
	mlCategory: FraudCategory | null;
	mlConfidence: number | null;
}

interface ClassificationRunMetrics {
	classified: number;
	irrelevant: number;
	retried: number;
	failed: number;
	total: number;
	autoApproved: number;
	needsReview: number;
	usedAI: number;
	usedHeuristic: number;
	runLogged: boolean;
}

function resolveCategoryWithMl(params: {
	result: ClassificationResult;
	analysis: FraudSignalAnalysis;
	mlPrediction: Awaited<ReturnType<typeof predictPhase1Category>>;
}): ClassificationResult {
	const { result, analysis, mlPrediction } = params;

	if (!mlPrediction) {
		return result;
	}

	if (mlPrediction.category === result.fraud_type) {
		return result;
	}

	const heuristicSupportsMl = analysis.categoryHint === mlPrediction.category;
	const heuristicStrong = analysis.signalStrength === 'strong';
	const heuristicGap =
		(analysis.categoryScores[mlPrediction.category] ?? 0) -
		(analysis.categoryScores[result.fraud_type] ?? 0);

	if (mlPrediction.confidence >= 0.88 && heuristicSupportsMl) {
		return {
			...result,
			fraud_type: mlPrediction.category
		};
	}

	if (mlPrediction.confidence >= 0.93 && heuristicStrong && heuristicGap >= 1.5) {
		return {
			...result,
			fraud_type: mlPrediction.category
		};
	}

	return result;
}

function adjustConfidenceWithMl(params: {
	confidence: number;
	result: ClassificationResult;
	analysis: FraudSignalAnalysis;
	mlPrediction: Awaited<ReturnType<typeof predictPhase1Category>>;
}): number {
	const { confidence, result, analysis, mlPrediction } = params;

	if (!mlPrediction) {
		return confidence;
	}

	let adjusted = confidence;

	if (mlPrediction.category === result.fraud_type) {
		adjusted += mlPrediction.confidence >= 0.8 ? 0.05 : 0.02;
	} else if (mlPrediction.confidence >= 0.85 && analysis.signalStrength !== 'weak') {
		adjusted -= 0.08;
	}

	return Number(Math.max(0.2, Math.min(0.97, adjusted)).toFixed(2));
}

async function classifyWithFallback(params: {
	title: string;
	body: string;
	categoryHint: FraudCategory | null;
	relevanceScore: number;
	analysis?: FraudSignalAnalysis;
}): Promise<ClassificationDecision | null> {
	const heuristicAnalysis = params.analysis ?? analyzeFraudSignals(params.title, params.body);
	const mlPrediction = await predictPhase1Category({
		title: params.title,
		body: params.body,
		analysis: heuristicAnalysis
	});
	const aiResponse = await classifyArticle(params.title, params.body, heuristicAnalysis);
	const effectiveCategoryHint = params.categoryHint ?? heuristicAnalysis.categoryHint;
	const effectiveRelevanceScore = Math.max(params.relevanceScore, heuristicAnalysis.relevanceScore);

	if (aiResponse) {
		const heuristicReconciledResult = reconcileClassificationResult({
			result: aiResponse.result,
			analysis: heuristicAnalysis
		});
		const finalResult = resolveCategoryWithMl({
			result: heuristicReconciledResult,
			analysis: heuristicAnalysis,
			mlPrediction
		});
		const confidence = adjustConfidenceWithMl({
			confidence: estimateClassificationConfidence({
				result: finalResult,
				categoryHint: effectiveCategoryHint,
				relevanceScore: effectiveRelevanceScore,
				method: 'ai',
				signalStrength: heuristicAnalysis.signalStrength,
				scoreMargin: heuristicAnalysis.scoreMargin
			}),
			result: finalResult,
			analysis: heuristicAnalysis,
			mlPrediction
		});

		return {
			result: finalResult,
			method: 'ai',
			confidence,
			reviewStatus: determineReviewStatus({
				confidence,
				method: 'ai',
				categoryHint: effectiveCategoryHint,
				result: finalResult,
				signalStrength: heuristicAnalysis.signalStrength
			}),
			model: aiResponse.model,
			mlCategory: mlPrediction?.category ?? null,
			mlConfidence: mlPrediction?.confidence ?? null
		};
	}

	if (!effectiveCategoryHint) {
		if (!mlPrediction) {
			return null;
		}

		const fallbackResult = buildFallbackClassification({
			title: params.title,
			body: params.body,
			categoryHint: mlPrediction.category
		});
		const confidence = adjustConfidenceWithMl({
			confidence: estimateClassificationConfidence({
				result: fallbackResult,
				categoryHint: mlPrediction.category,
				relevanceScore: effectiveRelevanceScore,
				method: 'heuristic',
				signalStrength: heuristicAnalysis.signalStrength,
				scoreMargin: heuristicAnalysis.scoreMargin
			}),
			result: fallbackResult,
			analysis: heuristicAnalysis,
			mlPrediction
		});

		return {
			result: fallbackResult,
			method: 'heuristic',
			confidence,
			reviewStatus: 'needs_review',
			model: null,
			mlCategory: mlPrediction.category,
			mlConfidence: mlPrediction.confidence
		};
	}

	const fallbackResult = buildFallbackClassification({
		title: params.title,
		body: params.body,
		categoryHint: effectiveCategoryHint
	});
	const finalFallbackResult = resolveCategoryWithMl({
		result: fallbackResult,
		analysis: heuristicAnalysis,
		mlPrediction
	});
	const confidence = adjustConfidenceWithMl({
		confidence: estimateClassificationConfidence({
			result: finalFallbackResult,
			categoryHint: effectiveCategoryHint,
			relevanceScore: effectiveRelevanceScore,
			method: 'heuristic',
			signalStrength: heuristicAnalysis.signalStrength,
			scoreMargin: heuristicAnalysis.scoreMargin
		}),
		result: finalFallbackResult,
		analysis: heuristicAnalysis,
		mlPrediction
	});

	return {
		result: finalFallbackResult,
		method: 'heuristic',
		confidence,
		reviewStatus: 'needs_review',
		model: null,
		mlCategory: mlPrediction?.category ?? null,
		mlConfidence: mlPrediction?.confidence ?? null
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
			irrelevant: 0,
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
			irrelevant: 0,
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
	let irrelevant = 0;
	let retried = 0;
	let failed = 0;
	let autoApproved = 0;
	let needsReview = 0;
	let usedAI = 0;
	let usedHeuristic = 0;

	for (const article of rawArticles) {
		const heuristicAnalysis = analyzeFraudSignals(article.title, article.body || '');
		const relevanceDecision = assessFraudRelevance(article.title, article.body || '', heuristicAnalysis);
		const categoryHint =
			(typeof article.category_hint === 'string' ? article.category_hint : null) ??
			heuristicAnalysis.categoryHint;
		const relevanceScore =
			typeof article.relevance_score === 'number'
				? article.relevance_score
				: heuristicAnalysis.relevanceScore;

		if (!relevanceDecision.isRelevant) {
			const { error: irrelevantError } = await supabase
				.from('fraud_articles')
				.update({
					category: null,
					category_hint: categoryHint,
					relevance_score: relevanceScore,
					classification_confidence: relevanceDecision.confidence,
					classification_method: 'heuristic',
					classification_model: null,
					review_status: 'reviewed',
					retry_count: 0,
					failed_at: null,
					last_error: null,
					raw_extraction: null,
					status: 'irrelevant'
				})
				.eq('id', article.id);

			if (irrelevantError) {
				console.error(`[classify] Irrelevant update failed for ${article.id}:`, irrelevantError.message);
				failed++;
			} else {
				irrelevant++;
			}

			await new Promise((resolve) => setTimeout(resolve, 80));
			continue;
		}

		const decision = await classifyWithFallback({
			title: article.title,
			body: article.body || '',
			categoryHint: categoryHint as FraudCategory | null,
			relevanceScore,
			analysis: heuristicAnalysis
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
		`[classify] Done: ${classified} classified, ${irrelevant} irrelevant, ${retried} retried, ${failed} failed out of ${rawArticles.length}`
	);

	const { error: runLogError } = await supabase.from('classification_runs').insert({
		total_considered: rawArticles.length,
		classified,
		irrelevant,
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
		irrelevant,
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
