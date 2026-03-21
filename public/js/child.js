(function () {
  const showDatePicker = document.body.dataset.showDatePicker === 'true';
  if (showDatePicker) {
    const testDateApply = document.getElementById('testDateApply');
    const testDate = document.getElementById('testDate');
    if (testDateApply && testDate) {
      testDateApply.addEventListener('click', function () {
        const d = testDate.value;
        if (d) window.location.href = '/?date=' + d;
      });
    }
    const testResetAiBtn = document.getElementById('testResetAiBtn');
    if (testResetAiBtn) {
      testResetAiBtn.addEventListener('click', function () {
        var pageDate = document.body.dataset.today || '';
        if (!pageDate) return;
        if (
          !window.confirm(
            '確定重設「' + pageDate + '」的 AI 對話限額與當日對話紀錄？\n（只影響測試用，無法還原）'
          )
        ) {
          return;
        }
        testResetAiBtn.disabled = true;
        fetch('/api/dev/reset-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: pageDate })
        })
          .then(function (r) {
            return r.json().then(function (data) {
              return { ok: r.ok, data: data };
            });
          })
          .then(function (res) {
            if (res.ok && res.data.success) {
              window.location.reload();
            } else {
              window.alert((res.data && res.data.message) || '重設失敗');
              testResetAiBtn.disabled = false;
            }
          })
          .catch(function () {
            window.alert('網絡錯誤');
            testResetAiBtn.disabled = false;
          });
      });
    }
  }

  const verseId = document.body.dataset.verseId ? parseInt(document.body.dataset.verseId, 10) : null;
  const today = document.body.dataset.today || '';
  const selectedMoodAttr = document.body.dataset.selectedMood || '';

  initAiChatIfPresent();

  if (!verseId || !today) return;

  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const journal = document.getElementById('journal');
  const moodBtns = document.querySelectorAll('.mood-btn');
  const achievementsEl = document.getElementById('achievements');
  const streakValue = document.getElementById('streakValue');

  let selectedMood = selectedMoodAttr || null;

  function updateSaveButton() {
    saveBtn.disabled = !selectedMood;
  }

  // Pre-select mood from saved record
  if (selectedMoodAttr) {
    moodBtns.forEach(function (btn) {
      if (btn.dataset.mood === selectedMoodAttr) btn.classList.add('selected');
    });
  }

  moodBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      moodBtns.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
      saveStatus.textContent = '';
      updateSaveButton();
    });
  });

  updateSaveButton();

  function loadStats() {
    fetch('/api/stats')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        streakValue.textContent = data.streak;
        const achieved = new Set(data.achievements || []);
        document.querySelectorAll('.badge').forEach(function (el) {
          el.classList.toggle('unlocked', achieved.has(el.dataset.achievement));
        });
      })
      .catch(function () { streakValue.textContent = '0'; });
  }

  loadStats();

  saveBtn.addEventListener('click', function () {
    if (!selectedMood) {
      saveStatus.textContent = '請先選擇今日心情';
      saveStatus.className = 'save-status error';
      return;
    }
    saveBtn.disabled = true;
    saveStatus.textContent = '儲存中...';
    saveStatus.className = 'save-status';

    fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_date: today,
        verse_id: verseId,
        mood: selectedMood,
        journal: journal.value.trim() || null,
        copied: true
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        saveStatus.textContent = '已儲存！';
        saveStatus.className = 'save-status success';
        loadStats();
      })
      .catch(function () {
        saveStatus.textContent = '儲存失敗，請再試一次';
        saveStatus.className = 'save-status error';
      })
      .finally(function () {
        saveBtn.disabled = false;
      });
  });
})();

var AI_CLOSING_USER_MARKER = '（今日傾偈時間已滿，以下係今日小結。）';

