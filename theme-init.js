// Runs in <head> before the page paints, preventing a bright/dark flash.
(function () {
  var saved = null;
  try { saved = localStorage.getItem('roshan-portfolio-theme'); } catch (_) {}
  var mode = saved === 'day' || saved === 'night' ? saved :
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night');
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode === 'day' ? 'light' : 'dark';
})();
