import api from './api';

const storyService = {
  async getFeed() { return (await api.get('/stories/feed')).data; },
  async getSuggestions() { return (await api.get('/stories/suggestions')).data; },
  async createStory(storyData) { return (await api.post('/stories', storyData)).data; },
  async getStory(id) { return (await api.get(`/stories/${id}`)).data; },
  async deleteStory(id) { return (await api.delete(`/stories/${id}`)).data; },
  async viewStory(id, { completed = false, duration = 0 } = {}) {
    return (await api.post(`/stories/${id}/view`, { completed, duration })).data;
  },
  async reactToStory(id, emoji) { return (await api.post(`/stories/${id}/react`, { emoji })).data; },
  async replyToStory(id, content) { return (await api.post(`/stories/${id}/reply`, { content })).data; },
  async getHighlights() { return (await api.get('/stories/highlights')).data; },
  async createHighlight(name, storyIds) { return (await api.post('/stories/highlights', { name, storyIds })).data; },
  async generateMemoryStory() { return (await api.post('/stories/memory')).data; },
  async getTrending(limit = 10) { return (await api.get(`/stories/trending?limit=${limit}`)).data; },
  async getAnalytics(id) { return (await api.get(`/stories/${id}/analytics`)).data; },
};

export default storyService;
