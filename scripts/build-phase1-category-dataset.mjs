/**
 * Build a category dataset by combining gold review labels and approved weak-label candidates.
 *
 * Usage:
 *   node scripts/build-phase1-category-dataset.mjs tmp/phase1-eval-sample-*.json
 *   node scripts/build-phase1-category-dataset.mjs tmp/phase1-eval-sample-*.json --weak tmp/phase1-weak-label-candidates-*.json
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FRAUD_CATEGORIES = new Set([
  'UPI_fraud',
  'KYC_fraud',
  'lottery_fraud',
  'job_scam',
  'investment_fraud',
  'customer_support_scam'
]);
const DEFAULT_OUTPUT_PATH = 'tmp/phase1-category-dataset.jsonl';

function buildGoldExample(record, sourceFile) {
  const label = record?.review?.actual_category;
  if (!FRAUD_CATEGORIES.has(label)) {
    return null;
  }

  const clueText = Array.isArray(record.clues)
    ? record.clues.map((clue) => clue?.clue_text ?? '').filter(Boolean).join(' ')
    : '';

  const text = [
    record.title,
    record.body,
    record.scenario_summary,
    clueText
  ]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('\n\n');

  if (!text) {
    return null;
  }

  return {
    label,
    text,
    article_id: record.article_id ?? null,
    source_type: 'gold_review',
    source_file: sourceFile
  };
}

function buildWeakExample(candidate, category, sourceFile) {
  const approved = candidate?.review?.approved;
  const correctedCategory = candidate?.review?.corrected_category;
  const label = approved === true
    ? candidate.suggested_category
    : approved === false && FRAUD_CATEGORIES.has(correctedCategory)
      ? correctedCategory
      : null;

  if (!FRAUD_CATEGORIES.has(label)) {
    return null;
  }

  const text = [
    candidate.title,
    candidate.body,
    candidate.scenario_summary
  ]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('\n\n');

  if (!text) {
    return null;
  }

  return {
    label,
    text,
    article_id: candidate.article_id ?? null,
    source_type: 'weak_label_review',
    weak_label_category: category,
    source_file: sourceFile
  };
}

async function loadGoldExamples(reviewPaths) {
  const examples = [];

  for (const reviewPath of reviewPaths) {
    const absolutePath = path.resolve(reviewPath);
    const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
    const records = Array.isArray(parsed.records) ? parsed.records : [];

    for (const record of records) {
      const example = buildGoldExample(record, path.basename(absolutePath));
      if (example) {
        examples.push(example);
      }
    }
  }

  return examples;
}

async function loadWeakExamples(weakPath) {
  if (!weakPath) {
    return [];
  }

  const absolutePath = path.resolve(weakPath);
  const parsed = JSON.parse(await readFile(absolutePath, 'utf8'));
  const categories = parsed.categories ?? {};
  const examples = [];

  for (const [category, candidates] of Object.entries(categories)) {
    if (!Array.isArray(candidates)) {
      continue;
    }

    for (const candidate of candidates) {
      const example = buildWeakExample(candidate, category, path.basename(absolutePath));
      if (example) {
        examples.push(example);
      }
    }
  }

  return examples;
}

async function main() {
  const args = process.argv.slice(2);
  const weakIndex = args.indexOf('--weak');
  const reviewPaths = weakIndex === -1 ? args : args.slice(0, weakIndex);
  const weakPath = weakIndex === -1 ? null : args[weakIndex + 1];

  if (reviewPaths.length === 0) {
    throw new Error('Pass at least one labeled Phase 1 review JSON file.');
  }

  if (weakIndex !== -1 && !weakPath) {
    throw new Error('Pass a weak-label candidate JSON file after --weak.');
  }

  const goldExamples = await loadGoldExamples(reviewPaths);
  const weakExamples = await loadWeakExamples(weakPath);
  const allExamples = [...goldExamples, ...weakExamples];

  if (allExamples.length === 0) {
    throw new Error('No usable category examples found.');
  }

  const outputPath = path.resolve(DEFAULT_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const lines = allExamples.map((example) => JSON.stringify(example));
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Wrote category dataset: ${outputPath}`);
  console.log(`Gold examples: ${goldExamples.length}`);
  console.log(`Weak examples: ${weakExamples.length}`);
  console.log(`Total examples: ${allExamples.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
