CREATE TABLE app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  new_words_per_day INTEGER NOT NULL DEFAULT 20 CHECK (new_words_per_day BETWEEN 0 AND 200),
  max_reviews_per_day INTEGER NOT NULL DEFAULT 200 CHECK (max_reviews_per_day BETWEEN 1 AND 1000),
  show_english INTEGER NOT NULL DEFAULT 1 CHECK (show_english IN (0, 1)),
  show_chinese INTEGER NOT NULL DEFAULT 1 CHECK (show_chinese IN (0, 1)),
  show_ipa INTEGER NOT NULL DEFAULT 1 CHECK (show_ipa IN (0, 1)),
  show_examples INTEGER NOT NULL DEFAULT 1 CHECK (show_examples IN (0, 1)),
  updated_at TEXT NOT NULL
);

INSERT INTO app_settings (id, updated_at) VALUES (1, CURRENT_TIMESTAMP);

