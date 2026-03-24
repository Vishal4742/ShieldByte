function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function formatMessageBody(messageBody: string): string {
	return escapeHtml(messageBody).replace(/\n/g, '<br />');
}

export function renderMissionHtml(input: {
	simulationType: string;
	sender: string;
	messageBody: string;
}): string {
	const title =
		input.simulationType === 'email'
			? 'Inbox'
			: input.simulationType === 'call_transcript'
				? 'Call Transcript'
				: input.simulationType === 'WhatsApp_message'
					? 'WhatsApp'
					: 'SMS';

	return `
<article class="shieldbyte-sim shieldbyte-sim--${escapeHtml(input.simulationType)}">
  <header class="shieldbyte-sim__header">
    <span class="shieldbyte-sim__title">${escapeHtml(title)}</span>
    <span class="shieldbyte-sim__sender">${escapeHtml(input.sender)}</span>
  </header>
  <div class="shieldbyte-sim__body">${formatMessageBody(input.messageBody)}</div>
</article>`.trim();
}
