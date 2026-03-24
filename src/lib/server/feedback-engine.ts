/**
 * ShieldByte — Phase 4: AI Feedback Engine
 *
 * Generates personalized, educational post-mission feedback using Gemini.
 * Feedback is specific to the fraud type and the clues the user missed.
 *
 * SRS requirements:
 * - Language is friendly, non-judgmental, plain language (no jargon)
 * - Response arrives in under 4 seconds using fast inference
 * - Feedback references the specific clues the user missed
 * - One actionable tip is appended for real-life application
 */

import { z } from 'zod';
import { generateGeminiJson } from './gemini.js';
import { supabase } from './supabase.js';
import { generateOllamaJson, getOllamaFeedbackModel } from './ollama.js';
import { generateOpenRouterJson, getOpenRouterFeedbackModels } from './openrouter.js';
import { parseJsonObjectLoose } from './json-utils.js';

// ─── Environment ────────────────────────────────────────────

let feedbackModel = 'gemini-2.0-flash';
try {
	// Dynamic import to avoid build failure if env var is missing
	const env = await import('$env/static/private');
	const envRecord = env as unknown as Record<string, string>;
	if (envRecord.GEMINI_FEEDBACK_MODEL) {
		feedbackModel = envRecord.GEMINI_FEEDBACK_MODEL;
	}
} catch {
	// Falls back to default
}

function getFeedbackModel(): string {
	return feedbackModel;
}

const FEEDBACK_JSON_SCHEMA = {
	type: 'object',
	properties: {
		feedback_text: { type: 'string' },
		pattern_identified: { type: 'string' },
		actionable_tip: { type: 'string' },
		encouragement: { type: 'string' }
	},
	required: ['feedback_text', 'pattern_identified', 'actionable_tip', 'encouragement']
} as const;

// ─── Types ──────────────────────────────────────────────────

export interface FeedbackClue {
	triggerText: string;
	type: string;
	explanation: string;
}

export interface GenerateFeedbackParams {
	userId: string;
	missionId: number;
	attemptId: number;
	fraudType: string;
	cluesFound: FeedbackClue[];
	cluesMissed: FeedbackClue[];
	timeTaken: number;
	livesRemaining: number;
}

export const GenerateFeedbackRequestSchema = z.object({
	user_id: z.string().trim().min(1),
	mission_id: z.number().int().positive(),
	attempt_id: z.number().int().positive(),
	fraud_type: z.string().trim().min(1),
	clues_found: z.array(
		z.object({
			triggerText: z.string(),
			type: z.string(),
			explanation: z.string()
		})
	),
	clues_missed: z.array(
		z.object({
			triggerText: z.string(),
			type: z.string(),
			explanation: z.string()
		})
	),
	time_taken: z.number().int().min(0).max(60),
	lives_remaining: z.number().int().min(0).max(3)
});

export type GenerateFeedbackRequest = z.infer<typeof GenerateFeedbackRequestSchema>;

const FeedbackResponseSchema = z.object({
	feedback_text: z.string().min(1),
	pattern_identified: z.string().min(1),
	actionable_tip: z.string().min(1),
	encouragement: z.string().min(1)
});

export interface FeedbackResult {
	feedbackText: string;
	patternIdentified: string;
	actionableTip: string;
	encouragement: string;
}

// ─── Prompt Construction ────────────────────────────────────

const SYSTEM_PROMPT = `You are an empathetic cybersecurity educator. Your job is to help everyday people learn to spot scams. You speak like a friendly mentor, not a lecturer. Use simple language. Never be condescending.`;

