# 聖經抄寫平靜網站

為喜愛抄聖經的小朋友設計的 calming 網站，透過每日聖經句子、日誌記錄、心情追蹤與獎勵機制，幫助改善寫字練習與睡眠質素。

## 功能

- **兒童主頁**：每日一句約 20 字的聖經句子（平靜、安眠主題），可抄寫、記錄心情與日誌
- **獎勵機制**：連續天數、成就徽章（連續 3/7/30 天、累積 50/100 句）
- **家長 Dashboard**：經文紀錄、日誌、心情統計、連續天數（需密碼登入）

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
├── db/
│   ├── schema.sql      # 資料表定義
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

## 授權

MIT
