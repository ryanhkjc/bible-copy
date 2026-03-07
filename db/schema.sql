-- Bible Copy Calming - Database Schema
-- SQLite

CREATE TABLE IF NOT EXISTS bible_verses (
  id INTEGER PRIMARY KEY,
  day_of_year INTEGER NOT NULL UNIQUE,
  verse_text TEXT NOT NULL,
  reference TEXT NOT NULL,
  theme TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date TEXT NOT NULL UNIQUE,
  verse_id INTEGER NOT NULL,
  mood TEXT,
  journal TEXT,
  copied INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (verse_id) REFERENCES bible_verses(id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_type TEXT DEFAULT 'child',
  achievement_type TEXT NOT NULL,
  achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
CREATE INDEX IF NOT EXISTS idx_daily_records_verse ON daily_records(verse_id);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('timezone', 'Asia/Hong_Kong');
