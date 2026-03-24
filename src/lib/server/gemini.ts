import { GEMINI_API_KEY } from '$env/static/private';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function getGeminiApiKey(): string | null {
	const apiKey = GEMINI_API_KEY;
	return typeof apiKey === 'string' && apiKey.trim().length > 0 ? apiKey.trim() : null;
}

export async function generateGeminiJson(params: {
	model: string;
	systemPrompt: string;
	userPrompt: string;
	temperature: number;
	maxOutputTokens: number;
}): Promise<string | null> {
	const apiKey = getGeminiApiKey();
	if (!apiKey) {
		return null;
	}

	const response = await fetch(`${GEMINI_API_BASE}/${params.model}:generateContent`, {
		method: 'POST',
		headers: {
			'x-goog-api-key': apiKey,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			systemInstruction: {
				parts: [{ text: params.systemPrompt }]
			},
			contents: [
				{
					role: 'user',
					parts: [{ text: params.userPrompt }]
				}
			],
			generationConfig: {
				temperature: params.temperature,
				maxOutputTokens: params.maxOutputTokens,
				responseMimeType: 'application/json'
			}
		})
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Gemini API error (${response.status}): ${errorText}`);
	}

	const data = (await response.json()) as {
		candidates?: Array<{
			content?: {
				parts?: Array<{
					text?: string;
				}>;
			};
		}>;
	};

	const text = data.candidates?.[0]?.content?.parts
		?.map((part) => part.text ?? '')
		.join('')
		.trim();

	return text && text.length > 0 ? text : null;
}
