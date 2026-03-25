/**
 * Export a labeled review set for Phase 1 category accuracy evaluation.
 * Usage:
 *   node --env-file=.env scripts/export-phase1-eval-sample.mjs
 *   node --env-file=.env scripts/export-phase1-eval-sample.mjs 30
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sampleSize = Number.parseInt(process.argv[2] ?? '25', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

if (!Number.isFinite(sampleSize) || sampleSize <= 0) {
  throw new Error('Sample size must be a positive integer.');
}

async function fetchClassifiedArticles(limit) {
  const selects = [
    'id,title,body,source,published_at,status,category,classification_confidence,classification_method,review_status,relevance_score,matched_keywords,raw_extraction',
    'id,title,body,source,published_at,status,category,classification_confidence,raw_extraction'
  ];

  for (const select of selects) {
    const params = new URLSearchParams({
      select,
      or: '(status.eq.classified,status.eq.irrelevant)',
      order: 'published_at.desc.nullslast',
      limit: String(limit)
    });

    const response = await fetch(`${SUPABASE_URL}/rest/v1/fraud_articles?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (response.ok) {
      return response.json();
    }

    const errorText = await response.text();
    const isMissingColumn = response.status === 400 && errorText.includes('does not exist');

    if (!isMissingColumn) {
      throw new Error(`Supabase query failed (${response.status}): ${errorText}`);
    }
  }

  throw new Error('Supabase query failed because the live database is missing required columns.');
}

function toReviewRecord(article) {
  const extraction = typeof article.raw_extraction === 'object' && article.raw_extraction !== null
    ? article.raw_extraction
    : {};

  return {
    article_id: article.id,
    title: article.title,
    body: article.body ?? null,
    source: article.source,
    status: article.status ?? null,
    published_at: article.published_at,
    predicted_category: article.category ?? (article.status === 'irrelevant' ? 'not_fraud_relevant' : null),
    confidence: article.classification_confidence,
    classification_method: article.classification_method ?? null,
    review_status: article.review_status ?? null,
    relevance_score: article.relevance_score ?? null,
    matched_keywords: Array.isArray(article.matched_keywords) ? article.matched_keywords : [],
    scenario_summary: extraction.scenario_summary ?? null,
    clues: Array.isArray(extraction.clues) ? extraction.clues : [],
    review: {
      actual_category: null,
      is_prediction_correct: null,
      reviewer_notes: ''
    }
  };
}

async function main() {
  console.log(`Exporting ${sampleSize} classified articles for Phase 1 evaluation...`);
  const articles = await fetchClassifiedArticles(sampleSize);

  if (!Array.isArray(articles) || articles.length === 0) {
    console.log('No classified articles found. Run ingestion and classification first.');
    return;
  }

  const outputDir = path.resolve('tmp');
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `phase1-eval-sample-${timestamp}.json`);
  const payload = {
    exported_at: new Date().toISOString(),
    sample_size: articles.length,
    instructions: [
      'Fill review.actual_category with the true category for each article.',
      'Set review.is_prediction_correct to true or false after review.',
      'Optional: add reviewer_notes for disagreements or ambiguous cases.'
    ],
    records: articles.map(toReviewRecord)
  };

  await writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`Wrote review file: ${outputPath}`);
  console.log('Next step: label each record under review.actual_category, then run:');
  console.log(`  node scripts/evaluate-phase1-accuracy.mjs "${outputPath}"`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
