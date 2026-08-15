require('dotenv').config();

module.exports = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
  JIO_SAAVN_API: process.env.JIO_SAAVN_API || 'https://jiosaavn-api.example.com',
  GOOGLE_FACT_CHECK_API_KEY: process.env.GOOGLE_FACT_CHECK_API_KEY,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'emotune_jwt_secret_2024_v2',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'emotune_refresh_secret_2024_v2',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT) || 3000,
  AI_RETRIES: parseInt(process.env.AI_RETRIES) || 1,
};
