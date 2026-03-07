#!/usr/bin/env node
/**
 * Seed script: Import 365 Bible verses from JSON into SQLite
 * Run: node db/seed.js
 */

const db = require('./database');
const path = require('path');
const fs = require('fs');

const versesPath = path.join(__dirname, '..', 'data', 'bible_verses.json');

if (!fs.existsSync(versesPath)) {
  console.error('Error: data/bible_verses.json not found');
  process.exit(1);
}

const verses = JSON.parse(fs.readFileSync(versesPath, 'utf8'));

if (verses.length !== 365) {
  console.warn(`Warning: Expected 365 verses, found ${verses.length}`);
}

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO bible_verses (id, day_of_year, verse_text, reference, theme)
  VALUES (?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items) => {
  for (let i = 0; i < items.length; i++) {
    const v = items[i];
    insertStmt.run(v.day_of_year, v.day_of_year, v.verse_text, v.reference, v.theme);
  }
});

insertMany(verses);
console.log(`Seeded ${verses.length} Bible verses successfully.`);
