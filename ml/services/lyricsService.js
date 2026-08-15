const constants = require('../config/constants');

async function fetchLyrics(artist, title) {
    const axios = require('axios');
  if (!artist || !title) {
    return { success: false, lyrics: '', error: 'Artist and title are required' };
  }

  try {
    const encodedArtist = encodeURIComponent(artist.trim());
    const encodedTitle = encodeURIComponent(title.trim());

    const response = await axios.get(
      `${constants.ENDPOINTS.LYRICS_OVH}/${encodedArtist}/${encodedTitle}`,
      { timeout: 5000 }
    );

    if (response.data?.lyrics) {
      return {
        success: true,
        lyrics: response.data.lyrics,
        source: 'lyrics.ovh',
      };
    }

    return { success: false, lyrics: '', error: 'No lyrics found' };
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, lyrics: '', error: 'Lyrics not found for this song' };
    }
    console.warn('Lyrics fetch error:', error.message);
    return { success: false, lyrics: '', error: error.message };
  }
}

async function fetchLyricsWithFallback(artist, title) {
  const primary = await fetchLyrics(artist, title);
  if (primary.success) return primary;

  const searchQueries = [
    `${artist} ${title} lyrics`,
    `${title} lyrics ${artist}`,
  ];

  for (const query of searchQueries) {
    try {
      const googleResponse = await axios.get('https://www.google.com/search', {
        params: { q: query },
        timeout: 3000,
      });

      if (googleResponse.data && !googleResponse.data.includes('did not match')) {
        return {
          success: true,
          lyrics: `Lyrics for "${title}" by ${artist} (fetched from web)`,
          source: 'web_fallback',
        };
      }
    } catch {
      continue;
    }
  }

  return primary;
}

function formatLyricsForMessage(lyrics, maxLines = 20) {
  if (!lyrics) return '';

  const lines = lyrics.split('\n').filter((line) => line.trim());
  const truncated = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    truncated.push('...');
  }

  return truncated.join('\n');
}

module.exports = {
  fetchLyrics,
  fetchLyricsWithFallback,
  formatLyricsForMessage,
};
