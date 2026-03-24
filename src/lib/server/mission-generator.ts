/**
 * ShieldByte — Mission Generator Service
 * Uses Groq (Llama 3) to convert classified fraud articles into
 * playable scam simulation missions with embedded clues.
 * Generates 3 variants per article as per SRS Phase 2.
 */

import Groq from 'groq-sdk';
import { z } from 'zod';
import { supabase } from './supabase.js';
import { GROQ_API_KEY } from '$env/static/private';
import { ClassificationSchema } from './extraction.js';
import { renderMissionHtml } from './mission-rendering.js';

// ─── Groq Client ────────────────────────────────────────────

let groqClient: Groq | null = null;
const MISSION_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'] as const;

function getGroq(): Groq {
	if (!groqClient) {
		if (!GROQ_API_KEY) {
			throw new Error('GROQ_API_KEY is not set.');
		}
		groqClient = new Groq({ apiKey: GROQ_API_KEY });
	}
	return groqClient;
}

// ─── Zod Schema for Mission Validation ──────────────────────

const MissionClueSchema = z.object({
	id: z.number(),
	trigger_text: z.string().min(2),
	type: z.enum([
		'urgency',
		'suspicious_link',
		'fake_sender',
		'credential_request',
		'upfront_fee',
		'too_good_to_be_true'
	]),
	difficulty: z.enum(['easy', 'medium', 'hard']),
	explanation: z.string().max(150)
});

const MissionSchema = z.object({
	simulation_type: z.enum(['SMS', 'WhatsApp_message', 'email', 'call_transcript']),
	sender: z.string().min(1),
	message_body: z.string().min(20),
	clues: z.array(MissionClueSchema).min(3).max(6),
	difficulty_overall: z.enum(['easy', 'medium', 'hard']),
	tip: z.string().min(5)
});

type MissionResult = z.infer<typeof MissionSchema>;

interface MissionGenerationOptions {
	forceRegenerate?: boolean;
}

export const MissionGenerationRequestSchema = z.object({
	fraudData: ClassificationSchema,
	articleId: z.number().int().positive().optional(),
	fraudTypeOverride: z.string().min(1).optional(),
	variantCount: z.number().int().min(1).max(3).default(3),
	persist: z.boolean().default(true)
});

export type MissionGenerationRequest = z.infer<typeof MissionGenerationRequestSchema>;
export type GeneratedMissionRecord = MissionResult & {
	article_id: number | null;
	fraud_type: string;
	variant: number;
	simulation_html: string;
};

// ─── SRS Phase 2 Prompts ────────────────────────────────────

const SYSTEM_PROMPT = `You are a creative writer who specialises in generating realistic fraud simulation content for a cybersecurity training game. Your simulations must feel authentic and plausible. IMPORTANT: All output MUST be written entirely in English. Do NOT use Hindi, Hinglish, or any other non-English language.`;

function buildGenerationPrompt(fraudData: Record<string, unknown>, variantNum: number): string {
	return `Using the fraud data below, create a complete scam simulation mission. This is variant ${variantNum} of 3 — make it meaningfully different from other variants (different sender, different wording, different angle).

Return ONLY a JSON object:
{
  "simulation_type": "SMS | WhatsApp_message | email | call_transcript",
  "sender": "fake sender name or number (realistic, e.g. 'HDFCBK' or '+91-9876543210' or 'hr@amazzon-careers.in')",
  "message_body": "the full scam message text exactly as a user would receive it. MUST be written entirely in English — no Hindi or Hinglish.",
  "clues": [
    {
      "id": 1,
      "trigger_text": "exact substring from message_body that is suspicious",
      "type": "urgency | suspicious_link | fake_sender | credential_request | upfront_fee | too_good_to_be_true",
      "difficulty": "easy | medium | hard",
      "explanation": "plain English explanation of why this is a red flag (max 25 words)"
    }
  ],
  "difficulty_overall": "easy | medium | hard",
  "tip": "one practical tip for the player"
}

CRITICAL RULES:
- ALL content MUST be in English only. Do NOT use Hindi, Hinglish, or any non-English text anywhere.
- message_body must contain ALL trigger_text substrings EXACTLY as written
- Use realistic Indian fraud context (bank names, UPI IDs, etc.) but always in English
- Include realistic but fake phone numbers, URLs, and sender IDs
- Minimum 3 clues, maximum 6
- Make the message feel like a REAL scam that people actually receive in India

Fraud data:
${JSON.stringify(fraudData, null, 2)}`;
}

