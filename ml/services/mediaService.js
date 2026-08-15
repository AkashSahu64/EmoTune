const constants = require('../config/constants');

const SPOTIFY_API = 'https://api.spotify.com/v1';
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const PEXELS_API = 'https://api.pexels.com/videos/search';
const PIXABAY_API = 'https://pixabay.com/api/videos/';

let spotifyToken = null;
let spotifyTokenExpiry = null;

async function getSpotifyToken() {
  const axios = require('axios');
  if (spotifyToken && spotifyTokenExpiry && Date.now() < spotifyTokenExpiry) {
    return spotifyToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        timeout: 5000,
      }
    );

    spotifyToken = response.data.access_token;
    spotifyTokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return spotifyToken;
  } catch (error) {
    console.warn('Spotify auth error:', error.message);
    return null;
  }
}

async function searchSong(query, maxResults = 5) {
  const axios = require('axios');
  if (!query) return [];

  try {
    const token = await getSpotifyToken();
    if (token) {
      try {
        const response = await axios.get(`${SPOTIFY_API}/search`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: query, type: 'track', limit: maxResults },
          timeout: 5000,
        });

        if (response.data?.tracks?.items) {
          return response.data.tracks.items.map((track) => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map((a) => a.name).join(', '),
            album: track.album.name,
            albumArt: track.album.images?.[0]?.url || '',
            previewUrl: track.preview_url || '',
            externalUrl: track.external_urls?.spotify || '',
            source: 'spotify',
            duration: track.duration_ms,
          }));
        }
      } catch (spotifyError) {
        console.warn('Spotify search error, trying Saavn:', spotifyError.message);
      }
    }

    return await searchSaavn(query, maxResults);
  } catch (error) {
    console.error('Song search error:', error.message);
    return [];
  }
}

async function searchSaavn(query, maxResults = 5) {
  const axios = require('axios');
  try {
    const saavnApi = process.env.JIO_SAAVN_API;
    if (!saavnApi) return [];

    const response = await axios.get(`${saavnApi}/search/songs`, {
      params: { query, limit: maxResults },
      timeout: 5000,
    });

    const songs = response.data?.data?.results || response.data?.results || [];
    return songs.map((song) => ({
      id: song.id || song.perma_url,
      title: song.title || song.name || query,
      artist: song.primary_artists || song.singers || 'Unknown',
      album: song.album || '',
      albumArt: song.image?.[0]?.url || song.image || '',
      previewUrl: song.media_url || song.download_url?.[0]?.link || '',
      externalUrl: song.perma_url || '',
      source: 'jiosaavn',
      duration: song.duration || 0,
    }));
  } catch (error) {
    console.warn('Saavn search error:', error.message);
    return [];
  }
}

async function searchVideo(query, maxResults = 3) {
  const axios = require('axios');
  if (!query) return [];

  try {
    const youtubeKey = process.env.YOUTUBE_API_KEY;
    if (youtubeKey) {
      try {
        const response = await axios.get(`${YOUTUBE_API}/search`, {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults,
            videoDuration: 'short',
            key: youtubeKey,
          },
          timeout: 5000,
        });

        if (response.data?.items) {
          return response.data.items.map((item) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url || '',
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
            source: 'youtube',
            duration: 'short',
          }));
        }
      } catch (ytError) {
        console.warn('YouTube search error, trying Pexels:', ytError.message);
      }
    }

    return await searchPexelsVideo(query, maxResults);
  } catch (error) {
    console.error('Video search error:', error.message);
    return [];
  }
}

async function searchPexelsVideo(query, maxResults = 3) {
  const axios = require('axios');
  try {
    const pexelsKey = process.env.PEXELS_API_KEY;
    if (!pexelsKey) return await searchPixabayVideo(query, maxResults);

    const response = await axios.get(PEXELS_API, {
      headers: { Authorization: pexelsKey },
      params: { query, per_page: maxResults, size: 'small' },
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
    console.warn('Pexels search error, trying Pixabay:', error.message);
    return await searchPixabayVideo(query, maxResults);
  }
}

async function searchPixabayVideo(query, maxResults = 3) {
  const axios = require('axios');
  try {
    const pixabayKey = process.env.PIXABAY_API_KEY;
    if (!pixabayKey) return [];

    const response = await axios.get(PIXABAY_API, {
      params: { key: pixabayKey, q: query, per_page: maxResults, safesearch: true },
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
    console.warn('Pixabay search error:', error.message);
    return [];
  }
}

async function searchMedia(query, types = ['song', 'video']) {
  const results = {};

  if (types.includes('song')) {
    results.songs = await searchSong(query);
  }

  if (types.includes('video')) {
    results.videos = await searchVideo(query);
  }

  return results;
}

function mergeMediaResults(primaryResults, fallbackResults) {
  if (primaryResults.length > 0) return primaryResults;
  return fallbackResults;
}

module.exports = {
  searchSong,
  searchSaavn,
  searchVideo,
  searchPexelsVideo,
  searchPixabayVideo,
  searchMedia,
  mergeMediaResults,
};
