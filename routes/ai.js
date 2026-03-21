const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getToday } = require('../lib/dateUtils');
const { runChat, isConfigured } = require('../lib/cloudflareAi');
const {
  getUnifiedSystemPrompt,
  getClosingSystemPrompt,
  mergeContextIntoSystemPrompt
} = require('../lib/aiPrompts');
const {
  buildContextForModel,
  appendExchange,
  parseMessagesFromLog,
  readLogContent,
  CLOSING_USER_MARKER
} = require('../lib/aiChatLog');

function getMaxTurns() {
  const n = parseInt(process.env.AI_MAX_USER_TURNS_PER_DAY || '25', 10);
  return Math.min(100, Math.max(1, n || 25));
}

function getMaxContextChars() {
  const n = parseInt(process.env.AI_CONTEXT_MAX_CHARS || '3500', 10);
  return Math.min(12000, Math.max(500, n || 3500));
}

function getMaxUserMsgChars() {
  const n = parseInt(process.env.AI_MAX_USER_MESSAGE_CHARS || '2000', 10);
  return Math.min(8000, Math.max(100, n || 2000));
}

function getUsageRow(recordDate) {
  return db.prepare('SELECT user_turns, closing_sent FROM ai_usage WHERE record_date = ?').get(recordDate);
}

function getUsage(recordDate) {
  const row = getUsageRow(recordDate);
  return row ? row.user_turns : 0;
}

function getClosingSent(recordDate) {
  const row = getUsageRow(recordDate);
  return row ? !!row.closing_sent : false;
}

function incrementUsage(recordDate) {
  db.prepare(`
    INSERT INTO ai_usage (record_date, user_turns, closing_sent) VALUES (?, 1, 0)
    ON CONFLICT(record_date) DO UPDATE SET user_turns = user_turns + 1
  `).run(recordDate);
}

function markClosingSent(recordDate) {
  db.prepare(`
    INSERT INTO ai_usage (record_date, user_turns, closing_sent) VALUES (?, 0, 1)
    ON CONFLICT(record_date) DO UPDATE SET closing_sent = 1
  `).run(recordDate);
}

function extractClosingReplyFromMessages(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (let i = 0; i < list.length - 1; i++) {
    if (
      list[i].role === 'user' &&
      String(list[i].content || '').trim() === CLOSING_USER_MARKER &&
      list[i + 1].role === 'assistant'
    ) {
      return String(list[i + 1].content || '').trim();
    }
  }
  return null;
}

router.get('/ai/status', (req, res) => {
  try {
    const today = getToday();
    const maxTurns = getMaxTurns();
    const used = getUsage(today);
    const closingSent = getClosingSent(today);
    res.json({
      configured: isConfigured(),
      recordDate: today,
      maxUserTurnsPerDay: maxTurns,
      usedUserTurns: used,
      closingSent,
      atLimit: used >= maxTurns
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.get('/ai/today', (req, res) => {
  try {
    const today = getToday();
    const maxTurns = getMaxTurns();
    const used = getUsage(today);
    const closingSent = getClosingSent(today);
    const configured = isConfigured();
    const messages = parseMessagesFromLog(today);
    const atLimit = used >= maxTurns;
    const canSend = configured && used < maxTurns;
    const needClosing = configured && atLimit && !closingSent && used > 0;

    res.json({
      configured,
      recordDate: today,
      messages,
      canSend,
      atLimit,
      closingSent,
      needClosing
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server' });
  }
});

router.post('/ai/closing', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    const today = getToday();
    const maxTurns = getMaxTurns();
    const used = getUsage(today);

    if (!isConfigured()) {
      return res.status(503).json({
        error: 'not_configured',
        message: '家長未設定 AI（Cloudflare）。'
      });
    }

    if (used < maxTurns) {
      return res.status(400).json({ error: 'not_at_limit', message: '尚未達到今日傾偈上限。' });
    }

    const parsed = parseMessagesFromLog(today);
    const extracted = extractClosingReplyFromMessages(parsed);
    if (extracted) {
      markClosingSent(today);
      return res.json({ reply: extracted, closing: true, cached: true });
    }

    if (getClosingSent(today)) {
      return res.json({
        reply: '今日小結已經記低啦，聽日再傾啦。',
        closing: true,
        cached: true
      });
    }

    const transcript = readLogContent(today) || '';
    if (!transcript.trim()) {
      return res.status(400).json({ error: 'empty', message: '沒有紀錄可總結。' });
    }

    const slice = transcript.length > 12000 ? transcript.slice(-12000) : transcript;
    const system = getClosingSystemPrompt();
    const apiMessages = [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `以下係今日對話紀錄（Markdown 節錄）：\n\n${slice}`
      }
    ];

    const { text } = await runChat(apiMessages);
    appendExchange(today, 'chat', CLOSING_USER_MARKER, text);
    markClosingSent(today);

    res.json({ reply: text, closing: true, cached: false });
  } catch (err) {
    console.error(err);
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'not_configured', message: err.message });
    }
    res.status(500).json({ error: 'server', message: err.message || '伺服器錯誤' });
  }
});

router.post('/ai/chat', express.json({ limit: '256kb' }), async (req, res) => {
  try {
    const today = getToday();
    const maxTurns = getMaxTurns();
    const used = getUsage(today);
    if (used >= maxTurns) {
      return res.status(429).json({
        error: 'limit_reached',
        message: '今日傾偈次數已用完。',
        needClosing: !getClosingSent(today)
      });
    }

    if (!isConfigured()) {
      return res.status(503).json({
        error: 'not_configured',
        message: '家長未設定 AI（Cloudflare）。請見 README 設定 CF_ACCOUNT_ID、CF_API_TOKEN。'
      });
    }

    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'bad_request', message: '請提供 messages 陣列' });
    }

    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') {
      return res.status(400).json({ error: 'bad_request', message: '最後一則須為使用者訊息' });
    }

    const maxU = getMaxUserMsgChars();
    if (String(last.content || '').length > maxU) {
      return res.status(400).json({
        error: 'too_long',
        message: `單則訊息請唔好超過 ${maxU} 字`
      });
    }

    const clean = [];
    for (const msg of messages.slice(-24)) {
      if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) continue;
      const c = String(msg.content || '').slice(0, maxU);
      clean.push({ role: msg.role, content: c });
    }
    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'bad_request', message: '對話格式錯誤' });
    }

    const ctx = buildContextForModel(today, getMaxContextChars());
    const systemContent = mergeContextIntoSystemPrompt(getUnifiedSystemPrompt(), ctx);

    const apiMessages = [{ role: 'system', content: systemContent }];
    for (const x of clean) {
      apiMessages.push({ role: x.role, content: x.content });
    }

    const { text } = await runChat(apiMessages);

    const userText = clean[clean.length - 1].content;
    appendExchange(today, 'chat', userText, text);
    incrementUsage(today);
    const newUsed = used + 1;

    const atLimit = newUsed >= maxTurns;
    const needClosing = atLimit && !getClosingSent(today);

    res.json({
      reply: text,
      atLimit,
      needClosing
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'AI_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'not_configured',
        message: err.message
      });
    }
    res.status(500).json({
      error: 'server',
      message: err.message || '伺服器錯誤'
    });
  }
});

module.exports = router;