// ─── Generation Logic ───────────────────────────────────────

/**
 * Generate a single mission variant from classified fraud data.
 */
async function generateMissionVariant(
	fraudData: Record<string, unknown>,
	variantNum: number
): Promise<MissionResult | null> {
	const groq = getGroq();

	for (const model of MISSION_MODELS) {
		try {
			const completion = await groq.chat.completions.create({
				model,
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: buildGenerationPrompt(fraudData, variantNum) }
				],
				temperature: 0.7,
				max_tokens: 900,
				response_format: { type: 'json_object' }
			});

			const rawContent = completion.choices[0]?.message?.content;
			if (!rawContent) {
				console.error(`[mission-gen] Empty response from Groq model ${model}`);
				continue;
			}

			const parsed = JSON.parse(rawContent);
			const validated = MissionSchema.safeParse(parsed);

			if (!validated.success) {
				console.warn(`[mission-gen] Validation failed for ${model}:`, validated.error.issues);
				if (!(parsed.message_body && parsed.clues && parsed.sender)) {
					continue;
				}
			}

			const mission = validated.success ? validated.data : (parsed as MissionResult);
			const invalidClues = mission.clues.filter(
				(c) => !mission.message_body.includes(c.trigger_text)
			);

			if (invalidClues.length > 0) {
				console.warn(
					`[mission-gen] ${invalidClues.length} clues don't match message_body for ${model}, fixing...`
				);
				mission.clues = mission.clues.filter((c) =>
					mission.message_body.includes(c.trigger_text)
				);
				if (mission.clues.length < 3) {
					console.warn('[mission-gen] Too few valid clues after filtering, discarding');
					continue;
				}
			}

			return mission;
		} catch (err) {
			console.error(`[mission-gen] Groq API error for ${model}:`, err);
		}
	}

	return null;
}

function normalizeFraudType(
	fraudData: Record<string, unknown>,
	fraudTypeOverride?: string,
	fallback = 'UPI_fraud'
): string {
	if (typeof fraudTypeOverride === 'string' && fraudTypeOverride.trim().length > 0) {
		return fraudTypeOverride.trim();
	}

	if (typeof fraudData.fraud_type === 'string' && fraudData.fraud_type.trim().length > 0) {
		return fraudData.fraud_type.trim();
	}

	return fallback;
}

async function persistGeneratedMission(record: GeneratedMissionRecord): Promise<boolean> {
	const { error } = await supabase.from('missions').insert({
		article_id: record.article_id,
		fraud_type: record.fraud_type,
		simulation_type: record.simulation_type,
		simulation_html: record.simulation_html,
		sender: record.sender,
		message_body: record.message_body,
		clues_json: record.clues,
		difficulty: record.difficulty_overall,
		tip: record.tip,
		variant: record.variant,
		status: 'active'
	});

	if (error) {
		console.error(
			`[mission-gen] Insert failed for article ${record.article_id ?? 'manual'} variant ${record.variant}:`,
			error.message
		);
		return false;
	}

	return true;
}

