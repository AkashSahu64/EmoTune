const axios = require('axios');
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = require('../config/constants');
const logger = require('../utils/logger');

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return null;
    }

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        timeout: 5000,
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    return accessToken;
  } catch (error) {
    logger.warn('Spotify auth failed, falling back to JioSaavn', { error: error.message });
    return null;
  }
}

async function searchSong(query, maxResults = 3) {
  try {
    const token = await getAccessToken();
    if (!token) return await searchSaavn(query);

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: query,
        type: 'track',
        limit: maxResults,
      },
      timeout: 5000,
    });

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
  } catch (error) {
    logger.warn('Spotify search failed, falling back to JioSaavn', { error: error.message });
    return await searchSaavn(query);
  }
}

async function searchSaavn(query) {
  try {
    const { JIO_SAAVN_API } = require('../config/constants');
    const response = await axios.get(`${JIO_SAAVN_API}/search/songs`, {
      params: { query, limit: 3 },
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
    logger.error('All music providers failed', { error: error.message });
    return [];
  }
}

async function getTrackPreview(trackId, source = 'spotify') {
  if (source === 'spotify') {
    return `https://open.spotify.com/embed/track/${trackId}?autoplay=1`;
  }
  return trackId;
}

module.exports = { searchSong, searchSaavn, getTrackPreview };
