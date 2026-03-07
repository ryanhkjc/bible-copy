const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get day of year (1-365) from date string YYYY-MM-DD
function getDayOfYear(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

// GET /api/verse/today - Get today's verse
router.get('/verse/today', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dayOfYear = getDayOfYear(today);
    const verse = db.prepare(
      'SELECT * FROM bible_verses WHERE day_of_year = ?'
    ).get(dayOfYear);
    if (!verse) {
      return res.status(404).json({ error: 'Verse not found' });
    }
    res.json(verse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/verse/:date - Get verse for specific date (YYYY-MM-DD)
router.get('/verse/:date', (req, res) => {
  try {
    const dayOfYear = getDayOfYear(req.params.date);
    const verse = db.prepare(
      'SELECT * FROM bible_verses WHERE day_of_year = ?'
    ).get(dayOfYear);
    if (!verse) {
      return res.status(404).json({ error: 'Verse not found' });
    }
    res.json(verse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check and award achievements
function checkAndAwardAchievements(db, date) {
  const records = db.prepare(
    'SELECT record_date FROM daily_records ORDER BY record_date ASC'
  ).all();
  const dates = new Set(records.map(r => r.record_date));
  const totalCount = records.length;

  // Calculate streak
  let streak = 0;
  let d = new Date(date);
  let checkDate = d.toISOString().slice(0, 10);
  while (dates.has(checkDate)) {
    streak++;
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().slice(0, 10);
  }

  const toAward = [];
  if (streak >= 3) toAward.push('streak_3');
  if (streak >= 7) toAward.push('streak_7');
  if (streak >= 30) toAward.push('streak_30');
  if (totalCount >= 50) toAward.push('total_50');
  if (totalCount >= 100) toAward.push('total_100');

  const existing = new Set(
    db.prepare('SELECT achievement_type FROM rewards WHERE user_type = ?')
      .all('child')
      .map(r => r.achievement_type)
  );

  const insertReward = db.prepare(
    'INSERT INTO rewards (user_type, achievement_type) VALUES (?, ?)'
  );
  for (const a of toAward) {
    if (!existing.has(a)) {
      insertReward.run('child', a);
      existing.add(a);
    }
  }
}

// POST /api/record - Save daily record
router.post('/record', (req, res) => {
  try {
    const { record_date, verse_id, mood, journal, copied } = req.body;
    const date = record_date || new Date().toISOString().slice(0, 10);

    const verse = db.prepare('SELECT id FROM bible_verses WHERE id = ?').get(verse_id);
    if (!verse) {
      return res.status(400).json({ error: 'Invalid verse_id' });
    }

    db.prepare(`
      INSERT OR REPLACE INTO daily_records (record_date, verse_id, mood, journal, copied, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(date, verse_id, mood || null, journal || null, copied !== false ? 1 : 0);

    checkAndAwardAchievements(db, date);

    res.json({ success: true, record_date: date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/record/:date - Get record for specific date
router.get('/record/:date', (req, res) => {
  try {
    const record = db.prepare(`
      SELECT dr.*, bv.verse_text, bv.reference
      FROM daily_records dr
      JOIN bible_verses bv ON dr.verse_id = bv.id
      WHERE dr.record_date = ?
    `).get(req.params.date);
    res.json(record || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stats - Get streak and rewards for child page
router.get('/stats', (req, res) => {
  try {
    const records = db.prepare(
      'SELECT record_date FROM daily_records ORDER BY record_date DESC'
    ).all();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const dates = new Set(records.map(r => r.record_date));

    if (dates.has(today)) {
      streak = 1;
      let d = new Date(today);
      d.setDate(d.getDate() - 1);
      let prev = d.toISOString().slice(0, 10);
      while (dates.has(prev)) {
        streak++;
        d.setDate(d.getDate() - 1);
        prev = d.toISOString().slice(0, 10);
      }
    } else {
      let d = new Date(today);
      d.setDate(d.getDate() - 1);
      let prev = d.toISOString().slice(0, 10);
      while (dates.has(prev)) {
        streak++;
        d.setDate(d.getDate() - 1);
        prev = d.toISOString().slice(0, 10);
      }
    }

    const totalCount = records.length;
    const rewards = db.prepare(
      'SELECT achievement_type, achieved_at FROM rewards WHERE user_type = ? ORDER BY achieved_at DESC'
    ).all('child');

    const achievements = new Set(rewards.map(r => r.achievement_type));

    res.json({
      streak,
      totalCount,
      achievements: Array.from(achievements),
      hasRecordToday: dates.has(today)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
