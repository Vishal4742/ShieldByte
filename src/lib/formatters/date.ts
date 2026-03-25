export function formatPublishedDate(value: string | null): string {
	if (!value) {
		return 'Date unavailable';
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return 'Date unavailable';
	}

	return new Intl.DateTimeFormat('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	}).format(parsed);
}