function initAiChatIfPresent() {
  var root = document.getElementById('aiChatRoot');
  if (!root) return;

  var messagesEl = document.getElementById('aiMessages');
  var inputEl = document.getElementById('aiInput');
  var sendBtn = document.getElementById('aiSendBtn');
  var statusEl = document.getElementById('aiChatStatus');

  var history = [];
  var configured = false;
  var canSend = false;
  var needClosing = false;
  var closingAttempted = false;

  function setStatus(text, cls) {
    statusEl.textContent = text || '';
    statusEl.className = 'ai-chat-status' + (cls ? ' ' + cls : '');
  }

  function scrollThread() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendChatRow(role, text, options) {
    var closing = options && options.closing;
    var row = document.createElement('div');
    row.className =
      'ai-chat-row ' +
      (role === 'user' ? 'ai-chat-row--user' : 'ai-chat-row--assistant') +
      (closing ? ' ai-chat-row--closing' : '');

    var av = document.createElement('div');
    av.className = 'ai-chat-avatar';
    av.setAttribute('aria-hidden', 'true');
    if (role === 'user') {
      av.textContent = '🧒';
      av.title = '我';
    } else {
      av.textContent = '😇';
      av.title = '天使小助手';
    }

    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble';
    bubble.textContent = text;

    row.appendChild(av);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollThread();
  }

  function renderMessages(messages) {
    messagesEl.innerHTML = '';
    var list = Array.isArray(messages) ? messages : [];
    for (var i = 0; i < list.length; i++) {
      var msg = list[i];
      if (!msg || (msg.role !== 'user' && msg.role !== 'assistant')) continue;
      var isClosingAssistant =
        msg.role === 'assistant' &&
        i > 0 &&
        list[i - 1].role === 'user' &&
        String(list[i - 1].content || '').trim() === AI_CLOSING_USER_MARKER;
      appendChatRow(msg.role, msg.content, { closing: isClosingAssistant });
    }
    scrollThread();
  }

  function applyTodayPayload(data) {
    configured = !!data.configured;
    canSend = !!data.canSend;
    needClosing = !!data.needClosing;
    history = Array.isArray(data.messages) ? data.messages.slice() : [];
    renderMessages(history);

    if (!configured) {
      setStatus('家長未設定 AI，請見 README（Cloudflare）。');
      sendBtn.disabled = true;
      return;
    }

    sendBtn.disabled = !canSend;
    setStatus('');

    if (needClosing && !closingAttempted) {
      closingAttempted = true;
      fetchClosing();
    }
  }

  function loadToday() {
    fetch('/api/ai/today')
      .then(function (r) {
        return r.json();
      })
      .then(applyTodayPayload)
      .catch(function () {
        setStatus('無法載入對話。', 'error');
        sendBtn.disabled = true;
      });
  }

  function fetchClosing() {
    setStatus('整理今日小結…');
    sendBtn.disabled = true;
    fetch('/api/ai/closing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.ok || !res.data || !res.data.reply) {
          setStatus((res.data && res.data.message) || '小結載入失敗。', 'error');
        } else {
          setStatus('');
        }
      })
      .catch(function () {
        setStatus('網絡錯誤，小結稍後再試。', 'error');
      })
      .finally(function () {
        loadToday();
      });
  }

  sendBtn.addEventListener('click', function () {
    var text = (inputEl.value || '').trim();
    if (!text) {
      setStatus('請先打你想講嘅說話。', 'error');
      return;
    }
    if (!configured || !canSend) return;

    setStatus('諗緊…');
    sendBtn.disabled = true;
    history.push({ role: 'user', content: text });
    renderMessages(history);
    inputEl.value = '';

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history
      })
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      })
      .then(function (res) {
        var data = res.data;
        if (res.ok && data.reply) {
          history.push({ role: 'assistant', content: data.reply });
          renderMessages(history);
          setStatus('');
          canSend = !data.atLimit;
          if (data.needClosing) {
            closingAttempted = true;
            fetchClosing();
          } else {
            sendBtn.disabled = !canSend;
          }
        } else if (res.status === 429) {
          history.pop();
          renderMessages(history);
          if (data && data.needClosing) {
            fetchClosing();
          } else {
            setStatus((data && data.message) || '今日傾偈已滿。', 'error');
            canSend = false;
            sendBtn.disabled = true;
          }
        } else {
          history.pop();
          renderMessages(history);
          setStatus((data && data.message) || '傳送失敗，請再試。', 'error');
          sendBtn.disabled = !canSend;
        }
      })
      .catch(function () {
        history.pop();
        renderMessages(history);
        setStatus('網絡錯誤，請再試。', 'error');
        sendBtn.disabled = !canSend;
      });

  });

  loadToday();
}
