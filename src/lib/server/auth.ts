/**
 * ShieldByte — Lightweight API Authentication
 *
 * Since the app uses client-generated guest IDs (no Supabase Auth),
 * this module provides a server-side token system to prevent trivial
 * impersonation. The client signs their player ID with a shared secret
 * and sends the resulting token in an `x-player-token` header.
 *
 * This is NOT a replacement for real auth (Supabase Auth, OAuth, etc.)
 * but prevents casual API abuse and impersonation.
 */

import { API_SECRET } from '$env/static/private';

const encoder = new TextEncoder();

/**
 * Generate a hex-encoded HMAC-SHA256 token for a player ID.
 * Used server-side to validate client-sent tokens.
 */
export async function generatePlayerToken(userId: string): Promise<string> {
	const secret = API_SECRET || 'shieldbyte-default-dev-secret';
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(userId));
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Validate a user_id + token pair.
 * Returns true if the token matches the expected HMAC for the user_id.
 */
export async function validatePlayerToken(userId: string, token: string): Promise<boolean> {
	if (!userId || !token) {
		return false;
	}

	const expected = await generatePlayerToken(userId);
	// Constant-time comparison to prevent timing attacks
	if (expected.length !== token.length) {
		return false;
	}

	let mismatch = 0;
	for (let i = 0; i < expected.length; i++) {
		mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
	}

	return mismatch === 0;
}

/**
 * Extract and validate authentication from a request.
 * Returns the validated user_id or null if authentication fails.
 *
 * Expects:
 * - `x-player-id` header or `user_id` in body/query
 * - `x-player-token` header with the HMAC token
 */
export async function authenticateRequest(
	request: Request,
	userId?: string | null
): Promise<{ userId: string } | { error: string }> {
	const headerUserId = request.headers.get('x-player-id');
	const headerToken = request.headers.get('x-player-token');
	const effectiveUserId = userId || headerUserId;

	if (!effectiveUserId || effectiveUserId.trim().length === 0) {
		return { error: 'Missing user identification.' };
	}

	if (!headerToken) {
		return { error: 'Missing x-player-token header.' };
	}

	const valid = await validatePlayerToken(effectiveUserId, headerToken);
	if (!valid) {
		return { error: 'Invalid player token.' };
	}

	return { userId: effectiveUserId };
}
