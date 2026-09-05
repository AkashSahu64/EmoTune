const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function removeImageBackground(filePath, signal) {
  if (!process.env.REMOVE_BG_API_KEY) {
    const error = new Error('Background removal provider is not configured');
    error.code = 'BACKGROUND_REMOVAL_NOT_CONFIGURED';
    error.status = 503;
    throw error;
  }
  const form = new FormData();
  form.append('image_file', fs.createReadStream(filePath));
  form.append('size', 'preview');
  try {
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
      headers: { ...form.getHeaders(), 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
      responseType: 'arraybuffer',
      timeout: 60_000,
      signal,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024,
    });

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('image/png')) {
      const error = new Error('Background removal provider returned an invalid image');
      error.code = 'BACKGROUND_REMOVAL_INVALID_RESPONSE';
      error.status = 502;
      throw error;
    }

    return Buffer.from(response.data);
  } catch (error) {
    if (error.code === 'BACKGROUND_REMOVAL_INVALID_RESPONSE') throw error;

    const providerStatus = error.response?.status;
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.name === 'CanceledError') {
      error.code = error.name === 'CanceledError' ? 'BACKGROUND_REMOVAL_CANCELED' : 'BACKGROUND_REMOVAL_TIMEOUT';
      error.status = error.name === 'CanceledError' ? 499 : 504;
    } else if (providerStatus === 400) {
      error.code = 'BACKGROUND_REMOVAL_INVALID_IMAGE';
      error.status = 422;
    } else if (providerStatus === 402) {
      error.code = 'BACKGROUND_REMOVAL_QUOTA_EXCEEDED';
      error.status = 402;
    } else if (providerStatus === 413) {
      error.code = 'BACKGROUND_REMOVAL_IMAGE_TOO_LARGE';
      error.status = 413;
    } else if (providerStatus === 429) {
      error.code = 'BACKGROUND_REMOVAL_RATE_LIMITED';
      error.status = 429;
    } else if (providerStatus === 401 || providerStatus === 403) {
      error.code = 'BACKGROUND_REMOVAL_INVALID_API_KEY';
      error.status = 503;
    } else if (providerStatus >= 500) {
      error.code = 'BACKGROUND_REMOVAL_PROVIDER_UNAVAILABLE';
      error.status = 502;
    } else if (!error.status) {
      error.code = 'BACKGROUND_REMOVAL_PROVIDER_ERROR';
      error.status = 502;
    }
    throw error;
  }
}

module.exports = { removeImageBackground };
