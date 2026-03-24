const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434';

export interface StructuredJsonParams {
	model: string;
	systemPrompt: string;
	userPrompt: string;
	temperature: number;
	maxOutputTokens: number;
	schema?: Record<string, unknown>;
}

export function getOllamaBaseUrl(): string {
	return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL;
}

function getEnvModel(name: 'OLLAMA_CLASSIFIER_MODEL' | 'OLLAMA_MISSION_MODEL' | 'OLLAMA_FEEDBACK_MODEL'): string | null {
	const value = process.env[name];
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function getOllamaClassifierModel(): string | null {
	return getEnvModel('OLLAMA_CLASSIFIER_MODEL');
}

export function getOllamaMissionModel(): string | null {
	return getEnvModel('OLLAMA_MISSION_MODEL');
}

export function getOllamaFeedbackModel(): string | null {
	return getEnvModel('OLLAMA_FEEDBACK_MODEL');
}

export async function generateOllamaJson(params: StructuredJsonParams): Promise<string | null> {
	const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: params.model,
			stream: false,
			format: params.schema ?? 'json',
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
			options: {
				temperature: params.temperature,
				num_predict: params.maxOutputTokens
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Ollama API error (${response.status}): ${errorText}`);
	}

	const data = (await response.json()) as {
		message?: {
			content?: string;
		};
	};

	const text = data.message?.content?.trim();
	return text && text.length > 0 ? text : null;
}
