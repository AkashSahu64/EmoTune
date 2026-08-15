const axios = require('axios');
const logger = require('../utils/logger');
const { parallelFetchAll } = require('./parallelFallback');

async function searchDailymotion(query, limit = 5) {
  const response = await axios.get('https://api.dailymotion.com/videos', {
    params: { search: query, limit, fields: 'id,title,thumbnail_360_url,url,duration,embed_url,owner' },
    timeout: 4000,
  });

  return (response.data?.list || []).map((video) => ({
    id: video.id,
    title: video.title || query,
    thumbnail: video.thumbnail_360_url || '',
    embedUrl: video.embed_url || `https://www.dailymotion.com/embed/video/${video.id}`,
    source: 'dailymotion',
    duration: video.duration || 0,
    externalUrl: video.url || '',
  }));
}

async function searchYouTube(query, limit = 5) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: limit,
      videoDuration: 'short',
      key: apiKey,
    },
    timeout: 4000,
  });

  return (response.data?.items || []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || '',
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
    source: 'youtube',
    duration: 'short',
    externalUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }));
}

async function searchPexelsVideo(query, limit = 5) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  const response = await axios.get('https://api.pexels.com/videos/search', {
    headers: { Authorization: apiKey },
    params: { query, per_page: limit, size: 'small' },
    timeout: 4000,
  });

  return (response.data?.videos || []).map((video) => ({
    id: video.id.toString(),
    title: query,
    thumbnail: video.image || '',
    embedUrl: video.video_files?.[0]?.link || '',
    source: 'pexels',
    duration: video.duration || 0,
    externalUrl: video.url || '',
  }));
}

async function searchPixabayVideo(query, limit = 5) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return [];

  const response = await axios.get('https://pixabay.com/api/videos/', {
    params: { key: apiKey, q: query, per_page: limit, safesearch: true },
    timeout: 4000,
  });

  return (response.data?.hits || []).map((video) => ({
    id: video.id.toString(),
    title: query,
    thumbnail: video.videos?.tiny?.thumbnail || '',
    embedUrl: video.videos?.tiny?.url || video.videos?.small?.url || '',
    source: 'pixabay',
    duration: video.duration || 0,
    externalUrl: '',
  }));
}

async function searchVideos(query, limit = 5) {
  if (!query || !query.trim()) return [];

  const searchQuery = query.trim();

  const { results: allVideos, errors } = await parallelFetchAll([
    { name: 'dailymotion', fn: () => searchDailymotion(searchQuery, limit), timeout: 4000 },
    { name: 'youtube', fn: () => searchYouTube(searchQuery, limit), timeout: 4000 },
    { name: 'pexels', fn: () => searchPexelsVideo(searchQuery, limit), timeout: 4000 },
    { name: 'pixabay', fn: () => searchPixabayVideo(searchQuery, limit), timeout: 4000 },
  ]);

  const seen = new Set();
  const uniqueVideos = [];

  for (const video of allVideos) {
    const key = video.id?.toString() || video.embedUrl;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVideos.push(video);
    }
  }

  return uniqueVideos.slice(0, limit);
}

module.exports = { searchVideos, searchDailymotion, searchYouTube, searchPexelsVideo, searchPixabayVideo };
