import api from './api';

const AI_SERVICE = {
  async getSuggestions(chatId) {
    const { data } = await api.get(`/ai/suggestions/${chatId}`);
    return data;
  },

  async getEmojis(chatId) {
    const { data } = await api.get(`/ai/emojis/${chatId}`);
    return data;
  },

  async getGifs(chatId) {
    const { data } = await api.get(`/ai/gifs/${chatId}`);
    return data;
  },

  async getShayari(chatId) {
    const { data } = await api.get(`/ai/shayari/${chatId}`);
    return data;
  },

  async getSongs(chatId) {
    const { data } = await api.get(`/ai/songs/${chatId}`);
    return data;
  },

  async getVideos(chatId) {
    const { data } = await api.get(`/ai/videos/${chatId}`);
    return data;
  },

  async getSummary(chatId, messageCount = 50) {
    const { data } = await api.get(`/ai/summary/${chatId}`, { params: { messageCount } });
    return data;
  },

  async rewriteWithPersona(text, targetTone, customPrompt = '') {
    const { data } = await api.post('/ai/rewrite', { text, targetTone, customPrompt });
    return data;
  },

  async getEmotionTheme(chatId) {
    const { data } = await api.get(`/ai/emotion-theme/${chatId}`);
    return data;
  },

  async translateMessage(text, targetLang = 'en') {
    const { data } = await api.post('/ai/translate', { text, targetLang });
    return data;
  },

  async getIntelligentSuggestions(chatId) {
    const { data } = await api.get(`/orchestrator/suggestions/${chatId}`);
    return data;
  },

  async getPredictions(chatId) {
    const { data } = await api.get(`/orchestrator/predictions/${chatId}`);
    return data;
  },

  async getConversationHealth(chatId) {
    const { data } = await api.get(`/orchestrator/health/${chatId}`);
    return data;
  },

  async getDNAProfile() {
    const { data } = await api.get('/dna');
    return data;
  },

  async getDNARecommendationProfile() {
    const { data } = await api.get('/dna/recommendations');
    return data;
  },

  async getWritingStyle() {
    const { data } = await api.get('/dna/writing-style');
    return data;
  },

  async recordFeedback(type, itemId, itemText, action, context = {}) {
    const { data } = await api.post('/feedback', { type, itemId, itemText, action, context });
    return data;
  },

  debouncedSuggestions: null,
};

export default AI_SERVICE;
