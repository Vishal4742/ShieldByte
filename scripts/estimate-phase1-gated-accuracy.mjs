/**
 * Estimate Phase 1 accuracy after applying the new relevance gate
 * to an existing labeled review file.
 *
 * Usage:
 *   node scripts/estimate-phase1-gated-accuracy.mjs tmp/phase1-eval-sample-*.json
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const NON_SCAM_CONTEXT_PATTERNS = [
  ['fight fraud', 3],
  ['fraud prevention', 4],
  ['prevent fraud', 3],
  ['anti money laundering', 5],
  ['money laundering', 4],
  ['awareness campaign', 4],
  ['compensation proposal', 4],
  ['proposal', 1],
  ['guidelines', 2],
  ['advisory', 3],
  ['policy', 2],
  ['compliance', 3],
  ['tooling', 2],
  ['software', 1],
  ['platform', 1],
  ['ai vs ai', 5],
  ['future of fraud prevention', 5],
  ['to fight money laundering', 5],
  ['rolls out', 3],
  ['to launch in india', 4],
  ['smartphone', 4],
  ['feature', 2],
  ['government rescuing', 3],
  ['workshop', 3],
  ['study', 2],
  ['delegation', 2],
  ['announcement', 2],
  ['announces', 2],
  ['ministry', 3],
  ['railways', 3],
  ['pm-kisan', 5],
  ['घोषणा', 3],
  ['कार्यशाला', 3],
  ['अध्ययन', 2],
  ['मंत्रालय', 3],
  ['किसान', 4],
  ['सहकारी', 4],
  ['युवा', 2]
];

const SCAM_INCIDENT_PATTERNS = [
  ['victim', 2],
  ['scammers', 2],
  ['posed as', 3],
  ['pretending to be', 3],
  ['duped', 3],
  ['cheated', 2],
  ['defrauded', 2],
  ['lost rs', 3],
  ['lost money', 3],
  ['transferred money', 2],
  ['shared otp', 4],
  ['clicked the link', 3],
  ['collect request', 4],
  ['remote access', 4],
  ['job offer', 2],
  ['guaranteed return', 4]
];

function normalizeText(...parts) {
  return parts
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sumHits(text, patterns) {
  let score = 0;

  for (const [pattern, weight] of patterns) {
    if (text.includes(pattern)) {
      score += weight;
    }
  }

  return score;
}

function gatedPrediction(record) {
  const text = normalizeText(record.title, record.body);
  const negativeScore = sumHits(text, NON_SCAM_CONTEXT_PATTERNS);
  const positiveScore = sumHits(text, SCAM_INCIDENT_PATTERNS);

  if (negativeScore >= positiveScore + 3) {
    return 'not_fraud_relevant';
  }

  if ((record.relevance_score ?? 0) < 0.28 && negativeScore >= 2 && positiveScore < 4) {
    return 'not_fraud_relevant';
  }

  if ((!record.body || !String(record.body).trim()) && (record.relevance_score ?? 0) < 0.4 && positiveScore < 3) {
    return 'not_fraud_relevant';
  }

  return record.predicted_category ?? 'not_fraud_relevant';
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    throw new Error('Pass the labeled JSON review file path.');
  }

  const absolutePath = path.resolve(inputPath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);
  const records = Array.isArray(parsed.records) ? parsed.records : [];

  let correct = 0;
  let labeled = 0;

  for (const record of records) {
    const actual = record?.review?.actual_category;
    if (typeof actual !== 'string' || !actual) {
      continue;
    }

    const predicted = gatedPrediction(record);
    labeled += 1;

    if (predicted === actual) {
      correct += 1;
    }
  }

  const accuracy = labeled > 0 ? correct / labeled : 0;
  console.log(`Estimated gated accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${labeled})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
