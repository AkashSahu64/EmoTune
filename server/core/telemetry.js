const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] !== undefined ? LEVELS[process.env.LOG_LEVEL] : LEVELS.debug;

const activeSpans = new Map();

function createSpan(name, context) {
  const span = {
    name,
    context: context || {},
    startTime: Date.now(),
    spanId: `${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ended: false,
  };
  activeSpans.set(span.spanId, span);
  return span;
}

function endSpan(span) {
  if (!span || span.ended) return;
  span.ended = true;
  span.duration = Date.now() - span.startTime;
  span.endTime = Date.now();
  activeSpans.delete(span.spanId);

  const logEntry = {
    timestamp: new Date(span.endTime).toISOString(),
    level: 'info',
    module: 'telemetry',
    message: `Span: ${span.name}`,
    metadata: {
      spanId: span.spanId,
      name: span.name,
      durationMs: span.duration,
      context: span.context,
    },
  };

  if (CURRENT_LEVEL >= LEVELS.info) {
    console.log(JSON.stringify(logEntry));
  }

  return span;
}

const metricStore = new Map();

function recordMetric(name, value, tags) {
  const key = `${name}:${tags ? JSON.stringify(tags) : 'default'}`;
  if (!metricStore.has(key)) {
    metricStore.set(key, {
      name,
      tags: tags || {},
      values: [],
      firstRecorded: Date.now(),
      lastRecorded: Date.now(),
    });
  }

  const entry = metricStore.get(key);
  entry.values.push(value);
  entry.lastRecorded = Date.now();

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    module: 'telemetry',
    message: `Metric: ${name}`,
    metadata: {
      metric: name,
      value,
      tags: tags || {},
    },
  };

  if (CURRENT_LEVEL >= LEVELS.debug) {
    console.log(JSON.stringify(logEntry));
  }
}

function getMetricReport() {
  const report = {};
  for (const [key, entry] of metricStore) {
    const values = entry.values;
    const sum = values.reduce((a, b) => a + b, 0);
    report[entry.name] = {
      count: values.length,
      sum,
      avg: values.length > 0 ? sum / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      lastValue: values[values.length - 1],
      tags: entry.tags,
    };
  }
  return report;
}

function getStructuredLogger(module) {
  return {
    error: (message, metadata) => {
      if (CURRENT_LEVEL >= LEVELS.error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          module,
          message,
          metadata: metadata || {},
        }));
      }
    },
    warn: (message, metadata) => {
      if (CURRENT_LEVEL >= LEVELS.warn) {
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          module,
          message,
          metadata: metadata || {},
        }));
      }
    },
    info: (message, metadata) => {
      if (CURRENT_LEVEL >= LEVELS.info) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          module,
          message,
          metadata: metadata || {},
        }));
      }
    },
    debug: (message, metadata) => {
      if (CURRENT_LEVEL >= LEVELS.debug) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          module,
          message,
          metadata: metadata || {},
        }));
      }
    },
    child: (subModule) => getStructuredLogger(`${module}:${subModule}`),
  };
}

module.exports = {
  createSpan,
  endSpan,
  recordMetric,
  getStructuredLogger,
  getMetricReport,
};
