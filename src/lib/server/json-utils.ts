export function parseJsonObjectLoose(raw: string): unknown {
	const attempts = [
		raw,
		raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, ''),
		extractOuterJsonObject(raw)
	].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);

	for (const candidate of attempts) {
		try {
			return JSON.parse(candidate);
		} catch {
			continue;
		}
	}

	throw new SyntaxError('Failed to parse model response as JSON.');
}

function extractOuterJsonObject(raw: string): string | null {
	const start = raw.indexOf('{');
	const end = raw.lastIndexOf('}');

	if (start === -1 || end === -1 || end <= start) {
		return null;
	}

	return raw.slice(start, end + 1);
}
