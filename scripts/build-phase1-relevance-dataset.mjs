/**
 * Build a relevance dataset from one or more labeled Phase 1 review JSON files.
 *
 * Usage:
 *   node scripts/build-phase1-relevance-dataset.mjs tmp/phase1-eval-sample-*.json
 *   node scripts/build-phase1-relevance-dataset.mjs tmp/file-a.json tmp/file-b.json
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_OUTPUT_PATH = 'tmp/phase1-relevance-dataset.jsonl';

function normalizeLabel(actualCategory) {
  if (actualCategory === 'not_fraud_relevant') {
    return 'not_fraud_relevant';
  }

  if (typeof actualCategory === 'string' && actualCategory.trim().length > 0) {
    return 'fraud_relevant';
  }

  return null;
}

function buildText(record) {
  const clueText = Array.isArray(record.clues)
    ? record.clues
        .map((clue) => clue?.clue_text ?? '')
        .filter(Boolean)
        .join(' ')
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

async function loadExamples(inputPaths) {
  const examples = [];

  for (const inputPath of inputPaths) {
    const absolutePath = path.resolve(inputPath);
    const raw = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed.records) ? parsed.records : [];

    for (const record of records) {
      const actualCategory = record?.review?.actual_category;
      const label = normalizeLabel(actualCategory);

      if (!label) {
        continue;
      }

      const text = buildText(record);
      if (!text) {
        continue;
      }

      examples.push({
        source_file: path.basename(absolutePath),
        article_id: record.article_id ?? null,
        label,
        actual_category: actualCategory,
        predicted_category: record.predicted_category ?? null,
        confidence: record.confidence ?? null,
        review_status: record.review_status ?? null,
        title: record.title ?? null,
        text
      });
    }
  }

  return examples;
}

async function main() {
  const inputPaths = process.argv.slice(2);

  if (inputPaths.length === 0) {
    throw new Error('Pass one or more labeled Phase 1 review JSON files.');
  }

  const examples = await loadExamples(inputPaths);
  if (examples.length === 0) {
    throw new Error('No labeled examples found in the provided files.');
  }

  const outputPath = path.resolve(DEFAULT_OUTPUT_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const lines = examples.map((example) => JSON.stringify(example));
  await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');

  const counts = examples.reduce((acc, example) => {
    acc[example.label] = (acc[example.label] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Wrote relevance dataset: ${outputPath}`);
  console.log(`Examples: ${examples.length}`);
  console.log(`fraud_relevant: ${counts.fraud_relevant ?? 0}`);
  console.log(`not_fraud_relevant: ${counts.not_fraud_relevant ?? 0}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
