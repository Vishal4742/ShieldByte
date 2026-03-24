import { env } from '$env/dynamic/private';

// This abstracts message sending so we can plug in Twilio or Meta Cloud API later.
// For MVP/testing, we will log to console if keys aren't present.

export async function sendWhatsAppMessage(toPhone: string, textBody: string) {
	const waToken = env.WHATSAPP_API_TOKEN;
	const waPhoneId = env.WHATSAPP_PHONE_NUMBER_ID;

	if (!waToken || !waPhoneId) {
		console.log(`\n[WhatsApp Simulator] Message to ${toPhone}:\n${textBody}\n`);
		return { success: true, simulated: true };
	}

	// Example Meta Cloud API implementation
	try {
		const res = await fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${waToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				messaging_product: 'whatsapp',
				to: toPhone,
				type: 'text',
				text: { body: textBody }
			})
		});

		if (!res.ok) {
			const errBody = await res.text();
			console.error('[WhatsApp Messenger] Failed to send message:', res.status, errBody);
			return { success: false, error: errBody };
		}

		const data = await res.json();
		return { success: true, messageId: data.messages?.[0]?.id };
	} catch (error) {
		console.error('[WhatsApp Messenger] Network error:', error);
		return { success: false, error };
	}
}
