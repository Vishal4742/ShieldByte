-- ShieldByte Phase 1 finalization bundle
-- Run this file once in Supabase SQL Editor to bring the live database
-- up to the current Phase 1 schema expected by the repo.

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS category_hint TEXT CHECK (category_hint IN (
	'UPI_fraud',
	'KYC_fraud',
	'lottery_fraud',
	'job_scam',
	'investment_fraud',
	'customer_support_scam'
));

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS relevance_score REAL CHECK (relevance_score >= 0 AND relevance_score <= 1);

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS matched_keywords JSONB DEFAULT '[]'::jsonb;

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS ingestion_source_type TEXT CHECK (ingestion_source_type IN ('newsapi', 'rss', 'scraped'));

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS classification_method TEXT CHECK (classification_method IN ('ai', 'heuristic'));

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS classification_model TEXT;

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending' CHECK (
	review_status IN ('pending', 'auto_approved', 'needs_review', 'reviewed')
);

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0);

ALTER TABLE fraud_articles
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fraud_articles_category_hint ON fraud_articles (category_hint);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_review_status ON fraud_articles (review_status);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_relevance_score ON fraud_articles (relevance_score);

CREATE TABLE IF NOT EXISTS ingestion_runs (
	id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	source_newsapi INTEGER NOT NULL DEFAULT 0,
	source_rss INTEGER NOT NULL DEFAULT 0,
	source_scraped INTEGER NOT NULL DEFAULT 0,
	total_fetched INTEGER NOT NULL DEFAULT 0,
	duplicates INTEGER NOT NULL DEFAULT 0,
	inserted INTEGER NOT NULL DEFAULT 0,
	errors INTEGER NOT NULL DEFAULT 0,
	target_met BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS classification_runs (
	id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	total_considered INTEGER NOT NULL DEFAULT 0,
	classified INTEGER NOT NULL DEFAULT 0,
	retried INTEGER NOT NULL DEFAULT 0,
	failed INTEGER NOT NULL DEFAULT 0,
	auto_approved INTEGER NOT NULL DEFAULT 0,
	needs_review INTEGER NOT NULL DEFAULT 0,
	used_ai INTEGER NOT NULL DEFAULT 0,
	used_heuristic INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_ran_at ON ingestion_runs (ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_classification_runs_ran_at ON classification_runs (ran_at DESC);
