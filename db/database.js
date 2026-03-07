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

module.exports = db;
