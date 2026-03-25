/**
 * Evaluate a trained relevance model against a labeled Phase 1 review JSON file.
 *
 * Usage:
 *   node scripts/evaluate-phase1-relevance-model.mjs tmp/phase1-relevance-model.json tmp/phase1-eval-sample-*.json
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'from', 'by', 'at',
  'is', 'was', 'were', 'be', 'been', 'being', 'that', 'this', 'it', 'as', 'into', 'after',
  'before', 'about', 'through', 'their', 'them', 'they', 'has', 'have', 'had', 'will', 'would',
  'can', 'could', 'may', 'might'
]);

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  const tokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  const bigrams = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    bigrams.push(`${tokens[index]}_${tokens[index + 1]}`);
  }

  return [...tokens, ...bigrams];
}

function buildText(record) {
  const clueText = Array.isArray(record.clues)
    ? record.clues.map((clue) => clue?.clue_text ?? '').filter(Boolean).join(' ')
    : '';

  return [
    record.title,
    record.body,
    record.scenario_summary,
    clueText
  ]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('\n\n');
}

function normalizeLabel(actualCategory) {
  if (actualCategory === 'not_fraud_relevant') {
    return 'not_fraud_relevant';
  }

  if (typeof actualCategory === 'string' && actualCategory.trim().length > 0) {
    return 'fraud_relevant';
  }

  return null;
}

function predict(model, tokens) {
  const scores = {};

  for (const label of model.labels) {
    const stats = model.stats[label];
    let score = stats.logPrior;

    for (const token of tokens) {
      score += stats.tokenLogProbs[token] ?? stats.defaultLogProb;
    }

    scores[label] = score;
  }

  return Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0];
}

async function main() {
  const modelPath = process.argv[2];
  const reviewPath = process.argv[3];

  if (!modelPath || !reviewPath) {
    throw new Error('Pass the relevance model path and a labeled review JSON path.');
  }

  const model = JSON.parse(await readFile(path.resolve(modelPath), 'utf8'));
  const review = JSON.parse(await readFile(path.resolve(reviewPath), 'utf8'));
  const records = Array.isArray(review.records) ? review.records : [];

  let total = 0;
  let correct = 0;
  const confusion = new Map();

  for (const record of records) {
    const actual = normalizeLabel(record?.review?.actual_category);
    if (!actual) {
      continue;
    }

    const text = buildText(record);
    const tokens = tokenizeText(text);
    if (tokens.length === 0) {
      continue;
    }

    const predicted = predict(model, tokens);
    total += 1;

    if (!confusion.has(actual)) {
      confusion.set(actual, new Map());
    }

    const row = confusion.get(actual);
    row.set(predicted, (row.get(predicted) ?? 0) + 1);

    if (predicted === actual) {
      correct += 1;
    }
  }

  if (total === 0) {
    throw new Error('No labeled relevance examples were found in the review file.');
  }

  console.log(`Evaluated examples: ${total}`);
  console.log(`Relevance accuracy: ${((correct / total) * 100).toFixed(1)}% (${correct}/${total})`);
  console.log('\nRelevance confusion summary:');

  for (const [actual, predictedMap] of confusion.entries()) {
    const summary = [...predictedMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([predicted, count]) => `${predicted}: ${count}`)
      .join(', ');
    console.log(`- ${actual} -> ${summary}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
