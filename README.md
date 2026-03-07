# 聖經抄寫平靜網站

為喜愛抄聖經的小朋友設計的 calming 網站，透過每日聖經句子、日誌記錄、心情追蹤與獎勵機制，幫助改善寫字練習與睡眠質素。

## 功能

- **兒童主頁**：每日一句約 20 字的聖經句子（平靜、安眠主題），可抄寫、記錄心情與日誌
- **心情與日誌持久化**：當日已儲存的記錄會自動顯示，隔日自動清空
- **心情必選**：儲存前須選擇今日心情
- **獎勵機制**：連續天數、成就徽章（連續 3/7/30 天、累積 50/100 句）
- **家長 Dashboard**：經文紀錄、日誌、心情統計、連續天數、時區設定（需密碼登入）
- **時區設定**：家長可於 Dashboard 選擇與更新應用程式時區，影響「今日」日期計算
- **測試用日期選擇器**：非生產環境（`NODE_ENV !== production` 或 `ENABLE_TEST_DATE_PICKER=true`）下，兒童主頁顯示日期選擇器，可模擬不同日期測試經文、心情、日誌功能

## 技術

- Node.js + Express
- SQLite（better-sqlite3）
- EJS 模板
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

編輯 `.env`，至少設定 `PARENT_PASSWORD`（家長密碼）。

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

預設於 http://localhost:3000 啟動。

### 5. 使用方式

- **兒童**：直接開啟 http://localhost:3000 使用主頁，無需登入
- **家長**：前往 http://localhost:3000/parent/login 輸入密碼後查看 Dashboard

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
│   └── bible_verses.json
├── routes/
├── middleware/
├── public/
└── views/
```

## 環境變數說明

| 變數 | 說明 | 預設 |
|------|------|------|
| `PARENT_PASSWORD` | 家長 Dashboard 密碼 | `parent123` |
| `SESSION_SECRET` | Session 加密金鑰 | `change-me-in-production` |
| `PORT` | 伺服器埠號 | `3000` |
| `ENABLE_TEST_DATE_PICKER` | 啟用測試用日期選擇器 | `false`（非 production 時自動啟用） |

## CHANGELOG

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
