const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterJsonParams {
	model: string;
	systemPrompt: string;
	userPrompt: string;
	temperature: number;
	maxOutputTokens: number;
	schema?: Record<string, unknown>;
}

function getEnvValue(name: string): string | null {
	const value = process.env[name];
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function getEnvList(name: string): string[] {
	return (process.env[name] ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
}

export function getOpenRouterApiKey(): string | null {
	return getEnvValue('OPENROUTER_API_KEY');
}

export function getOpenRouterApiKeys(): string[] {
	return [
		getEnvValue('OPENROUTER_API_KEY'),
		getEnvValue('OPENROUTER_API_KEY_2'),
		getEnvValue('OPENROUTER_API_KEY_3')
	].filter((value): value is string => Boolean(value));
}

export function getOpenRouterClassifierModels(): string[] {
	return getEnvList('OPENROUTER_CLASSIFIER_MODELS');
}

export function getOpenRouterMissionModels(): string[] {
	return getEnvList('OPENROUTER_MISSION_MODELS');
}

export function getOpenRouterFeedbackModels(): string[] {
	return getEnvList('OPENROUTER_FEEDBACK_MODELS');
}

function buildOpenRouterBody(params: OpenRouterJsonParams, useJsonSchema: boolean) {
	return {
		model: params.model,
		messages: [
			{
				role: 'system',
				content: params.systemPrompt
			},
			{
				role: 'user',
				content: params.userPrompt
			}
		],
		temperature: params.temperature,
		max_tokens: params.maxOutputTokens,
		response_format: useJsonSchema && params.schema
			? {
					type: 'json_schema',
					json_schema: {
						name: 'shieldbyte_structured_response',
						strict: true,
						schema: params.schema
					}
				}
			: { type: 'json_object' }
	};
}

async function callOpenRouter(
	apiKey: string,
	params: OpenRouterJsonParams,
	useJsonSchema: boolean
): Promise<Response> {
	return fetch(OPENROUTER_API_BASE, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': 'http://localhost',
			'X-Title': 'ShieldByte'
		},
		body: JSON.stringify(buildOpenRouterBody(params, useJsonSchema))
	});
}

function shouldRetryWithoutSchema(status: number, errorText: string): boolean {
	return (
		status === 400 &&
		/error|response_format|json_schema|json_object|must be text or json_object/i.test(errorText)
	);
}

export async function generateOpenRouterJson(params: OpenRouterJsonParams): Promise<string | null> {
	const apiKeys = getOpenRouterApiKeys();
	if (apiKeys.length === 0) {
		return null;
	}

	let lastError: Error | null = null;

	for (const apiKey of apiKeys) {
		let response = await callOpenRouter(apiKey, params, true);
		let usedJsonSchema = true;

		if (!response.ok) {
			const errorText = await response.text();
			if (params.schema && shouldRetryWithoutSchema(response.status, errorText)) {
				response = await callOpenRouter(apiKey, params, false);
				usedJsonSchema = false;
			} else {
				lastError = new Error(`OpenRouter API error (${response.status}): ${errorText}`);
				continue;
			}
		}

		if (!response.ok) {
			const errorText = await response.text();
			lastError = new Error(
				`OpenRouter API error (${response.status})${usedJsonSchema ? '' : ' after json_object retry'}: ${errorText}`
			);
			continue;
		}

		const data = (await response.json()) as {
			choices?: Array<{
				message?: {
					content?: string;
				};
			}>;
		};

		const text = data.choices?.[0]?.message?.content?.trim();
		if (text && text.length > 0) {
			return text;
		}
	}

	if (lastError) {
		throw lastError;
	}

	return null;
}
