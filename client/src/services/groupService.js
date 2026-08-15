import api from './api';

const groupService = {
  async getIntelligence(chatId) { return (await api.get(`/groups/${chatId}/intelligence`)).data; },
  async getMood(chatId) { return (await api.get(`/groups/${chatId}/mood`)).data; },
  async getEngagement(chatId) { return (await api.get(`/groups/${chatId}/engagement`)).data; },
  async getSummary(chatId, regenerate) { return (await api.get(`/groups/${chatId}/summary`, { params: { regenerate } })).data; },
  async getTopicDrift(chatId) { return (await api.get(`/groups/${chatId}/topics/drift`)).data; },
  async getConflicts(chatId) { return (await api.get(`/groups/${chatId}/conflicts`)).data; },
  async getParticipationScore(chatId, userId) { return (await api.get(`/groups/${chatId}/participation/${userId}`)).data; },
  async getSharedMedia(chatId, options) { return (await api.get(`/groups/${chatId}/media`, { params: options })).data; },
  async searchMessages(chatId, query) { return (await api.get(`/groups/${chatId}/search`, { params: { q: query } })).data; },
  async setPermissions(chatId, permissions) { return (await api.patch(`/groups/${chatId}/permissions`, permissions)).data; },
  async manageJoinRequest(chatId, userId, action) { return (await api.post(`/groups/${chatId}/join-requests`, { userId, action })).data; },
  async createInviteLink(chatId, options) { return (await api.post(`/groups/${chatId}/invite`, options)).data; },
  async joinViaInvite(code) { return (await api.post(`/${code}/join`)).data; },
  async toggleMute(chatId) { return (await api.post(`/groups/${chatId}/mute`)).data; },
  async getOnlineMembers(chatId) { return (await api.get(`/groups/${chatId}/online`)).data; },
};

export default groupService;