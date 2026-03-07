const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getToday } = require('../lib/dateUtils');

function getDayOfYear(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  const oneDay = 86400000;
  return Math.floor(diff / oneDay);
}

const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_TEST_DATE_PICKER === 'true';

router.get('/', async (req, res) => {
  try {
    const today = getToday();
    const useDate = isDev && req.query.date ? req.query.date : today;
    const dayOfYear = getDayOfYear(useDate);
    const verse = db.prepare(
      'SELECT * FROM bible_verses WHERE day_of_year = ?'
    ).get(dayOfYear);

    if (!verse) {
      return res.status(500).render('index', {
        verse: null,
        today: useDate,
        record: null,
        showDatePicker: isDev,
        error: '今日經文載入失敗'
      });
    }

    const record = db.prepare(
      'SELECT * FROM daily_records WHERE record_date = ?'
    ).get(useDate);

    res.render('index', {
      verse,
      today: useDate,
      record: record || null,
      showDatePicker: isDev
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('index', {
      verse: null,
      today: getToday(),
      record: null,
      showDatePicker: isDev,
      error: '系統錯誤'
    });
  }
});

module.exports = router;
