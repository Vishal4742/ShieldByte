/**
 * Trigger Phase 1 cron endpoints with the configured CRON_SECRET.
 *
 * Usage:
 *   node --env-file=.env scripts/run-phase1-cron.mjs classify http://127.0.0.1:5173
 *   node --env-file=.env scripts/run-phase1-cron.mjs ingest https://your-deployment.vercel.app
 *   node --env-file=.env scripts/run-phase1-cron.mjs both https://your-deployment.vercel.app
 */

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
	throw new Error('Missing CRON_SECRET in environment.');
}

const target = (process.argv[2] ?? 'classify').toLowerCase();
const baseUrl = process.argv[3]?.trim();

if (!baseUrl) {
	throw new Error('Pass the base URL as the second argument, for example http://127.0.0.1:5173.');
}

const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
const validTargets = new Set(['ingest', 'classify', 'both']);

if (!validTargets.has(target)) {
	throw new Error('Target must be one of: ingest, classify, both.');
}

const jobs =
	target === 'both'
		? ['ingest', 'classify']
		: [target];

async function runJob(job) {
	const url = `${normalizedBaseUrl}/api/cron/${job}`;
	console.log(`Calling ${url}`);

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'x-cron-secret': CRON_SECRET
		}
	});

	const text = await response.text();
	let payload = null;

	try {
		payload = JSON.parse(text);
	} catch {
		payload = text;
	}

	if (!response.ok) {
		console.error(`\n${job} failed (${response.status})`);
		console.error(typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2));
		process.exitCode = 1;
		return;
	}

	console.log(`\n${job} succeeded`);
	console.log(JSON.stringify(payload, null, 2));
}

for (const job of jobs) {
	// Keep order deterministic: ingest first, classify second.
	// This makes "both" usable as a one-shot fresh Phase 1 run.
	// eslint-disable-next-line no-await-in-loop
	await runJob(job);

	if (process.exitCode) {
		break;
	}
}
