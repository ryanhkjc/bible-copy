(function () {
  const verseId = document.body.dataset.verseId ? parseInt(document.body.dataset.verseId, 10) : null;
  const today = document.body.dataset.today || '';
  if (!verseId || !today) return;

  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const journal = document.getElementById('journal');
  const moodBtns = document.querySelectorAll('.mood-btn');
  const achievementsEl = document.getElementById('achievements');
  const streakValue = document.getElementById('streakValue');

  let selectedMood = null;

  function updateSaveButton() {
    saveBtn.disabled = !selectedMood;
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
