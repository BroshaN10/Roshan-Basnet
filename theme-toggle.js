(function () {
  var button = document.querySelector('.theme-toggle');
  if (!button) return;
  function update() {
    var isDay = document.documentElement.dataset.theme === 'day';
    button.setAttribute('aria-pressed', String(isDay));
    button.setAttribute('aria-label', isDay ? 'Switch to dark mode' : 'Switch to light mode');
    button.title = isDay ? 'Switch to dark mode' : 'Switch to light mode';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDay ? '#f2f7fc' : '#071935';
  }
  button.addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'day' ? 'night' : 'day';
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next === 'day' ? 'light' : 'dark';
    try { localStorage.setItem('roshan-portfolio-theme', next); } catch (_) {}
    update();
  });
  update();
})();
