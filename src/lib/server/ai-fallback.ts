/**
 * ShieldByte — Shared AI Provider Utility
 *
 * Shared multi-provider fallback logic for AI completion requests.
 * Used by ai-classifier.ts, mission-generator.ts, and feedback endpoints
 * to avoid duplicating the same fallback chain.
 */

export interface AIProviderConfig {
	name: string;
	generate: (prompt: string) => Promise<string>;
}

export interface AIFallbackOptions {
	/** Human-readable label for logging, e.g. "classification" or "mission generation" */
	taskLabel: string;
	/** The prompt to send to the provider */
	prompt: string;
	/** Ordered list of providers to try */
	providers: AIProviderConfig[];
	/** Optional delay between retries in ms (default: 100) */
	retryDelayMs?: number;
}

/**
 * Try each provider in order, returning the first successful result.
 * Falls through to the next provider on failure.
 *
 * @returns The raw response text from the first successful provider
 * @throws Error if all providers fail
 */
export async function runWithFallback(options: AIFallbackOptions): Promise<{ result: string; provider: string }> {
	const { taskLabel, prompt, providers, retryDelayMs = 100 } = options;
	const errors: { provider: string; error: string }[] = [];

	for (const provider of providers) {
		try {
			const result = await provider.generate(prompt);
			if (result && result.trim().length > 0) {
				return { result: result.trim(), provider: provider.name };
			}
			errors.push({ provider: provider.name, error: 'Empty response' });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			errors.push({ provider: provider.name, error: message });
			console.warn(`[ai-fallback] ${taskLabel}: ${provider.name} failed: ${message}`);
		}

		// Brief delay before trying next provider
		if (retryDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
		}
	}

	const summary = errors.map((e) => `${e.provider}: ${e.error}`).join('; ');
	throw new Error(`[ai-fallback] ${taskLabel}: All ${providers.length} providers failed. ${summary}`);
}

/**
 * Extract JSON from a potentially markdown-wrapped response.
 * Handles responses wrapped in ```json ... ``` or containing raw JSON.
 */
export function extractJSON(text: string): string {
	// Try to find JSON in markdown code block
	const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
	if (codeBlockMatch) {
		return codeBlockMatch[1].trim();
	}

	// Try to find raw JSON (object or array)
	const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
	if (jsonMatch) {
		return jsonMatch[1].trim();
	}

	return text.trim();
}
