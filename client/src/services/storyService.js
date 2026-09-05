import api from './api';

const storyService = {
  async getFeed({ fresh = false } = {}) {
    return (await api.get('/stories/feed', {
      params: fresh ? { fresh: '1' } : undefined,
    })).data;
  },
  async getDrafts() { return (await api.get('/stories/drafts')).data; },
  async getSuggestions() { return (await api.get('/stories/suggestions')).data; },
  async createStory(storyData) { return (await api.post('/stories', storyData)).data; },
  async uploadStoryFile(file, onProgress, signal) {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/stories/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      signal,
      onUploadProgress: onProgress ? (event) => onProgress(Math.round((event.loaded / event.total) * 100)) : undefined,
    })).data;
  },
  async removeBackground(file, signal) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      return (await api.post('/stories/remove-background', formData, { headers: { 'Content-Type': 'multipart/form-data' }, responseType: 'blob', timeout: 120000, signal })).data;
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData instanceof Blob) {
        try {
          const payload = JSON.parse(await responseData.text());
          error.message = payload.error || error.message;
        } catch {
          // Keep the original Axios error when the response is not JSON.
        }
      }
      throw error;
    }
  },
  async getStory(id) { return (await api.get(`/stories/${id}`)).data; },
  async deleteStory(id) { return (await api.delete(`/stories/${id}`)).data; },
  async updateDraft(id, data) { return (await api.patch(`/stories/${id}/draft`, data)).data; },
  async publishStory(id) { return (await api.post(`/stories/${id}/publish`)).data; },
  async scheduleStory(id, scheduledAt) { return (await api.post(`/stories/${id}/schedule`, { scheduledAt })).data; },
  async cancelScheduledStory(id) { return (await api.delete(`/stories/${id}/schedule`)).data; },
  async shareStory(id, chatId) { return (await api.post(`/stories/${id}/share`, { chatId })).data; },
  async viewStory(id, { completed = false, duration = 0 } = {}) {
    return (await api.post(`/stories/${id}/view`, { completed, duration })).data;
  },
  async reactToStory(id, emoji) { return (await api.post(`/stories/${id}/react`, { emoji })).data; },
  async replyToStory(id, content) { return (await api.post(`/stories/${id}/reply`, { content })).data; },
  async getReplies(id) { return (await api.get(`/stories/${id}/replies`)).data; },
  async getInteraction(id) { return (await api.get(`/stories/${id}/interaction`)).data; },
  async submitInteraction(id, value) { return (await api.post(`/stories/${id}/interaction`, { value })).data; },
  async searchMusic(query) { return (await api.get('/stories/music/search', { params: { q: query } })).data; },
  async getHighlights() { return (await api.get('/stories/highlights')).data; },
  async createHighlight(name, storyIds, highlightId) { return (await api.post('/stories/highlights', { name, storyIds, highlightId })).data; },
  async deleteHighlight(id) { return (await api.delete(`/stories/highlights/${id}`)).data; },
  async generateMemoryStory() { return (await api.post('/stories/memory')).data; },
  async getTrending(limit = 10) { return (await api.get(`/stories/trending?limit=${limit}`)).data; },
  async searchStockImages(query = 'nature', page = 1, signal) {
    return (await api.get('/stories/stock-images', { params: { q: query, page, per_page: 12 }, timeout: 15000, signal })).data;
  },
  async getAnalytics(id) { return (await api.get(`/stories/${id}/analytics`)).data; },
  async getViewers(id, before) {
    return (await api.get(`/stories/${id}/viewers`, { params: before ? { before } : undefined })).data;
  },
};

export default storyService;
