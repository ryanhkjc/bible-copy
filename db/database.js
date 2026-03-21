const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'bible.db');
const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize schema on first load
function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  // Seed default timezone if not exists
  db.prepare(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('timezone', 'Asia/Hong_Kong')"
  ).run();
}

initSchema();

// 舊資料庫可能早於 ai_usage；確保表存在
function ensureAiUsageTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        record_date TEXT PRIMARY KEY,
        user_turns INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch (e) {
    console.error('ensureAiUsageTable:', e);
  }
}
ensureAiUsageTable();

function ensureAiUsageClosingSentColumn() {
  try {
    db.exec(`ALTER TABLE ai_usage ADD COLUMN closing_sent INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    if (!/duplicate column name/i.test(String(e && e.message))) {
      console.error('ensureAiUsageClosingSentColumn:', e);
    }
  }
}
ensureAiUsageClosingSentColumn();

module.exports = db;
