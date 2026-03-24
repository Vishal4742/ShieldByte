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

CREATE INDEX IF NOT EXISTS idx_fraud_articles_category_hint ON fraud_articles (category_hint);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_review_status ON fraud_articles (review_status);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_relevance_score ON fraud_articles (relevance_score);
