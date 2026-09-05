(function initializeEmotuneTheme() {
  var LEGACY_LIGHT = { 'glass-white': 1, 'glass-sand': 1 };
  var LEGACY_DARK = { 'glass-black': 1, 'glass-midnight': 1, 'glass-ocean': 1, 'glass-emerald': 1, 'glass-lavender': 1 };

  function normalizeTheme(value) {
    if (value === 'light' || value === 'dark') return value;
    if (LEGACY_LIGHT[value]) return 'light';
    if (LEGACY_DARK[value]) return 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var stored = null;
  try { stored = localStorage.getItem('emotune_theme'); } catch (_) {}
  var theme = normalizeTheme(stored);

  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem('emotune_theme', theme); } catch (_) {}
}());
