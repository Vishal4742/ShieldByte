/**
 * Score a manually labeled Phase 1 review set.
 * Usage:
 *   node scripts/evaluate-phase1-accuracy.mjs tmp/phase1-eval-sample-*.json
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const allowedCategories = new Set([
  'UPI_fraud',
  'KYC_fraud',
  'lottery_fraud',
  'job_scam',
  'investment_fraud',
  'customer_support_scam'
]);

function normalizeCategory(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printConfusionMatrix(matrix) {
  console.log('\nConfusion summary:');
  for (const [actual, predictedMap] of matrix.entries()) {
    const pairs = [...predictedMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([predicted, count]) => `${predicted}: ${count}`);
    console.log(`- ${actual} -> ${pairs.join(', ')}`);
  }
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

  if (records.length === 0) {
    throw new Error('No review records found in the provided file.');
  }

  let labeled = 0;
  let correct = 0;
  let autoApprovedLabeled = 0;
  let autoApprovedCorrect = 0;
  const confusion = new Map();
  const perCategoryTotals = new Map();
  const perCategoryCorrect = new Map();

  for (const record of records) {
    const actual = normalizeCategory(record?.review?.actual_category);
    const predicted = normalizeCategory(record?.predicted_category);

    if (!allowedCategories.has(predicted)) {
      continue;
    }

    if (!allowedCategories.has(actual)) {
      continue;
    }

    labeled++;
    increment(perCategoryTotals, actual);

    if (!confusion.has(actual)) {
      confusion.set(actual, new Map());
    }

    increment(confusion.get(actual), predicted);

    const explicitCorrect = record?.review?.is_prediction_correct;
    const isCorrect = typeof explicitCorrect === 'boolean' ? explicitCorrect : actual === predicted;

    if (isCorrect) {
      correct++;
      increment(perCategoryCorrect, actual);
    }

    if (record.review_status === 'auto_approved') {
      autoApprovedLabeled++;
      if (isCorrect) {
        autoApprovedCorrect++;
      }
    }
  }

  if (labeled === 0) {
    throw new Error('No labeled rows found. Fill review.actual_category before scoring.');
  }

  const accuracy = correct / labeled;
  const autoApprovedAccuracy =
    autoApprovedLabeled > 0 ? autoApprovedCorrect / autoApprovedLabeled : null;

  console.log(`Reviewed file: ${absolutePath}`);
  console.log(`Labeled articles: ${labeled}`);
  console.log(`Correct predictions: ${correct}`);
  console.log(`Overall accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log(`SRS target met (>85%): ${accuracy >= 0.85 ? 'yes' : 'no'}`);

  if (autoApprovedAccuracy !== null) {
    console.log(
      `Auto-approved accuracy: ${(autoApprovedAccuracy * 100).toFixed(1)}% (${autoApprovedCorrect}/${autoApprovedLabeled})`
    );
  }

  console.log('\nPer-category accuracy:');
  for (const [category, total] of perCategoryTotals.entries()) {
    const categoryCorrect = perCategoryCorrect.get(category) ?? 0;
    const categoryAccuracy = total > 0 ? (categoryCorrect / total) * 100 : 0;
    console.log(`- ${category}: ${categoryAccuracy.toFixed(1)}% (${categoryCorrect}/${total})`);
  }

  printConfusionMatrix(confusion);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
