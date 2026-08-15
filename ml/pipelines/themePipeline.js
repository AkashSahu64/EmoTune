const constants = require('../config/constants');

function mapEmotionToTheme(emotionString) {
  if (!emotionString) return 'dark';

  const lower = emotionString.toLowerCase().trim();
  const directMatch = constants.THEME_MAP[lower];
  if (directMatch) return directMatch;

  for (const [key, theme] of Object.entries(constants.THEME_MAP)) {
    if (lower.includes(key)) return theme;
  }

  return 'dark';
}

function mapEmojiToTheme(emoji) {
  if (!emoji) return 'dark';
  return constants.EMOJI_THEME_MAP[emoji] || 'dark';
}

function getThemeForEmotionResult(emotionResult) {
  if (!emotionResult) return 'dark';

  const { emoji } = emotionResult;

  const emojiTheme = mapEmojiToTheme(emoji);
  if (emojiTheme !== 'dark' || !emoji) return emojiTheme;

  return 'dark';
}

function getAllThemes() {
  return [
    { id: 'light', name: 'Light', icon: '☀️' },
    { id: 'dark', name: 'Dark', icon: '🌙' },
    { id: 'aurora', name: 'Aurora', icon: '🌌' },
    { id: 'crimson-night', name: 'Crimson Night', icon: '🌹' },
    { id: 'lime-mellow', name: 'Lime Mellow', icon: '🍋' },
    { id: 'neon-pulse', name: 'Neon Pulse', icon: '💜' },
  ];
}

module.exports = {
  mapEmotionToTheme,
  mapEmojiToTheme,
  getThemeForEmotionResult,
  getAllThemes,
};
