/**
 * Interactive reviewer for Phase 1 evaluation samples.
 *
 * Usage:
 *   node scripts/review-phase1-sample.mjs tmp/phase1-eval-sample-*.json
 *
 * Controls:
 *   1-7 = assign category
 *   s   = skip current record
 *   q   = save and quit
 *   n   = edit reviewer notes
 *   c   = clear current review fields
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const CATEGORY_OPTIONS = [
	'UPI_fraud',
	'KYC_fraud',
	'lottery_fraud',
	'job_scam',
	'investment_fraud',
	'customer_support_scam',
	'not_fraud_relevant'
];

function truncate(value, maxLength = 220) {
	const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
	if (text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 3)}...`;
}

function printDivider() {
	console.log('\n' + '-'.repeat(72));
}

function renderRecord(record, index, total) {
	printDivider();
	console.log(`Record ${index + 1} of ${total}`);
	console.log(`Article ID: ${record.article_id}`);
	console.log(`Source: ${record.source ?? 'Unknown'}`);
	console.log(`Status: ${record.status ?? 'n/a'}`);
	console.log(`Predicted: ${record.predicted_category ?? 'n/a'} | confidence=${record.confidence ?? 'n/a'}`);
	console.log(`Review status: ${record.review_status ?? 'n/a'}`);
	console.log(`Title: ${truncate(record.title, 180)}`);

	if (record.body) {
		console.log(`Body: ${truncate(record.body, 260)}`);
	}

	if (record.scenario_summary) {
		console.log(`Summary: ${truncate(record.scenario_summary, 260)}`);
	}

	if (Array.isArray(record.clues) && record.clues.length > 0) {
		console.log('Clues:');
		for (const clue of record.clues.slice(0, 4)) {
			console.log(`- ${truncate(clue?.clue_text ?? '', 80)} | ${truncate(clue?.explanation ?? '', 100)}`);
		}
	}

	const review = record.review ?? {};
	console.log(`Current label: ${review.actual_category ?? 'unset'}`);
	console.log(`Current correctness: ${typeof review.is_prediction_correct === 'boolean' ? review.is_prediction_correct : 'unset'}`);
	if (review.reviewer_notes) {
		console.log(`Notes: ${truncate(review.reviewer_notes, 180)}`);
	}
}

function printMenu() {
	console.log('\nChoose a label:');
	CATEGORY_OPTIONS.forEach((category, index) => {
		console.log(`  ${index + 1}. ${category}`);
	});
	console.log('  s. skip');
	console.log('  n. edit reviewer notes');
	console.log('  c. clear review');
	console.log('  q. save and quit');
}

async function saveFile(filePath, payload) {
	await writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
	const inputPath = process.argv[2];

	if (!inputPath) {
		throw new Error('Pass the Phase 1 evaluation JSON file path.');
	}

	const absolutePath = path.resolve(inputPath);
	const raw = await readFile(absolutePath, 'utf8');
	const payload = JSON.parse(raw);
	const records = Array.isArray(payload.records) ? payload.records : [];

	if (records.length === 0) {
		throw new Error('No records found in the evaluation file.');
	}

	const rl = readline.createInterface({ input, output });

	try {
		for (let index = 0; index < records.length; index += 1) {
			const record = records[index];
			record.review ??= {
				actual_category: null,
				is_prediction_correct: null,
				reviewer_notes: ''
			};

			if (record.review.actual_category) {
				continue;
			}

			renderRecord(record, index, records.length);

			while (true) {
				printMenu();
				const answer = (await rl.question('\nYour choice: ')).trim().toLowerCase();

				if (answer === 'q') {
					await saveFile(absolutePath, payload);
					console.log(`\nSaved progress to ${absolutePath}`);
					return;
				}

				if (answer === 's') {
					break;
				}

				if (answer === 'n') {
					const notes = await rl.question('Reviewer notes: ');
					record.review.reviewer_notes = notes.trim();
					await saveFile(absolutePath, payload);
					console.log('Notes saved.');
					continue;
				}

				if (answer === 'c') {
					record.review.actual_category = null;
					record.review.is_prediction_correct = null;
					record.review.reviewer_notes = '';
					await saveFile(absolutePath, payload);
					console.log('Review cleared.');
					continue;
				}

				const choice = Number.parseInt(answer, 10);
				if (!Number.isInteger(choice) || choice < 1 || choice > CATEGORY_OPTIONS.length) {
					console.log('Invalid choice. Pick 1-7, s, n, c, or q.');
					continue;
				}

				const selectedCategory = CATEGORY_OPTIONS[choice - 1];
				record.review.actual_category = selectedCategory;
				record.review.is_prediction_correct = selectedCategory === record.predicted_category;
				await saveFile(absolutePath, payload);
				console.log(`Saved label: ${selectedCategory}`);
				break;
			}
		}

		await saveFile(absolutePath, payload);
		console.log(`\nAll unlabeled records processed. Saved to ${absolutePath}`);
	} finally {
		rl.close();
	}
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
