const fs = require('fs');
const path = require('path');

function getLogsDir() {
  return path.join(__dirname, '..', 'data', 'ai_logs');
}

function ensureLogsDir() {
  const dir = getLogsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function logFilePath(recordDate) {
  return path.join(getLogsDir(), `${recordDate}.md`);
}

function readFileSafe(p) {
  try {
    if (!fs.existsSync(p)) return '';
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

/**
 * 讀取「昨日」檔案最後一段（依字元數截斷）
 */
function readYesterdayTail(recordDate, maxChars) {
  const d = new Date(recordDate + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  const y = d.toISOString().slice(0, 10);
  const full = readFileSafe(logFilePath(y));
  if (!full) return '';
  if (full.length <= maxChars) return full.trim();
  return full.slice(-maxChars).trim();
}

/**
 * 讀取今日檔案尾端
 */
function readTodayTail(recordDate, maxChars) {
  const full = readFileSafe(logFilePath(recordDate));
  if (!full) return '';
  if (full.length <= maxChars) return full.trim();
  return full.slice(-maxChars).trim();
}

/**
 * 組合給模型的上下文（今日尾 + 昨日尾），總長不超過 maxTotalChars
 */
function buildContextForModel(recordDate, maxTotalChars) {
  const yBudget = Math.floor(maxTotalChars * 0.35);
  const tBudget = maxTotalChars - yBudget;
  const yesterday = readYesterdayTail(recordDate, yBudget);
  const today = readTodayTail(recordDate, tBudget);
  const parts = [];
  if (yesterday) parts.push('【昨日紀錄（節錄）】\n' + yesterday);
  if (today) parts.push('【今日紀錄（節錄）】\n' + today);
  const combined = parts.join('\n\n---\n\n');
  if (combined.length <= maxTotalChars) return combined;
  return combined.slice(-maxTotalChars).trim();
}

function formatBlock({ isoTime, mode, role, content }) {
  const safeContent = String(content || '').replace(/\r\n/g, '\n');
  return (
    `## ${isoTime} | ${mode} | ${role}\n\n` +
    safeContent +
    '\n\n'
  );
}

/**
 * 追加一輪 user + assistant 到當日 Markdown
 */
function appendExchange(recordDate, mode, userText, assistantText) {
  ensureLogsDir();
  const p = logFilePath(recordDate);
  const iso = new Date().toISOString();
  const header =
    fs.existsSync(p) && fs.statSync(p).size > 0
      ? ''
      : `---\ntitle: AI 對話紀錄\ndate: ${recordDate}\n---\n\n`;
  const chunk =
    header +
    formatBlock({ isoTime: iso, mode, role: 'user', content: userText }) +
    formatBlock({ isoTime: iso, mode, role: 'assistant', content: assistantText });
  fs.appendFileSync(p, chunk, 'utf8');
}

/**
 * 列出 ai_logs 目錄內 .md 檔名（不含路徑），新到舊
 */
function listLogFiles(limit = 60) {
  ensureLogsDir();
  const dir = getLogsDir();
  const names = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse();
  return names.slice(0, limit);
}

function readLogContent(recordDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) return null;
  const p = logFilePath(recordDate);
  const text = readFileSafe(p);
  return text || null;
}

/** 與 routes 產生「今日小結」時 append 的 user 句一致，供前端辨識 */
const CLOSING_USER_MARKER = '（今日傾偈時間已滿，以下係今日小結。）';

/**
 * 由當日 Markdown 解析 user/assistant 交替訊息（供刷新後還原對話）
 */
function parseMessagesFromLog(recordDate) {
  const raw = readLogContent(recordDate);
  if (!raw || !String(raw).trim()) return [];
  const withoutFm = String(raw).replace(/^---[\s\S]*?---\s*\n?/, '');
  const re = /^##\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(user|assistant)\s*$/gm;
  const hits = [];
  let m;
  while ((m = re.exec(withoutFm)) !== null) {
    hits.push({ index: m.index, headerLen: m[0].length, role: m[3] });
  }
  const messages = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i].headerLen;
    const end = i + 1 < hits.length ? hits[i + 1].index : withoutFm.length;
    const content = withoutFm.slice(start, end).trim();
    messages.push({ role: hits[i].role, content });
  }
  return messages;
}

module.exports = {
  ensureLogsDir,
  logFilePath,
  appendExchange,
  buildContextForModel,
  listLogFiles,
  readLogContent,
  parseMessagesFromLog,
  CLOSING_USER_MARKER
};
