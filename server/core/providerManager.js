const { CONFIG, getGeminiModels, getGroqModels, getActiveProviders, getTemperatureForTask, getMaxTokensForTask, needsJsonMode } = require('./config');
const { logger, metrics } = require('./logger');
const circuitBreaker = require('./circuitBreaker');
const cacheService = require('./cacheService');

const axios = require('axios');

const providerHandlers = {
  gemini: async (messages, options) => {
    const modelName = options.model || CONFIG.ai.gemini.defaultModel;
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    const fullText = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: fullText }] }],
      generationConfig: {
        temperature: options.temperature ?? CONFIG.ai.temperature,
        maxOutputTokens: options.maxTokens ?? CONFIG.ai.maxTokens,
      },
    };

    if (options.responseFormat === 'json_object' || needsJsonMode(options.taskType)) {
      payload.generationConfig.response_mime_type = 'application/json';
    }

    const response = await axios.post(
      `${CONFIG.ai.gemini.baseUrl}/models/${modelName}:generateContent?key=${CONFIG.ai.gemini.apiKey}`,
      payload,
      { timeout: options.timeout || CONFIG.ai.gemini.timeout }
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  groq: async (messages, options) => {
    const modelName = options.model || CONFIG.ai.groq.defaultModel;
    const response = await axios.post(
      `${CONFIG.ai.groq.baseUrl}/chat/completions`,
      {
        model: modelName,
        messages,
        temperature: options.temperature ?? CONFIG.ai.temperature,
        max_tokens: options.maxTokens ?? CONFIG.ai.maxTokens,
        response_format: (options.responseFormat === 'json_object' || needsJsonMode(options.taskType))
          ? { type: 'json_object' } : undefined,
      },
      {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CONFIG.ai.groq.apiKey}` },
        timeout: options.timeout || CONFIG.ai.groq.timeout,
      }
    );
    return response.data.choices?.[0]?.message?.content || '';
  },

  huggingface: async (messages, options) => {
    const modelName = options.model || CONFIG.ai.huggingface.defaultModel;
    const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
    const userMsg = messages.find((m) => m.role === 'user')?.content || '';
    const fullText = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

    const response = await axios.post(
      `${CONFIG.ai.huggingface.baseUrl}/${modelName}`,
      {
        inputs: fullText,
        parameters: {
          max_length: options.maxTokens ?? CONFIG.ai.maxTokens,
          temperature: options.temperature ?? CONFIG.ai.temperature,
          return_full_text: false,
        },
      },
      {
        headers: { Authorization: `Bearer ${CONFIG.ai.huggingface.apiKey}` },
        timeout: options.timeout || CONFIG.ai.huggingface.timeout,
      }
    );

    if (Array.isArray(response.data)) {
      return response.data[0]?.generated_text || '';
    }
    return response.data?.generated_text || '';
  },
};

const MODEL_CACHE = { gemini: null, groq: null, lastFetched: 0 };

async function discoverAvailableModels(provider) {
  const now = Date.now();
  if (MODEL_CACHE[provider] && (now - MODEL_CACHE.lastFetched) < 300000) {
    return MODEL_CACHE[provider];
  }

  try {
    if (provider === 'gemini' && CONFIG.ai.gemini.apiKey) {
      const response = await axios.get(
        `${CONFIG.ai.gemini.baseUrl}/models?key=${CONFIG.ai.gemini.apiKey}`,
        { timeout: 5000 }
      );
      const models = (response.data?.models || [])
        .filter((m) => m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => m.name.replace('models/', ''));

      MODEL_CACHE.gemini = models;
      MODEL_CACHE.lastFetched = now;
      logger.info('Discovered Gemini models', { count: models.length, models: models.slice(0, 5) });
      return models;
    }
  } catch (err) {
    logger.warn('Model discovery failed, using configured defaults', { provider, error: err.message });
  }

  const defaults = provider === 'gemini' ? getGeminiModels() : getGroqModels();
  MODEL_CACHE[provider] = defaults;
  MODEL_CACHE.lastFetched = now;
  return defaults;
}

async function chatCompletion(messages, options = {}) {
  const taskType = options.taskType || 'default';
  const temperature = options.temperature ?? getTemperatureForTask(taskType);
  const maxTokens = options.maxTokens ?? getMaxTokensForTask(taskType);
  const responseFormat = options.responseFormat || (needsJsonMode(taskType) ? 'json_object' : 'text');

  const cached = await cacheService.getResponseCache(
    messages.map((m) => m.content).join(''),
    messages.find((m) => m.role === 'system')?.content,
    taskType
  );
  if (cached) {
    logger.debug('Response cache hit', { taskType });
    return cached;
  }

  const activeProviders = getActiveProviders();
  if (activeProviders.length === 0) {
    throw new Error('No AI providers configured. Check your .env file for API keys.');
  }

  const errors = [];

  for (const providerName of activeProviders) {
    const handler = providerHandlers[providerName];
    if (!handler) continue;

    const modelsToTry = providerName === 'gemini'
      ? (await discoverAvailableModels('gemini'))
      : (providerName === 'groq' ? getGroqModels() : [CONFIG.ai[providerName]?.defaultModel].filter(Boolean));

    for (const modelName of modelsToTry) {
      if (circuitBreaker.isOpen(providerName, modelName)) {
        logger.debug('Circuit open, skipping', { provider: providerName, model: modelName });
        continue;
      }

      const timeout = CONFIG.ai[providerName]?.timeout || CONFIG.ai.timeout;
      const retries = CONFIG.ai[providerName]?.retries || CONFIG.ai.retries;

      for (let attempt = 0; attempt <= retries; attempt++) {
        const startTime = Date.now();
        try {
          const mergedOptions = {
            model: modelName,
            taskType,
            temperature,
            maxTokens,
            responseFormat,
            timeout: attempt < retries ? timeout : timeout + 2000,
          };

          const result = await handler(messages, mergedOptions);
          const latency = Date.now() - startTime;

          metrics.trackAiCall(providerName, modelName, latency, true);
          circuitBreaker.recordSuccess(providerName, modelName);
          logger.debug('AI call succeeded', { provider: providerName, model: modelName, taskType, latency });

          await cacheService.setResponseCache(
            messages.map((m) => m.content).join(''),
            messages.find((m) => m.role === 'system')?.content,
            taskType,
            result
          );

          return result;
        } catch (error) {
          const latency = Date.now() - startTime;
          metrics.trackAiCall(providerName, modelName, latency, false);
          circuitBreaker.recordFailure(providerName, modelName);
          errors.push({ provider: providerName, model: modelName, attempt, error: error.message });
          logger.warn('AI call failed', { provider: providerName, model: modelName, taskType, attempt, error: error.message });

          if (attempt < retries) {
            const backoff = Math.min(1000 * Math.pow(2, attempt), 8000);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }
      }
    }
  }

  throw new Error(`All AI providers failed. Errors: ${JSON.stringify(errors)}`);
}

async function* streamCompletion(messages, options = {}) {
  const taskType = options.taskType || 'default';
  const temperature = options.temperature ?? getTemperatureForTask(taskType);
  const maxTokens = options.maxTokens ?? getMaxTokensForTask(taskType);

  const activeProviders = getActiveProviders();
  if (activeProviders.length === 0) {
    throw new Error('No AI providers configured');
  }

  let streamed = false;
  for (const providerName of activeProviders) {
    if (streamed) break;
    if (providerName !== 'gemini') continue;

    const modelsToTry = await discoverAvailableModels('gemini');
    for (const modelName of modelsToTry) {
      if (streamed || circuitBreaker.isOpen(providerName, modelName)) continue;

      try {
        const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
        const userMsg = messages.find((m) => m.role === 'user')?.content || '';
        const fullText = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

        const response = await axios.post(
          `${CONFIG.ai.gemini.baseUrl}/models/${modelName}:streamGenerateContent?alt=sse&key=${CONFIG.ai.gemini.apiKey}`,
          {
            contents: [{ role: 'user', parts: [{ text: fullText }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          },
          {
            responseType: 'stream',
            timeout: 30000,
          }
        );

        const stream = response.data;
        let buffer = '';

        for await (const chunk of stream) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) yield { text, provider: providerName, model: modelName };
              } catch {}
            }
          }
        }
        streamed = true;
        circuitBreaker.recordSuccess(providerName, modelName);
      } catch (err) {
        circuitBreaker.recordFailure(providerName, modelName);
        logger.warn('Stream failed, trying next model', { provider: providerName, model: modelName, error: err.message });
      }
    }
  }

  if (!streamed) {
    const result = await chatCompletion(messages, options);
    yield { text: result, provider: 'fallback', model: 'chat-completion' };
  }
}

module.exports = { chatCompletion, streamCompletion, discoverAvailableModels, providerHandlers };
