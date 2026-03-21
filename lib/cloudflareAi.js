/**
 * Cloudflare Workers AI REST（伺服器端專用，勿將 token 暴露給瀏覽器）
 * @see https://developers.cloudflare.com/workers-ai/get-started/rest-api/
 */

const DEFAULT_MODEL = '@cf/meta/llama-3.2-3b-instruct';

function getConfig() {
  const accountId = process.env.CF_ACCOUNT_ID || '';
  const apiToken = process.env.CF_API_TOKEN || '';
  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  const maxTokens = Math.min(
    2048,
    Math.max(64, parseInt(process.env.AI_MAX_TOKENS || '512', 10) || 512)
  );
  return { accountId, apiToken, model, maxTokens };
}

function isConfigured() {
  const { accountId, apiToken } = getConfig();
  return Boolean(accountId && apiToken);
}

/**
 * Cloudflare 官方 curl 路徑為 .../ai/run/@cf/meta/...（斜線為路徑分隔）。
 * 不可對整個 model 做 encodeURIComponent（會變成單一段 %40cf%2Fmeta%2F...），API 會回 400「No route for that URI」。
 */
function buildWorkersAiRunUrl(accountId, model) {
  const trimmed = String(model || '').trim();
  const segments = trimmed.split('/').filter(Boolean);
  const path = segments.map((s) => encodeURIComponent(s)).join('/');
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${path}`;
}

/**
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<{ text: string, raw?: unknown }>}
 */
async function runChat(messages) {
  const { accountId, apiToken, model, maxTokens } = getConfig();
  if (!accountId || !apiToken) {
    const err = new Error('Workers AI 未設定：請在 .env 設定 CF_ACCOUNT_ID 與 CF_API_TOKEN');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const url = buildWorkersAiRunUrl(accountId, model);

  const body = {
    messages,
    max_tokens: maxTokens
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const e0 = json.errors && json.errors[0];
    const msg =
      (e0 && e0.message) ||
      json.messages?.[0]?.message ||
      `Workers AI 請求失敗（HTTP ${res.status}）`;
    const err = new Error(msg);
    err.code = 'AI_REQUEST_FAILED';
    err.status = res.status;
    err.raw = json;
    throw err;
  }

  const result = json.result;
  let text = '';
  if (typeof result === 'string') {
    text = result;
  } else if (result && typeof result.response === 'string') {
    text = result.response;
  } else if (result && typeof result.text === 'string') {
    text = result.text;
  } else if (result && Array.isArray(result.response)) {
    text = result.response.map((p) => p?.text || '').join('');
  }

  if (!text || !String(text).trim()) {
    const err = new Error('模型回傳空白內容，請稍後再試或更換 AI_MODEL');
    err.code = 'AI_EMPTY_RESPONSE';
    err.raw = json;
    throw err;
  }

  return { text: String(text).trim(), raw: json };
}

module.exports = {
  getConfig,
  isConfigured,
  runChat,
  DEFAULT_MODEL,
  buildWorkersAiRunUrl
};
