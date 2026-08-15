(function initializeEmotuneTheme() {
  var aliases = {
    light: 'glass-white', dark: 'glass-black', aurora: 'glass-ocean',
    'crimson-night': 'glass-lavender', 'lime-mellow': 'glass-emerald',
    'neon-pulse': 'glass-midnight'
  };
  var preference;
  try { preference = localStorage.getItem('emotune_theme') || 'system'; } catch (_) { preference = 'system'; }
  preference = aliases[preference] || preference;
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var resolved = preference === 'system' ? (dark ? 'glass-black' : 'glass-white') : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved === 'glass-white' || resolved === 'glass-sand' ? 'light' : 'dark';
}());
