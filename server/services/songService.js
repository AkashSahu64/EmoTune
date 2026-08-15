const axios = require('axios');
const logger = require('../utils/logger');
const { parallelFetchAll } = require('./parallelFallback');

async function searchITunes(query, limit = 5) {
  const response = await axios.get('https://itunes.apple.com/search', {
    params: { term: query, entity: 'song', limit, media: 'music' },
    timeout: 4000,
  });

  return (response.data?.results || []).map((track) => ({
    id: track.trackId?.toString() || track.collectionId?.toString(),
    title: track.trackName || track.collectionName || query,
    artist: track.artistName || 'Unknown',
    album: track.collectionName || '',
    albumArt: track.artworkUrl100 || track.artworkUrl60 || '',
    previewUrl: track.previewUrl || '',
    externalUrl: track.trackViewUrl || '',
    source: 'itunes',
    duration: track.trackTimeMillis || 0,
  }));
}

async function searchDeezer(query, limit = 5) {
  const response = await axios.get('https://api.deezer.com/search', {
    params: { q: query, limit, order: 'RANKING' },
    timeout: 4000,
  });

  return (response.data?.data || []).map((track) => ({
    id: track.id?.toString(),
    title: track.title || query,
    artist: track.artist?.name || 'Unknown',
    album: track.album?.title || '',
    albumArt: track.album?.cover_medium || track.album?.cover_small || '',
    previewUrl: track.preview || '',
    externalUrl: track.link || '',
    source: 'deezer',
    duration: track.duration ? track.duration * 1000 : 0,
  }));
}

async function searchSpotify(query, limit = 5) {
  const { searchSong } = require('./spotifyService');
  return await searchSong(query, limit);
}

async function searchSaavnFallback(query, limit = 5) {
  const { searchSaavn } = require('./spotifyService');
  return await searchSaavn(query);
}

async function searchSongs(query, limit = 5) {
  if (!query || !query.trim()) return [];

  const searchQuery = query.trim().toLowerCase();

  const { results: allSongs, errors } = await parallelFetchAll([
    { name: 'itunes', fn: () => searchITunes(searchQuery, limit), timeout: 4000 },
    { name: 'deezer', fn: () => searchDeezer(searchQuery, limit), timeout: 4000 },
    { name: 'spotify', fn: () => searchSpotify(searchQuery, limit), timeout: 5000 },
    { name: 'jiosaavn', fn: () => searchSaavnFallback(searchQuery, limit), timeout: 5000 },
  ]);

  const seen = new Set();
  const uniqueSongs = [];

  for (const song of allSongs) {
    const key = `${song.title}|${song.artist}`.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSongs.push(song);
    }
  }

  return uniqueSongs.slice(0, limit);
}

module.exports = { searchSongs, searchITunes, searchDeezer, searchSpotify, searchSaavnFallback };
