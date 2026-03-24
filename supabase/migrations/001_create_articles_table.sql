-- ============================================================
-- ShieldByte — Phase 1: fraud_articles table
-- ============================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================

-- Use bigint identity for PK (Supabase best practice: avoids UUID index fragmentation)
CREATE TABLE IF NOT EXISTS fraud_articles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source        TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  url           TEXT UNIQUE NOT NULL,
  published_at  TIMESTAMPTZ,
  fetched_at    TIMESTAMPTZ DEFAULT NOW(),

  -- AI classification fields (populated by classify cron)
  category      TEXT CHECK (category IN (
                  'UPI_fraud',
                  'KYC_fraud',
                  'lottery_fraud',
                  'job_scam',
                  'investment_fraud',
                  'customer_support_scam'
                )),
  classification_confidence REAL,
  raw_extraction JSONB,

  -- Pipeline status
  status        TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'classified', 'failed'))
);

-- Indexes for fast lookups during classification, dedup, and category filtering
CREATE INDEX IF NOT EXISTS idx_fraud_articles_status ON fraud_articles (status);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_url ON fraud_articles (url);
CREATE INDEX IF NOT EXISTS idx_fraud_articles_category ON fraud_articles (category);

-- ── Row Level Security ──────────────────────────────────────
-- Enable RLS but allow the service_role (server-side) full access.
-- The anon key will have read-only access for the frontend later.

ALTER TABLE fraud_articles ENABLE ROW LEVEL SECURITY;

-- Allow the service_role (used by our cron endpoints) full access
CREATE POLICY "Service role has full access"
  ON fraud_articles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon users to read classified articles (for frontend display later)
CREATE POLICY "Public can read classified articles"
  ON fraud_articles
  FOR SELECT
  TO anon
  USING (status = 'classified');
