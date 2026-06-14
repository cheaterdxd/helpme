PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daily_reviews (
  id TEXT PRIMARY KEY,
  review_date TEXT NOT NULL UNIQUE,
  completed_count INTEGER NOT NULL DEFAULT 0,
  unfinished_count INTEGER NOT NULL DEFAULT 0,
  energy_value TEXT NOT NULL,
  summary TEXT NOT NULL,
  reflection TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_reviews_date ON daily_reviews(review_date);
