ALTER TABLE fraud_articles
DROP CONSTRAINT IF EXISTS fraud_articles_status_check;

ALTER TABLE fraud_articles
ADD CONSTRAINT fraud_articles_status_check
CHECK (status IN ('raw', 'classified', 'irrelevant', 'failed'));

ALTER TABLE classification_runs
ADD COLUMN IF NOT EXISTS irrelevant INTEGER NOT NULL DEFAULT 0;
