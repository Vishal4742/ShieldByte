// test_whatsapp.js
// Simulates sending WhatsApp messages to our local web server to verify State Machine logic.

const phone = '1234567890';
const WEBHOOK_URL = 'http://localhost:5173/api/whatsapp/webhook';

async function sendMsg(text) {
  console.log(`\n\x1b[36m👉 Sending: "${text}"\x1b[0m`);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulated: true,
        phone,
        text
      })
    });
	
	if (!res.ok) {
		console.log(`\x1b[31m❌ Webhook responsed with ${res.status}: ${await res.text()}\x1b[0m`);
		return;
	}

    // Wait 1.5 seconds for server to process the state and log its fake response
    await new Promise(r => setTimeout(r, 1500));
  } catch (err) {
    console.error('Test error:', err);
  }
}

async function runTest() {
  console.log('🤖 --- WhatsApp Bot Simulator START ---');
  await sendMsg('start');
  await sendMsg('link');
  await sendMsg('urgent');
  await sendMsg('free');
  console.log('🤖 --- WhatsApp Bot Simulator END ---');
}

runTest();
