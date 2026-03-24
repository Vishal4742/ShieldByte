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

export async function runClassificationPipeline(): Promise<{
	classified: number;
	failed: number;
	total: number;
}> {
	console.log('[classify] Starting classification pipeline...');

	const { data: rawArticles, error } = await supabase
		.from('fraud_articles')
		.select('id, title, body')
		.eq('status', 'raw')
		.limit(50);

	if (error) {
		console.error('[classify] DB fetch error:', error.message);
		return { classified: 0, failed: 0, total: 0 };
	}

	if (!rawArticles || rawArticles.length === 0) {
		console.log('[classify] No raw articles to classify.');
		return { classified: 0, failed: 0, total: 0 };
	}

	console.log(`[classify] Processing ${rawArticles.length} articles...`);

	let classified = 0;
	let failed = 0;

	for (const article of rawArticles) {
		const result = await classifyArticle(article.title, article.body || '');

		if (result) {
			const { error: updateError } = await supabase
				.from('fraud_articles')
				.update({
					category: result.fraud_type,
					classification_confidence: 1.0,
					raw_extraction: result,
					status: 'classified'
				})
				.eq('id', article.id);

			if (updateError) {
				console.error(`[classify] Update failed for ${article.id}:`, updateError.message);
				failed++;
			} else {
				classified++;
			}
		} else {
			await supabase.from('fraud_articles').update({ status: 'failed' }).eq('id', article.id);
			failed++;
		}

		await new Promise((resolve) => setTimeout(resolve, 200));
	}

	console.log(`[classify] Done: ${classified} classified, ${failed} failed out of ${rawArticles.length}`);

	return {
		classified,
		failed,
		total: rawArticles.length
	};
}
