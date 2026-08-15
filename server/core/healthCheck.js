const mongoose = require('mongoose');
const os = require('os');
const { CONFIG } = require('./config');
const { logger } = require('./logger');
const cacheService = require('./cacheService');

let startTime = Date.now();

async function checkMongoDB() {
  const stateMap = {
    0: { status: 'disconnected', label: 'Disconnected' },
    1: { status: 'connected', label: 'Connected' },
    2: { status: 'connecting', label: 'Connecting' },
    3: { status: 'disconnecting', label: 'Disconnecting' },
  };

  const readyState = mongoose.connection.readyState;
  const state = stateMap[readyState] || { status: 'unknown', label: 'Unknown' };

  const result = {
    status: state.status,
    state: state.label,
    readyState,
  };

  if (readyState === 1) {
    try {
      const admin = mongoose.connection.db.admin();
      const serverInfo = await admin.serverInfo();
      result.version = serverInfo.version;
      result.host = mongoose.connection.host;
      result.port = mongoose.connection.port;
      result.name = mongoose.connection.name;
    } catch (err) {
      result.serverInfoError = err.message;
    }
  }

  return result;
}

async function checkRedis() {
  const result = {
    configured: !!CONFIG.redis.url,
  };

  if (!CONFIG.redis.url) {
    result.status = 'not_configured';
    return result;
  }

  try {
    const health = await cacheService.healthCheck();
    result.status = health.status;
    result.memoryEntries = health.memoryEntries || 0;
  } catch (err) {
    result.status = 'error';
    result.error = err.message;
  }

  return result;
}

function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: Math.floor(process.uptime()),
    systemUptime: Math.floor(os.uptime()),
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePercent: ((usedMem / totalMem) * 100).toFixed(2),
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external,
      arrayBuffers: process.memoryUsage().arrayBuffers || 0,
    },
    cpu: {
      model: cpus[0]?.model || 'unknown',
      cores: cpus.length,
      loadAvg: os.loadavg(),
      speed: cpus[0]?.speed || 0,
    },
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    nodeVersion: process.version,
    pid: process.pid,
  };
}

function getActiveConnections() {
  return {
    mongodb: mongoose.connection.readyState === 1 ? 1 : 0,
    memoryConnections: cacheService._memoryCache ? cacheService._memoryCache.size : 0,
    totalOpenHandles: process._getActiveHandles ? process._getActiveHandles().length : 0,
    totalOpenRequests: process._getActiveRequests ? process._getActiveRequests().length : 0,
  };
}

async function getHealth() {
  const mongodb = await checkMongoDB();
  const redis = await checkRedis();
  const system = getSystemInfo();
  const connections = getActiveConnections();

  let status = 'ok';
  if (mongodb.status === 'disconnected' || mongodb.status === 'error') {
    status = 'down';
  } else if (mongodb.status !== 'connected' || redis.status === 'not_configured') {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    mongodb,
    redis,
    system,
    connections,
  };
}

module.exports = {
  getHealth,
  checkMongoDB,
  checkRedis,
  getSystemInfo,
};
