const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getDayOfYear(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dayOfYear = getDayOfYear(today);
    const verse = db.prepare(
      'SELECT * FROM bible_verses WHERE day_of_year = ?'
    ).get(dayOfYear);

    if (!verse) {
      return res.status(500).render('index', {
        verse: null,
        today,
        error: '今日經文載入失敗'
      });
    }

    const record = db.prepare(
      'SELECT * FROM daily_records WHERE record_date = ?'
    ).get(today);

    res.render('index', {
      verse,
      today,
      record: record || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('index', {
      verse: null,
      today: new Date().toISOString().slice(0, 10),
      error: '系統錯誤'
    });
  }
});

module.exports = router;
