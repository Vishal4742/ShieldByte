-- Multiplayer Challenge Mode: head-to-head score comparison rooms
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  mission_id INTEGER NOT NULL,

  -- Challenger (Player A) data
  challenger_id TEXT NOT NULL,
  challenger_xp INTEGER NOT NULL DEFAULT 0,
  challenger_time INTEGER NOT NULL DEFAULT 60,
  challenger_wrong_taps INTEGER NOT NULL DEFAULT 0,
  challenger_clues_found INTEGER NOT NULL DEFAULT 0,
  challenger_clues_total INTEGER NOT NULL DEFAULT 0,
  challenger_outcome TEXT NOT NULL DEFAULT 'success',

  -- Opponent (Player B) data
  opponent_id TEXT,
  opponent_xp INTEGER,
  opponent_time INTEGER,
  opponent_wrong_taps INTEGER,
  opponent_clues_found INTEGER,
  opponent_clues_total INTEGER,
  opponent_outcome TEXT,

  -- Result
  winner TEXT,          -- 'challenger' | 'opponent' | 'draw'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_challenges_code ON challenges (code);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges (challenger_id);
