const enabled = process.env.NODE_ENV !== 'production' && process.env.AUTH_PERF === 'true';

function start(label) {
  if (!enabled) return null;
  return { label, startedAt: process.hrtime.bigint() };
}

function end(span, metadata = {}) {
  if (!span) return 0;
  const durationMs = Number(process.hrtime.bigint() - span.startedAt) / 1e6;
  console.info('[AUTH_PERF]', JSON.stringify({ stage: span.label, durationMs: Number(durationMs.toFixed(2)), ...metadata }));
  return durationMs;
}

module.exports = { enabled, start, end };