export async function generateMissionsFromFraudData(
	request: MissionGenerationRequest
): Promise<{
	missions: GeneratedMissionRecord[];
	generated: number;
	failed: number;
}> {
	const fraudData = request.fraudData as Record<string, unknown>;
	const fraudType = normalizeFraudType(fraudData, request.fraudTypeOverride);
	const missions: GeneratedMissionRecord[] = [];
	let failed = 0;

	for (let variant = 1; variant <= request.variantCount; variant++) {
		const mission = await generateMissionVariant(fraudData, variant);

		if (!mission) {
			failed++;
			continue;
		}

		const record: GeneratedMissionRecord = {
			...mission,
			article_id: request.articleId ?? null,
			fraud_type: fraudType,
			variant,
			simulation_html: renderMissionHtml({
				simulationType: mission.simulation_type,
				sender: mission.sender,
				messageBody: mission.message_body
			})
		};

		if (request.persist) {
			const inserted = await persistGeneratedMission(record);
			if (!inserted) {
				failed++;
				continue;
			}
		}

		missions.push(record);
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	return {
		missions,
		generated: missions.length,
		failed
	};
}

// ─── Main Pipeline ──────────────────────────────────────────

/**
 * Generate missions for classified articles that don't have missions yet.
 * Creates 3 variants per article.
 */
export async function runMissionGenerationPipeline(): Promise<{
	generated: number;
	failed: number;
	total: number;
}>;
export async function runMissionGenerationPipeline(
	options: MissionGenerationOptions
): Promise<{
	generated: number;
	failed: number;
	total: number;
	archived: number;
}>;
export async function runMissionGenerationPipeline(
	options: MissionGenerationOptions = {}
): Promise<{
	generated: number;
	failed: number;
	total: number;
	archived: number;
}> {
	console.log('[mission-gen] Starting mission generation pipeline...');
	const { forceRegenerate = false } = options;

	// 1. Find classified articles without missions
	const { data: articles, error } = await supabase
		.from('fraud_articles')
		.select('id, title, body, category, raw_extraction')
		.eq('status', 'classified')
		.limit(20);

	if (error) {
		console.error('[mission-gen] DB fetch error:', error.message);
		return { generated: 0, failed: 0, total: 0, archived: 0 };
	}

	if (!articles || articles.length === 0) {
		console.log('[mission-gen] No classified articles to process.');
		return { generated: 0, failed: 0, total: 0, archived: 0 };
	}

	const articleIds = articles.map((a) => a.id);
	const { data: existingMissions, error: existingMissionsError } = await supabase
		.from('missions')
		.select('id, article_id, status')
		.in('article_id', articleIds);

	if (existingMissionsError) {
		console.error('[mission-gen] Existing mission lookup failed:', existingMissionsError.message);
		return { generated: 0, failed: 0, total: 0, archived: 0 };
	}

	let archived = 0;

	if (forceRegenerate) {
		const missionIdsToArchive = (existingMissions ?? [])
			.filter((mission: { id: number; status: string | null }) => mission.status !== 'archived')
			.map((mission: { id: number }) => mission.id);

		if (missionIdsToArchive.length > 0) {
			const { error: archiveError, count } = await supabase
				.from('missions')
				.update({ status: 'archived' }, { count: 'exact' })
				.in('id', missionIdsToArchive);

			if (archiveError) {
				console.error('[mission-gen] Failed to archive old missions:', archiveError.message);
				return { generated: 0, failed: 0, total: 0, archived: 0 };
			}

			archived = count ?? missionIdsToArchive.length;
			console.log(`[mission-gen] Archived ${archived} existing missions before regeneration.`);
		}
	}

	const articlesWithMissions = new Set(
		(existingMissions ?? []).map((m: { article_id: number }) => m.article_id)
	);
	const newArticles = forceRegenerate
		? articles
		: articles.filter((a) => !articlesWithMissions.has(a.id));

	if (newArticles.length === 0) {
		console.log('[mission-gen] All classified articles already have missions.');
		return { generated: 0, failed: 0, total: 0, archived };
	}

	console.log(`[mission-gen] Generating missions for ${newArticles.length} articles...`);

	let generated = 0;
	let failed = 0;

	// 2. Generate 3 variants per article
	for (const article of newArticles) {
		const fraudData = article.raw_extraction || {
			fraud_type: article.category,
			scenario_summary: article.body || article.title,
			title: article.title
		};
		const result = await generateMissionsFromFraudData({
			fraudData: fraudData as z.infer<typeof ClassificationSchema>,
			articleId: article.id,
			fraudTypeOverride:
				article.category || (fraudData as { fraud_type?: string }).fraud_type || 'UPI_fraud',
			variantCount: 3,
			persist: true
		});
		generated += result.generated;
		failed += result.failed;

		console.log(`[mission-gen] Article ${article.id}: completed`);
	}

	console.log(
		`[mission-gen] Done: ${generated} missions generated, ${failed} failed from ${newArticles.length} articles`
	);

	return { generated, failed, total: newArticles.length, archived };
}
