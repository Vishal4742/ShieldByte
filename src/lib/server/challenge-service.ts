const MISSING_CHALLENGES_TABLE_MESSAGE =
	'Challenge mode is unavailable until the challenges table migration is applied.';

function errorMessage(error: unknown): string {
	if (typeof error === 'string') {
		return error;
	}

	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message?: unknown }).message;
		return typeof message === 'string' ? message : '';
	}

	return '';
}

export function isMissingChallengesTableError(error: unknown): boolean {
	const message = errorMessage(error);
	return (
		/public\.challenges/i.test(message) ||
		/relation .*challenges.* does not exist/i.test(message) ||
		/schema cache/i.test(message)
	);
}

export function getChallengesUnavailableMessage(): string {
	return MISSING_CHALLENGES_TABLE_MESSAGE;
}
