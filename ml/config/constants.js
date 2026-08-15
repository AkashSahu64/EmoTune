const constants = {
  // ─── Emotion Analysis ────────────────────────────────
  EMOTION_MODEL: 'gemini-1.5-flash',
  EMOTION_TEMPERATURE: 0.7,
  EMOTION_MAX_TOKENS: 500,
  EMOTION_MESSAGE_COUNT: 10,
  EMOTION_DEBOUNCE_MS: 1500,

  // ─── Intent Classification ──────────────────────────
  INTENT_MODEL: 'gemini-1.5-flash',
  INTENT_TEMPERATURE: 0.3,
  INTENT_MAX_TOKENS: 150,
  INTENT_DELAY_MS: 2000,

  // ─── Embeddings ─────────────────────────────────────
  EMBEDDING_MODEL: 'embedding-gecko-001',
  EMBEDDING_DIMENSIONS: 768,

  // ─── Memory ─────────────────────────────────────────
  MEMORY_SEARCH_LIMIT: 5,
  MEMORY_SEARCH_RADIUS: 50,
  MEMORY_SNIPPET_LENGTH: 200,

  // ─── Truth / Fact Check ────────────────────────────
  TRUTH_MODEL: 'gemini-1.5-flash',
  TRUTH_TEMPERATURE: 0.2,
  TRUTH_MAX_TOKENS: 200,
  TRUTH_DEFAULT_SCORE: 0.5,
  TRUTH_HIGH_THRESHOLD: 0.7,
  TRUTH_LOW_THRESHOLD: 0.4,
  TRUTH_BAYESIAN_PRIOR: 0.5,
  TRUTH_BAYESIAN_PSEUDO_COUNT: 4,

  // ─── Persona ────────────────────────────────────────
  PERSONA_MODEL: 'gemini-1.5-flash',
  PERSONA_TEMPERATURE: 0.8,
  PERSONA_MAX_TOKENS: 300,
  PERSONA_MAX_INPUT_LENGTH: 500,

  // ─── DecideFlow ─────────────────────────────────────
  DECIDE_MODEL: 'gemini-1.5-flash',
  DECIDE_TEMPERATURE: 0.5,
  DECIDE_MAX_TOKENS: 600,
  DECIDE_MESSAGE_HISTORY: 50,
  DECIDE_VOTE_REQUIRED_PERCENT: 60,
  DECIDE_EXPIRY_HOURS: 24,

  // ─── Theme ──────────────────────────────────────────
  THEME_MAP: {
    joy: 'aurora',
    happy: 'aurora',
    excited: 'aurora',
    sad: 'dark',
    sadness: 'dark',
    depressed: 'dark',
    anger: 'crimson-night',
    angry: 'crimson-night',
    frustrated: 'crimson-night',
    love: 'neon-pulse',
    romantic: 'neon-pulse',
    affectionate: 'neon-pulse',
    fear: 'lime-mellow',
    anxious: 'lime-mellow',
    worried: 'lime-mellow',
    neutral: 'dark',
    calm: 'light',
    peaceful: 'light',
  },

  // ─── Emoji → Theme mapping ──────────────────────────
  EMOJI_THEME_MAP: {
    '😊': 'aurora', '😄': 'aurora', '😂': 'aurora', '🥳': 'aurora',
    '😢': 'dark', '😭': 'dark', '😔': 'dark', '🥺': 'dark',
    '😡': 'crimson-night', '🤬': 'crimson-night', '👿': 'crimson-night',
    '😍': 'neon-pulse', '❤️': 'neon-pulse', '🥰': 'neon-pulse', '💕': 'neon-pulse',
    '😨': 'lime-mellow', '😰': 'lime-mellow', '😱': 'lime-mellow',
  },

  // ─── API Endpoints ──────────────────────────────────
  ENDPOINTS: {
    GROQ_CHAT: 'https://api.groq.com/openai/v1/chat/completions',
    GEMINI_CHAT: 'https://generativelanguage.googleapis.com/v1beta/models',
    GEMINI_EMBED: 'https://generativelanguage.googleapis.com/v1beta/models',
    HUGGINGFACE_INFERENCE: 'https://api-inference.huggingface.co/models',
    LYRICS_OVH: 'https://api.lyrics.ovh/v1',
    GOOGLE_FACT_CHECK: 'https://factchecktools.googleapis.com/v1alpha1/claims:search',
  },

  // ─── Groq (Free Llama 3 Inference) ──────────────────
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROQ_TEMPERATURE: 0.7,
  GROQ_MAX_TOKENS: 500,

  // ─── Rate Limiting ──────────────────────────────────
  RATE_LIMIT: {
    AI_REQUESTS_PER_MIN: 20,
    BURST_SIZE: 5,
    REFILL_RATE: 1,
    REFILL_INTERVAL_MS: 3000,
  },
};

module.exports = constants;
