import { json, type RequestHandler } from '@sveltejs/kit';
import { handleIncomingMessage } from '$lib/server/whatsapp/state-machine.js';
import { env } from '$env/dynamic/private';

// GET is used by Meta Cloud API for Webhook Verification
export const GET: RequestHandler = async ({ url }) => {
	const mode = url.searchParams.get('hub.mode');
	const token = url.searchParams.get('hub.verify_token');
	const challenge = url.searchParams.get('hub.challenge');

	const YOUR_VERIFY_TOKEN = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'shieldbyte_secret_token';

	if (mode && token) {
		if (mode === 'subscribe' && token === YOUR_VERIFY_TOKEN) {
			console.log('WEBHOOK_VERIFIED');
			// Return just the challenge string as plain text with 200 OK
			return new Response(challenge, { status: 200 });
		}
		return new Response('Forbidden', { status: 403 });
	}

	return new Response('WhatsApp Webhook Active', { status: 200 });
};

// POST is used to receive actual messages
export const POST: RequestHandler = async ({ request }) => {
	try {
		const payload = await request.json();

		// Check if it's a Meta WhatsApp Cloud API format payload
		if (payload.object === 'whatsapp_business_account' || payload.object === 'page') {
			const entry = payload.entry?.[0];
			const changes = entry?.changes?.[0];
			const value = changes?.value;
			const messages = value?.messages;

			if (messages && messages.length > 0) {
				const message = messages[0];
				if (message.type === 'text') {
					const phoneNumber = message.from;
					const textBody = message.text.body;

					// Fire and forget the state machine handler
					handleIncomingMessage(phoneNumber, textBody).catch(err => {
						console.error('[WhatsApp API] Error in handleIncomingMessage:', err);
					});
				}
			}
		} else if (payload.From && payload.Body) {
			// Fallback: If integrating with Twilio, it sends form-data typically, 
			// but if mapped to JSON or sent as generic POST:
			const phoneNumber = payload.From.replace('whatsapp:', '');
			const textBody = payload.Body;

			handleIncomingMessage(phoneNumber, textBody).catch(err => {
				console.error('[WhatsApp API] Error in handleIncomingMessage:', err);
			});
		} else if (payload.simulated && payload.phone && payload.text) {
			// Custom hook strictly for MVP offline testing via cURL
			handleIncomingMessage(payload.phone, payload.text).catch(err => {
				console.error('[WhatsApp API MVP] Error in simulated handler:', err);
			});
		}

		// WhatsApp requires a fast 200 OK
		return new Response('EVENT_RECEIVED', { status: 200 });
	} catch (err) {
		console.error('[WhatsApp Webhook Error]', err);
		return new Response('Internal Server Error', { status: 500 });
	}
};
