# 聖經抄寫平靜網站

為喜愛抄聖經的小朋友設計的 calming 網站，透過每日聖經句子、日誌記錄、心情追蹤與獎勵機制，幫助改善寫字練習與睡眠質素。

## 功能

- **兒童主頁**：每日一句約 20 字的聖經句子（平靜、安眠主題），可抄寫、記錄心情與日誌
- **PWA（漸進式網頁應用）**：可安裝至手機或電腦主畫面，離線時仍可瀏覽已快取的內容
- **心情與日誌持久化**：當日已儲存的記錄會自動顯示，隔日自動清空
- **心情必選**：儲存前須選擇今日心情
- **獎勵機制**：連續天數、成就徽章（連續 3/7/30 天、累積 50/100 句）
- **家長 Dashboard**：經文紀錄、日誌、心情統計、連續天數、時區設定（需密碼登入）
- **AI 小助手（Cloudflare Workers AI）**：兒童頁單一對話（信仰與日常已合併）；介面為頭像＋氣泡，當日對話經 `GET /api/ai/today` 還原，重新整理仍保留。API 金鑰僅存於伺服器 `.env`。每日限制小朋友「發話則數」（預設 25，可調），達上限後自動產生「今日小結」完場（鼓勵＋安心睡覺提示）。對話寫入 `data/ai_logs/YYYY-MM-DD.md`（Markdown）。家長可於「AI 對話紀錄」頁檢視檔案內容
- **時區設定**：家長可於 Dashboard 選擇與更新應用程式時區，影響「今日」日期計算
- **測試用日期選擇器**：非生產環境（`NODE_ENV !== production` 或 `ENABLE_TEST_DATE_PICKER=true`）下，兒童主頁顯示日期選擇器，可模擬不同日期測試經文、心情、日誌功能

## 技術

- Node.js + Express
- SQLite（better-sqlite3）
- EJS 模板
- PWA（Service Worker、Web App Manifest）
- 繁體中文介面與經文（和合本）

## 本地部署

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數

複製 `.env.example` 為 `.env` 並設定：

```bash
cp .env.example .env
```

編輯 `.env`，至少設定 `PARENT_PASSWORD`（家長密碼）。若要用 AI 小助手，請一併設定 Cloudflare 欄位（見下表）。

### 3. 匯入聖經經文（首次啟動）

```bash
node db/seed.js
```

### 4. 啟動伺服器

```bash
npm start
```

或

```bash
node server.js
```

或 (在 home Projects 資料夾中進行開發測試)

```bash
cd ~/Projects/bible-copy-calming && NODE_ENV=development node server.js
```

預設於 http://localhost:3000 啟動。

### 5. 使用方式

- **兒童**：直接開啟 http://localhost:3000 使用主頁，無需登入
- **家長**：前往 http://localhost:3000/parent/login 輸入密碼後查看 Dashboard；AI 紀錄在 http://localhost:3000/parent/ai-logs

## PWA 安裝與離線使用

本網站支援 PWA，可安裝至裝置主畫面，並在離線時使用已快取的內容。

### 安裝方式

| 裝置／瀏覽器 | 操作方式 |
|-------------|----------|
| **Android（Chrome / Edge）** | 開啟網站後，點選瀏覽器選單 →「安裝應用程式」或「加入主畫面」 |
| **iOS（Safari）** | 點選分享按鈕 →「加入主畫面」 |
| **桌面版（Chrome / Edge）** | 網址列右側會顯示安裝圖示，點選即可安裝 |

### 離線使用

- 首次連線時，Service Worker 會快取靜態資源（CSS、JS、圖示）與首頁
- 離線時會自動使用快取內容，可瀏覽主頁與已載入的經文
- 若需儲存心情或日誌，需恢復網路連線後再操作

### 更新快取

若部署新版本後快取未更新，可修改 `public/sw.js` 中的 `CACHE_NAME`（例如改為 `bible-copy-calming-v2`），使用者下次造訪時會自動取得新版本。

## 專案結構

```
bible-copy-calming/
├── server.js           # Express 主程式
├── lib/
│   └── dateUtils.js   # 時區與日期工具（getToday、getTimezone、setTimezone）
├── db/
│   ├── schema.sql      # 資料表定義（含 app_settings）
│   ├── seed.js         # 匯入 365 句聖經
│   └── database.js     # SQLite 連線
├── data/
│   ├── bible.db        # SQLite 資料庫（執行 seed 後產生）
│   ├── bible_verses.json
│   └── ai_logs/        # AI 對話 Markdown（執行時自動建立，已 .gitignore）
├── routes/
├── middleware/
├── public/
│   ├── manifest.json   # PWA 設定
│   ├── sw.js           # Service Worker
│   ├── icons/          # PWA 圖示
│   ├── css/
│   └── js/
└── views/
```

