require('dotenv').config();
const express = require('express');
const path = require('path');
const indexRouter = require('./routes/index');
const apiRouter = require('./routes/api');
const parentRouter = require('./routes/parent');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PWA manifest - 使用正確的 MIME 類型（須在 static 之前）
app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/parent', parentRouter);

app.listen(PORT, () => {
  console.log(`聖經抄寫平靜網站已啟動: http://localhost:${PORT}`);
});
