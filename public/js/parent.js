(function () {
  const saveTimezoneBtn = document.getElementById('saveTimezoneBtn');
  const timezoneSelect = document.getElementById('timezoneSelect');
  const timezoneStatus = document.getElementById('timezoneStatus');
  if (saveTimezoneBtn && timezoneSelect) {
    saveTimezoneBtn.addEventListener('click', function () {
      const tz = timezoneSelect.value;
      saveTimezoneBtn.disabled = true;
      if (timezoneStatus) timezoneStatus.textContent = '儲存中...';
      fetch('/parent/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (timezoneStatus) timezoneStatus.textContent = '已儲存';
          setTimeout(function () {
            if (timezoneStatus) timezoneStatus.textContent = '';
          }, 2000);
        })
        .catch(function () {
          if (timezoneStatus) timezoneStatus.textContent = '儲存失敗';
        })
        .finally(function () { saveTimezoneBtn.disabled = false; });
    });
  }

  const canvas = document.getElementById('moodChart');
  if (!canvas || typeof moodData === 'undefined') return;

  new Chart(canvas, {
    type: 'doughnut',
    data: moodData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
})();
