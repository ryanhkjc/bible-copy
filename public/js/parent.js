(function () {
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
