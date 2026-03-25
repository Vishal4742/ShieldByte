/**
 * Export weak-label candidate examples from live fraud_articles for fast category review.
 *
 * Usage:
 *   node --env-file=.env scripts/export-phase1-weak-label-candidates.mjs
 *   node --env-file=.env scripts/export-phase1-weak-label-candidates.mjs 20
 *
 * Output:
 *   tmp/phase1-weak-label-candidates-<timestamp>.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const perCategoryLimit = Number.parseInt(process.argv[2] ?? '15', 10);
const FRAUD_CATEGORIES = [
  'UPI_fraud',
  'KYC_fraud',
  'lottery_fraud',
  'job_scam',
  'investment_fraud',
  'customer_support_scam'
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

if (!Number.isFinite(perCategoryLimit) || perCategoryLimit <= 0) {
  throw new Error('Per-category limit must be a positive integer.');
}

async function fetchCandidatesForCategory(category, limit) {
  const params = new URLSearchParams({
    select: [
      'id',
      'title',
      'body',
      'source',
      'published_at',
      'status',
      'category',
      'classification_confidence',
      'classification_method',
      'review_status',
      'relevance_score',
      'matched_keywords',
      'raw_extraction'
    ].join(','),
    status: 'eq.classified',
    category: `eq.${category}`,
    order: 'classification_confidence.desc,published_at.desc.nullslast',
    limit: String(limit * 4)
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/fraud_articles?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Supabase query failed for ${category}: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function scoreCandidate(article) {
  let score = 0;

  if (article.source?.toLowerCase().includes('reddit')) {
    score += 3;
  }

  if (article.review_status === 'auto_approved') {
    score += 2;
  }

  if (typeof article.classification_confidence === 'number') {
    score += article.classification_confidence;
  }

  if (typeof article.relevance_score === 'number') {
    score += article.relevance_score;
  }

  const body = String(article.body ?? '').toLowerCase();
  const title = String(article.title ?? '').toLowerCase();
  const text = `${title} ${body}`;

  const categoryBoosts = {
    UPI_fraud: ['collect request', 'qr code', 'upi', 'payment request', 'refund request'],
    KYC_fraud: ['kyc', 'account blocked', 'aadhaar', 'pan', 'verify account'],
    lottery_fraud: ['lucky draw', 'prize', 'won', 'winner', 'jackpot'],
    job_scam: ['job offer', 'work from home', 'telegram task', 'interview', 'joining fee'],
    investment_fraud: ['trading', 'crypto', 'guaranteed return', 'profit', 'copy trading'],
    customer_support_scam: ['helpline', 'customer care', 'anydesk', 'teamviewer', 'refund support']
  };

  for (const keyword of categoryBoosts[article.category] ?? []) {
    if (text.includes(keyword)) {
      score += 1.5;
    }
  }

  return Number(score.toFixed(2));
}

function toCandidateRecord(article) {
  const extraction = typeof article.raw_extraction === 'object' && article.raw_extraction !== null
    ? article.raw_extraction
    : {};

  return {
    article_id: article.id,
    suggested_category: article.category,
    weak_label_source: article.source?.toLowerCase().includes('reddit') ? 'reddit_like' : 'live_pipeline',
    confidence: article.classification_confidence ?? null,
    relevance_score: article.relevance_score ?? null,
    candidate_score: scoreCandidate(article),
    source: article.source ?? null,
    published_at: article.published_at ?? null,
    title: article.title ?? null,
    body: article.body ?? null,
    scenario_summary: extraction.scenario_summary ?? null,
    matched_keywords: Array.isArray(article.matched_keywords) ? article.matched_keywords : [],
    review: {
      approved: null,
      corrected_category: null,
      reviewer_notes: ''
    }
  };
}

async function main() {
  const byCategory = {};

  for (const category of FRAUD_CATEGORIES) {
    const articles = await fetchCandidatesForCategory(category, perCategoryLimit);
    const ranked = articles
      .map(toCandidateRecord)
      .sort((left, right) => right.candidate_score - left.candidate_score)
      .slice(0, perCategoryLimit);

    byCategory[category] = ranked;
  }

  const output = {
    exported_at: new Date().toISOString(),
    per_category_limit: perCategoryLimit,
    instructions: [
      'Review suggested_category for each candidate.',
      'Set review.approved to true if the weak label is acceptable.',
      'If wrong, set review.approved to false and fill review.corrected_category.',
      'Use approved rows to bootstrap category training data; do not treat them as gold evaluation labels.'
    ],
    categories: byCategory
  };

  const outputDir = path.resolve('tmp');
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `phase1-weak-label-candidates-${timestamp}.json`);
  await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  console.log(`Wrote weak-label candidate file: ${outputPath}`);
  for (const category of FRAUD_CATEGORIES) {
    console.log(`- ${category}: ${byCategory[category].length} candidates`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