## 環境變數說明

| 變數 | 說明 | 預設 |
|------|------|------|
| `PARENT_PASSWORD` | 家長 Dashboard 密碼 | `parent123` |
| `SESSION_SECRET` | Session 加密金鑰 | `change-me-in-production` |
| `PORT` | 伺服器埠號 | `3000` |
| `ENABLE_TEST_DATE_PICKER` | 啟用測試用日期選擇器 | `false`（非 production 時自動啟用） |

### Cloudflare Workers AI（選填）

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers AI** → **Use REST API**。
2. 複製 **Account ID**，並建立 **Workers AI API Token**（需含 Workers AI 讀寫權限）。
3. 在 `.env` 填入：

| 變數 | 說明 |
|------|------|
| `CF_ACCOUNT_ID` | Cloudflare 帳戶 ID |
| `CF_API_TOKEN` | Workers AI 用 API Token（勿提交到 git） |
| `AI_MODEL` | 模型名稱，須與[官方模型列表](https://developers.cloudflare.com/workers-ai/models/)一致，預設 `@cf/meta/llama-3.2-3b-instruct` |
| `AI_MAX_TOKENS` | 單次回覆 token 上限（預設 512） |
| `AI_MAX_USER_TURNS_PER_DAY` | 每日「小朋友發話」則數上限（預設 25） |
| `AI_CONTEXT_MAX_CHARS` | 從 Markdown 日誌帶入模型之字元上限（預設 3500） |
| `AI_MAX_USER_MESSAGE_CHARS` | 單則使用者訊息字元上限（預設 2000） |

**用量與私隱：** Workers AI 免費額度以 [Neurons／日](https://developers.cloudflare.com/workers-ai/platform/pricing/) 計，超限需付費方案。對話紀錄僅存本機 `data/ai_logs/`，預設已列入 `.gitignore`；內容可能含兒童情緒描述，請妥善保管伺服器與備份。

## CHANGELOG

### 2026-03-21

- **AI 小助手改版**：合併信仰／日常為單一對話；`GET /api/ai/today` 還原當日對話；頭像＋氣泡 UI；不顯示剩餘次數；達每日上限後 `POST /api/ai/closing` 產生今日小結與晚安提示；`ai_usage.closing_sent`

### 2025-03-21

- **Workers AI 整合**：`POST /api/ai/chat`、`GET /api/ai/status`；`lib/cloudflareAi.js`、`lib/aiPrompts.js`、`lib/aiChatLog.js`；SQLite `ai_usage`；家長「AI 對話紀錄」頁；兒童頁雙模式聊天 UI 與每日則數限制

### 2025-03-08

- **PWA 支援**：新增漸進式網頁應用功能
  - Web App Manifest（`manifest.json`）：應用名稱、主題色、圖示、standalone 顯示模式
  - Service Worker（`sw.js`）：離線快取靜態資源與首頁，網路優先、離線回退策略
  - PWA 圖示（`public/icons/icon.svg`）：與 mascot 風格一致的 SVG 圖示
  - 全頁面加入 PWA meta 標籤（theme-color、apple-mobile-web-app-capable 等）與 Service Worker 註冊
  - manifest 以正確 MIME 類型（`application/manifest+json`）提供

### 2025-03-07

- **心情與日誌持久化**：當日已儲存的心情與日誌會自動顯示於兒童主頁，隔日自動清空
- **心情必選**：儲存按鈕在未選擇心情時停用，點擊儲存時驗證
- **家長 Dashboard 時區設定**：新增應用程式設定區塊，可選擇與儲存時區（Asia/Hong_Kong、Asia/Taipei、UTC 等），影響「今日」日期計算
- **測試用日期選擇器**：非生產環境下，兒童主頁顯示日期選擇器，可模擬不同日期測試經文、心情、日誌儲存
- **資料傳遞修正**：兒童主頁改以 `data-*` 屬性傳遞 `verseId`、`today`，避免 EJS 於 `<script>` 內造成 linter 錯誤
- **家長 Dashboard 模板修正**：時區選項加入 `typeof` 檢查與 fallback，避免 `timezoneOptions is not defined` 錯誤
- **資料庫**：新增 `app_settings` 表儲存時區設定

## 授權

MIT