function buildUserPrompt(params: GenerateFeedbackParams): string {
	const foundList =
		params.cluesFound.length > 0
			? params.cluesFound.map((c) => `- "${c.triggerText}" (${c.type}): ${c.explanation}`).join('\n')
			: '(none)';

	const missedList =
		params.cluesMissed.length > 0
			? params.cluesMissed
					.map((c) => `- "${c.triggerText}" (${c.type}): ${c.explanation}`)
					.join('\n')
			: '(none)';

	return `A user just completed a scam detection mission. Generate personalized feedback based on their performance.

Mission type: ${params.fraudType.replaceAll('_', ' ')}
Clues they found correctly:
${foundList}

Clues they missed:
${missedList}

Time taken: ${params.timeTaken} seconds
Lives remaining: ${params.livesRemaining}

Return a JSON object:
{
  "feedback_text": "2-3 friendly sentences explaining what they missed and why those clues are important",
  "pattern_identified": "name of the fraud pattern they struggled with (e.g., urgency manipulation, fake authority)",
  "actionable_tip": "one specific, practical tip they can apply in real life starting today (max 20 words)",
  "encouragement": "one short motivating sentence based on what they did well"
}

Rules:
- feedback_text must directly reference the specific clues missed
- Do not use the phrase "great job"
- Do not use technical terms like phishing, MITM, or social engineering
- Keep language simple and friendly`;
}

// ─── Core Generator ─────────────────────────────────────────

export async function generateFeedback(params: GenerateFeedbackParams): Promise<FeedbackResult> {
	const model = getFeedbackModel();
	const userPrompt = buildUserPrompt(params);
	const ollamaModel = getOllamaFeedbackModel();
	const openRouterModels = getOpenRouterFeedbackModels();

	let rawJson: string | null = null;

	for (const openRouterModel of openRouterModels) {
		try {
			rawJson = await generateOpenRouterJson({
				model: openRouterModel,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt,
				temperature: 0.4,
				maxOutputTokens: 512,
				schema: FEEDBACK_JSON_SCHEMA
			});
			if (rawJson) {
				break;
			}
		} catch (err) {
			console.error(`[feedback-engine] OpenRouter API error for ${openRouterModel}:`, err);
		}
	}

	if (!rawJson) {
		rawJson = await generateGeminiJson({
			model,
			systemPrompt: SYSTEM_PROMPT,
			userPrompt,
			temperature: 0.4,
			maxOutputTokens: 512
		});
	}

	if (!rawJson && ollamaModel) {
		try {
			rawJson = await generateOllamaJson({
				model: ollamaModel,
				systemPrompt: SYSTEM_PROMPT,
				userPrompt,
				temperature: 0.4,
				maxOutputTokens: 512,
				schema: FEEDBACK_JSON_SCHEMA
			});
		} catch (err) {
			console.error(`[feedback-engine] Ollama API error for ${ollamaModel}:`, err);
		}
	}

	if (!rawJson) {
		throw new Error('No configured local or hosted model returned feedback JSON.');
	}

	let parsed: unknown;
	try {
		parsed = parseJsonObjectLoose(rawJson);
	} catch {
		throw new Error(`Failed to parse Gemini feedback response as JSON: ${rawJson.slice(0, 200)}`);
	}

	const validated = FeedbackResponseSchema.safeParse(parsed);
	if (!validated.success) {
		throw new Error(
			`Feedback response failed validation: ${validated.error.issues[0]?.message ?? 'unknown'}`
		);
	}

	const feedback: FeedbackResult = {
		feedbackText: validated.data.feedback_text,
		patternIdentified: validated.data.pattern_identified,
		actionableTip: validated.data.actionable_tip,
		encouragement: validated.data.encouragement
	};

	// ── Persist to feedback_log ──
	const { error: insertError } = await supabase.from('feedback_log').insert({
		user_id: params.userId,
		mission_id: params.missionId,
		mission_attempt_id: params.attemptId,
		feedback_text: feedback.feedbackText,
		pattern_identified: feedback.patternIdentified,
		actionable_tip: feedback.actionableTip,
		encouragement: feedback.encouragement,
		metadata: {
			fraud_type: params.fraudType,
			clues_found_count: params.cluesFound.length,
			clues_missed_count: params.cluesMissed.length,
			time_taken: params.timeTaken,
			lives_remaining: params.livesRemaining
		}
	});

	if (insertError) {
		console.error('[feedback-engine] Failed to persist feedback:', insertError.message);
		// Non-fatal: we still return the feedback to the user
	}

	return feedback;
}
