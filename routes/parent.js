const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { parseCookies, requireParentAuth } = require('../middleware/auth');
const { getToday, getTimezone, setTimezone } = require('../lib/dateUtils');

const PARENT_PASSWORD = process.env.PARENT_PASSWORD || 'parent123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const TIMEZONE_OPTIONS = [
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'UTC'
];
const sessions = new Map();
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now() });
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const s = sessions.get(token);
  if (!s) return false;
  if (Date.now() - s.createdAt > SESSION_MAX_AGE_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (password === PARENT_PASSWORD) {
    const token = createSession();
    res.cookie('parent_session', token, {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_MS,
      path: '/'
    });
    return res.redirect('/parent');
  }
  res.render('login', { error: '密碼錯誤' });
});

router.get('/', requireParentAuth(sessions), (req, res) => {
  try {
    const allRecords = db.prepare(`
      SELECT dr.*, bv.verse_text, bv.reference
      FROM daily_records dr
      JOIN bible_verses bv ON dr.verse_id = bv.id
      ORDER BY dr.record_date DESC
    `).all();
    const records = allRecords.slice(0, 100);

    const moodCounts = { '😊': 0, '🙂': 0, '😐': 0, '😔': 0, '😴': 0 };
    let streak = 0;
    const today = getToday();
    const dates = new Set(allRecords.map(r => r.record_date));

    allRecords.forEach(r => {
      if (moodCounts[r.mood] !== undefined) moodCounts[r.mood]++;
    });

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

    const last7 = records.filter(r => {
      const d = new Date(r.record_date);
      const now = new Date();
      return (now - d) / 86400000 <= 7;
    });
    const last30 = records.filter(r => {
      const d = new Date(r.record_date);
      const now = new Date();
      return (now - d) / 86400000 <= 30;
    });

    res.render('parent', {
      records,
      moodCounts,
      streak,
      totalCount: allRecords.length,
      last7,
      last30,
      timezone: getTimezone(),
      timezoneOptions: TIMEZONE_OPTIONS
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('系統錯誤');
  }
});

router.get('/settings', requireParentAuth(sessions), (req, res) => {
  res.json({ timezone: getTimezone() });
});

router.put('/settings', requireParentAuth(sessions), express.json(), (req, res) => {
  const { timezone } = req.body || {};
  if (timezone && typeof timezone === 'string') {
    setTimezone(timezone);
    return res.json({ success: true, timezone });
  }
  res.status(400).json({ error: 'Invalid timezone' });
});

router.get('/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies?.parent_session;
  if (token) sessions.delete(token);
  res.clearCookie('parent_session', { path: '/' });
  res.redirect('/parent/login');
});

module.exports = router;
