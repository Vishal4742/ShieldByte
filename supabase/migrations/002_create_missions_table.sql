-- ============================================================
-- ShieldByte — Phase 2: missions table
-- ============================================================
-- Run this SQL in Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

CREATE TABLE IF NOT EXISTS missions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id      BIGINT REFERENCES fraud_articles(id) ON DELETE SET NULL,
  fraud_type      TEXT NOT NULL,
  simulation_type TEXT NOT NULL CHECK (simulation_type IN (
                    'SMS', 'WhatsApp_message', 'email', 'call_transcript'
                  )),
  sender          TEXT NOT NULL,
  message_body    TEXT NOT NULL,
  clues_json      JSONB NOT NULL,
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tip             TEXT NOT NULL,
  variant         INT DEFAULT 1 CHECK (variant BETWEEN 1 AND 3),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_missions_fraud_type ON missions (fraud_type);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions (status);
CREATE INDEX IF NOT EXISTS idx_missions_article_id ON missions (article_id);
CREATE INDEX IF NOT EXISTS idx_missions_difficulty ON missions (difficulty);

-- RLS policies (same pattern as fraud_articles)
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to missions"
  ON missions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read active missions"
  ON missions
  FOR SELECT
  TO anon
  USING (status = 'active');
