const axios = require('axios');
const { YOUTUBE_API_KEY } = require('../config/constants');
const logger = require('../utils/logger');

async function searchVideo(query, maxResults = 3) {
  try {
    if (!YOUTUBE_API_KEY) {
      return await searchPexels(query);
    }

    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults,
        videoDuration: 'short',
        key: YOUTUBE_API_KEY,
      },
      timeout: 5000,
    });

    return response.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      source: 'youtube',
      duration: 'short',
    }));
  } catch (error) {
    logger.warn('YouTube search failed, falling back to Pexels', { error: error.message });
    return await searchPexels(query);
  }
}

async function searchPexels(query) {
  try {
    const { PEXELS_API_KEY } = require('../config/constants');
    if (!PEXELS_API_KEY) return await searchPixabay(query);

    const response = await axios.get('https://api.pexels.com/videos/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query, per_page: 3, size: 'small' },
      timeout: 5000,
    });

    return response.data.videos.map((video) => ({
      id: video.id.toString(),
      title: query,
      thumbnail: video.image || '',
      embedUrl: video.video_files?.[0]?.link || '',
      source: 'pexels',
      duration: video.duration,
    }));
  } catch (error) {
    logger.warn('Pexels search failed, falling back to Pixabay', { error: error.message });
    return await searchPixabay(query);
  }
}

async function searchPixabay(query) {
  try {
    const { PIXABAY_API_KEY } = require('../config/constants');
    if (!PIXABAY_API_KEY) return [];

    const response = await axios.get('https://pixabay.com/api/videos/', {
      params: {
        key: PIXABAY_API_KEY,
        q: query,
        per_page: 3,
        safesearch: true,
      },
      timeout: 5000,
    });

    return response.data.hits.map((video) => ({
      id: video.id.toString(),
      title: query,
      thumbnail: video.videos?.tiny?.thumbnail || '',
      embedUrl: video.videos?.tiny?.url || video.videos?.small?.url || '',
      source: 'pixabay',
      duration: video.duration,
    }));
  } catch (error) {
    logger.error('All video providers failed', { error: error.message });
    return [];
  }
}

module.exports = { searchVideo, searchPexels, searchPixabay };
