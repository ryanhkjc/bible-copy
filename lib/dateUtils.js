/**
 * Date and timezone utilities for the application
 */
const db = require('../db/database');

const DEFAULT_TIMEZONE = 'Asia/Hong_Kong';

function getTimezone() {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('timezone');
    return row ? row.value : DEFAULT_TIMEZONE;
  } catch (_) {
    return DEFAULT_TIMEZONE;
  }
}

function setTimezone(tz) {
  db.prepare(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)'
  ).run('timezone', tz);
}

/**
 * Get today's date (YYYY-MM-DD) in the application's configured timezone
 */
function getToday() {
  const tz = getTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

module.exports = { getTimezone, setTimezone, getToday, DEFAULT_TIMEZONE };
