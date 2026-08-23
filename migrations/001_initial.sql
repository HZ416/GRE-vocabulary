PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  lemma TEXT NOT NULL UNIQUE,
  part_of_speech TEXT,
  ipa TEXT,
  definition_en TEXT,
  definition_zh TEXT,
  example_sentence TEXT,
  mnemonic TEXT,
  roots TEXT,
  difficulty INTEGER NOT NULL DEFAULT 0,
  frequency_tier TEXT NOT NULL DEFAULT 'core',
  priority_score REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS word_sources (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_group TEXT,
  source_rank INTEGER,
  is_high_priority INTEGER NOT NULL DEFAULT 0 CHECK (is_high_priority IN (0, 1)),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  UNIQUE (word_id, source_name)
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS word_tags (
  word_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (word_id, tag_id),
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_word_state (
  word_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'review', 'mastered', 'suspended')),
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  is_difficult INTEGER NOT NULL DEFAULT 0 CHECK (is_difficult IN (0, 1)),
  total_reviews INTEGER NOT NULL DEFAULT 0,
  correct_reviews INTEGER NOT NULL DEFAULT 0,
  incorrect_reviews INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  fsrs_state INTEGER,
  fsrs_step INTEGER,
  fsrs_stability REAL,
  fsrs_difficulty REAL,
  fsrs_due TEXT,
  fsrs_last_review TEXT,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  response_ms INTEGER,
  mode TEXT NOT NULL DEFAULT 'flashcard',
  previous_due TEXT,
  next_due TEXT,
  previous_stability REAL,
  new_stability REAL,
  previous_difficulty REAL,
  new_difficulty REAL,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_words_priority ON words(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_word_sources_word_id ON word_sources(word_id);
CREATE INDEX IF NOT EXISTS idx_user_word_state_due ON user_word_state(next_review_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_word_date ON review_logs(word_id, reviewed_at DESC);

