export const themeStorageKeys = {
  preference: 'emotune_theme',
  emotionEnabled: 'emotune_emotion_theme',
};

export const legacyThemeAliases = {
  light: 'glass-white',
  dark: 'glass-black',
  aurora: 'glass-ocean',
  'crimson-night': 'glass-lavender',
  'lime-mellow': 'glass-emerald',
  'neon-pulse': 'glass-midnight',
};

export const themes = [
  { id: 'system', name: 'System', mode: 'system', description: 'Match your device', featured: true },
  { id: 'glass-white', name: 'Glass White', mode: 'light', description: 'Luminous and editorial', featured: true },
  { id: 'glass-sand', name: 'Glass Sand', mode: 'light', description: 'Warm and luxurious' },
  { id: 'glass-black', name: 'Glass Black', mode: 'dark', description: 'Pure and focused', featured: true },
  { id: 'glass-midnight', name: 'Glass Midnight', mode: 'dark', description: 'Deep blue-black surfaces' },
  { id: 'glass-ocean', name: 'Glass Ocean', mode: 'dark', description: 'Cool, composed accents' },
  { id: 'glass-emerald', name: 'Glass Emerald', mode: 'dark', description: 'Measured green accents' },
  { id: 'glass-lavender', name: 'Glass Lavender', mode: 'dark', description: 'Refined violet accents' },
];

export const emotionThemeMap = {
  '\u{1F60A}': 'glass-ocean', '\u{1F604}': 'glass-ocean', '\u{1F602}': 'glass-ocean',
  '\u{1F622}': 'glass-midnight', '\u{1F62D}': 'glass-midnight', '\u{1F614}': 'glass-midnight',
  '\u{1F621}': 'glass-lavender', '\u{1F92C}': 'glass-lavender',
  '\u{1F60D}': 'glass-lavender', '\u{2764}\u{FE0F}': 'glass-lavender', '\u{1F970}': 'glass-lavender',
  '\u{1F628}': 'glass-emerald', '\u{1F630}': 'glass-emerald',
};
