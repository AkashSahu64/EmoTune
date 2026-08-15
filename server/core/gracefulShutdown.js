const mongoose = require('mongoose');
const { logger } = require('./logger');
const cacheService = require('./cacheService');

const SHUTDOWN_TIMEOUT = 30000;

let shuttingDown = false;

async function closeMongoDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  } catch (err) {
    logger.error('Error closing MongoDB connection', { error: err.message });
  }
}

async function closeRedis() {
  try {
    const Redis = require('ioredis');
    const { CONFIG } = require('./config');
    if (Redis && CONFIG.redis.url) {
      const tempClient = new Redis(CONFIG.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 0,
        retryStrategy: null,
      });
      try {
        await tempClient.connect();
        await tempClient.quit();
      } catch {
        logger.warn('Redis already disconnected or unavailable');
      }
    }
    logger.info('Redis connection closed');
  } catch (err) {
    logger.info('Redis not available for shutdown');
  }
}

async function closeBullMQWorkers() {
  const workers = [];
  try {
    const truthWorker = require('../workers/truthWorker');
    if (truthWorker.truthWorker) {
      await truthWorker.truthWorker.close();
      workers.push('truthWorker');
    }
    if (truthWorker.truthQueue) {
      await truthWorker.truthQueue.close();
    }
  } catch (err) {
    logger.debug('truthWorker not loaded', { error: err.message });
  }
  try {
    const intentWorker = require('../workers/intentWorker');
    if (intentWorker.intentWorker) {
      await intentWorker.intentWorker.close();
      workers.push('intentWorker');
    }
    if (intentWorker.intentQueue) {
      await intentWorker.intentQueue.close();
    }
  } catch (err) {
    logger.debug('intentWorker not loaded', { error: err.message });
  }
  try {
    const embeddingWorker = require('../workers/embeddingWorker');
    if (embeddingWorker.embeddingWorker) {
      await embeddingWorker.embeddingWorker.close();
      workers.push('embeddingWorker');
    }
    if (embeddingWorker.embeddingQueue) {
      await embeddingWorker.embeddingQueue.close();
    }
  } catch (err) {
    logger.debug('embeddingWorker not loaded', { error: err.message });
  }
  if (workers.length > 0) {
    logger.info('BullMQ workers closed', { workers });
  }
}

async function closeCacheService() {
  try {
    if (cacheService && typeof cacheService.flush === 'function') {
      await cacheService.flush();
    }
  } catch (err) {
    logger.debug('Cache service flush skipped', { error: err.message });
  }
}

function gracefulShutdown(server, signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout', { timeout: SHUTDOWN_TIMEOUT });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      logger.error('Error closing HTTP server', { error: err.message });
    } else {
      logger.info('HTTP server closed');
    }

    await closeBullMQWorkers();
    await closeCacheService();
    await closeRedis();
    await closeMongoDB();

    clearTimeout(forceExit);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
}

function setupGracefulShutdown(server) {
  process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
}

module.exports = { setupGracefulShutdown, gracefulShutdown };
