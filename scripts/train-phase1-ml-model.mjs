/**
 * Train a lightweight Phase 1 category classifier from a labeled review JSON file.
 * Usage:
 *   node scripts/train-phase1-ml-model.mjs tmp/phase1-eval-sample-*.json
 *   node scripts/train-phase1-ml-model.mjs tmp/phase1-eval-sample-*.json tmp/phase1-category-model.json
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FRAUD_CATEGORIES = [
  'UPI_fraud',
  'KYC_fraud',
  'lottery_fraud',
  'job_scam',
  'investment_fraud',
  'customer_support_scam'
];
const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'from',
  'by',
  'at',
  'is',
  'was',
  'were',
  'be',
  'been',
  'being',
  'that',
  'this',
  'it',
  'as',
  'into',
  'after',
  'before',
  'about',
  'through',
  'their',
  'them',
  'they',
  'has',
  'have',
  'had',
  'will',
  'would',
  'can',
  'could',
  'may',
  'might'
]);
const DEFAULT_OUTPUT_PATH = 'tmp/phase1-category-model.json';
const TEST_RATIO = 0.2;
const SMOOTHING = 1;

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

function shuffleSeeded(values, seed = 42) {
  const result = [...values];
  let state = seed;

  function next() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(next() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildExampleText(record) {
  const clueTexts = Array.isArray(record.clues)
    ? record.clues
        .map((clue) => (typeof clue?.clue_text === 'string' ? clue.clue_text : ''))
        .filter(Boolean)
        .join(' ')
    : '';
  const matchedKeywords = Array.isArray(record.matched_keywords)
    ? record.matched_keywords.map((keyword) => `kw_${keyword}`).join(' ')
    : '';
  const source = typeof record.source === 'string' ? `source_${record.source}` : '';
  const predictedCategory =
    typeof record.predicted_category === 'string' ? `pred_${record.predicted_category}` : '';

  return [
    record.title,
    record.body,
    record.scenario_summary,
    clueTexts,
    matchedKeywords,
    source,
    predictedCategory
  ]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
}

function loadExamples(parsed) {
  const records = Array.isArray(parsed.records) ? parsed.records : [];

  return records
    .map((record) => {
      const label = record?.review?.actual_category;
      if (!FRAUD_CATEGORIES.includes(label)) {
        return null;
      }

      const text = buildExampleText(record);
      const tokens = tokenizeText(text);

      if (tokens.length === 0) {
        return null;
      }

      return {
        label,
        tokens
      };
    })
    .filter(Boolean);
}

function stratifiedSplit(examples) {
  const train = [];
  const test = [];

  for (const category of FRAUD_CATEGORIES) {
    const subset = shuffleSeeded(examples.filter((example) => example.label === category), category.length * 13);
    const testCount = Math.max(1, Math.floor(subset.length * TEST_RATIO));

    subset.forEach((example, index) => {
      if (index < testCount && subset.length > 1) {
        test.push(example);
      } else {
        train.push(example);
      }
    });
  }

  return { train, test };
}

function trainModel(examples) {
  const docCounts = Object.fromEntries(FRAUD_CATEGORIES.map((category) => [category, 0]));
  const tokenTotals = Object.fromEntries(FRAUD_CATEGORIES.map((category) => [category, 0]));
  const tokenCounts = Object.fromEntries(FRAUD_CATEGORIES.map((category) => [category, new Map()]));
  const vocabulary = new Set();

  for (const example of examples) {
    docCounts[example.label] += 1;

    for (const token of example.tokens) {
      vocabulary.add(token);
      tokenTotals[example.label] += 1;
      tokenCounts[example.label].set(token, (tokenCounts[example.label].get(token) ?? 0) + 1);
    }
  }

  const vocabularySize = vocabulary.size;
  const totalDocs = examples.length;
  const stats = {};

  for (const category of FRAUD_CATEGORIES) {
    const docCount = docCounts[category];
    const tokenTotal = tokenTotals[category];
    const logPrior = Math.log((docCount + SMOOTHING) / (totalDocs + FRAUD_CATEGORIES.length * SMOOTHING));
    const denominator = tokenTotal + vocabularySize * SMOOTHING;
    const defaultLogProb = Math.log(SMOOTHING / denominator);
    const tokenLogProbs = {};

    for (const token of vocabulary) {
      const count = tokenCounts[category].get(token) ?? 0;
      tokenLogProbs[token] = Math.log((count + SMOOTHING) / denominator);
    }

    stats[category] = {
      docCount,
      tokenTotal,
      logPrior,
      defaultLogProb,
      tokenLogProbs
    };
  }

  return {
    version: 1,
    trainedAt: new Date().toISOString(),
    labels: FRAUD_CATEGORIES,
    vocabularySize,
    tokenizer: {
      type: 'unigram-bigram',
      stopWordsRemoved: true
    },
    stats
  };
}

function predict(model, tokens) {
  const scores = {};

  for (const category of FRAUD_CATEGORIES) {
    const stats = model.stats[category];
    let score = stats.logPrior;

    for (const token of tokens) {
      score += stats.tokenLogProbs[token] ?? stats.defaultLogProb;
    }

    scores[category] = score;
  }

  return Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0];
}

function evaluate(model, examples) {
  let correct = 0;
  const confusion = new Map();

  for (const example of examples) {
    const predicted = predict(model, example.tokens);

    if (predicted === example.label) {
      correct += 1;
    }

    if (!confusion.has(example.label)) {
      confusion.set(example.label, new Map());
    }

    const row = confusion.get(example.label);
    row.set(predicted, (row.get(predicted) ?? 0) + 1);
  }

  return {
    total: examples.length,
    correct,
    accuracy: examples.length > 0 ? correct / examples.length : 0,
    confusion
  };
}

function printConfusion(confusion) {
  console.log('\nML confusion summary:');
  for (const [actual, predictedMap] of confusion.entries()) {
    const summary = [...predictedMap.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([predicted, count]) => `${predicted}: ${count}`)
      .join(', ');
    console.log(`- ${actual} -> ${summary}`);
  }
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT_PATH;

  if (!inputPath) {
    throw new Error('Pass the labeled JSON review file path.');
  }

  const absoluteInputPath = path.resolve(inputPath);
  const raw = await readFile(absoluteInputPath, 'utf8');
  const parsed = JSON.parse(raw);
  const examples = loadExamples(parsed);

  if (examples.length < 12) {
    throw new Error('Need at least 12 labeled fraud-category examples to train a usable model.');
  }

  const { train, test } = stratifiedSplit(examples);
  const model = trainModel(train);
  const trainMetrics = evaluate(model, train);
  const testMetrics = evaluate(model, test);

  const absoluteOutputPath = path.resolve(outputPath);
  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, JSON.stringify(model, null, 2) + '\n', 'utf8');

  console.log(`Training examples: ${train.length}`);
  console.log(`Holdout examples: ${test.length}`);
  console.log(`Train accuracy: ${(trainMetrics.accuracy * 100).toFixed(1)}% (${trainMetrics.correct}/${trainMetrics.total})`);
  console.log(`Holdout accuracy: ${(testMetrics.accuracy * 100).toFixed(1)}% (${testMetrics.correct}/${testMetrics.total})`);
  console.log(`Wrote model: ${absoluteOutputPath}`);

  printConfusion(testMetrics.confusion);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
