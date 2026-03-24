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

// ─── Groq Client ────────────────────────────────────────────

let groqClient: Groq | null = null;

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

	try {
		const completion = await groq.chat.completions.create({
			model: 'llama-3.3-70b-versatile',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				{ role: 'user', content: buildGenerationPrompt(fraudData, variantNum) }
			],
			temperature: 0.7,
			max_tokens: 2048,
			response_format: { type: 'json_object' }
		});

		const rawContent = completion.choices[0]?.message?.content;
		if (!rawContent) {
			console.error('[mission-gen] Empty response from Groq');
			return null;
		}

		const parsed = JSON.parse(rawContent);
		const validated = MissionSchema.safeParse(parsed);

		if (!validated.success) {
			console.warn('[mission-gen] Validation failed:', validated.error.issues);
			// Try to use as-is if it has the essential fields
			if (parsed.message_body && parsed.clues && parsed.sender) {
				return parsed as MissionResult;
			}
			return null;
		}

		// Verify all trigger_text substrings exist in message_body
		const mission = validated.data;
		const invalidClues = mission.clues.filter(
			(c) => !mission.message_body.includes(c.trigger_text)
		);

		if (invalidClues.length > 0) {
			console.warn(
				`[mission-gen] ${invalidClues.length} clues don't match message_body, fixing...`
			);
			// Filter out invalid clues (keep at least the valid ones)
			mission.clues = mission.clues.filter((c) =>
				mission.message_body.includes(c.trigger_text)
			);
			if (mission.clues.length < 3) {
				console.warn('[mission-gen] Too few valid clues after filtering, discarding');
				return null;
			}
		}

		return mission;
	} catch (err) {
		console.error('[mission-gen] Groq API error:', err);
		return null;
	}
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

		for (let variant = 1; variant <= 3; variant++) {
			const mission = await generateMissionVariant(
				fraudData as Record<string, unknown>,
				variant
			);

			if (mission) {
				const { error: insertError } = await supabase.from('missions').insert({
					article_id: article.id,
					fraud_type: article.category || (fraudData as { fraud_type?: string }).fraud_type || 'UPI_fraud',
					simulation_type: mission.simulation_type,
					sender: mission.sender,
					message_body: mission.message_body,
					clues_json: mission.clues,
					difficulty: mission.difficulty_overall,
					tip: mission.tip,
					variant,
					status: 'active'
				});

				if (insertError) {
					console.error(
						`[mission-gen] Insert failed for article ${article.id} variant ${variant}:`,
						insertError.message
					);
					failed++;
				} else {
					generated++;
				}
			} else {
				failed++;
			}

			// Rate limit: 500ms between Groq calls
			await new Promise((r) => setTimeout(r, 500));
		}

		console.log(`[mission-gen] Article ${article.id}: completed`);
	}

	console.log(
		`[mission-gen] Done: ${generated} missions generated, ${failed} failed from ${newArticles.length} articles`
	);

	return { generated, failed, total: newArticles.length, archived };
}
