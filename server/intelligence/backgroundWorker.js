const { logger } = require('../core/logger');

const QUEUES = {
  ANALYSIS: 'analysis',
  SNAPSHOT: 'snapshot',
  EMBEDDING: 'embedding',
  MEMORY: 'memory',
  PREDICTION: 'prediction',
  ANALYTICS: 'analytics',
};

class BackgroundWorker {
  constructor() {
    this.queues = new Map();
    this.processing = new Map();
    this.results = new Map();
    for (const q of Object.values(QUEUES)) {
      this.queues.set(q, []);
      this.processing.set(q, false);
    }
    this.handlers = new Map();
    this.stats = { queued: 0, processed: 0, failed: 0, avgTime: 0 };
  }

  register(queue, handler) {
    this.handlers.set(queue, handler);
  }

  enqueue(queue, task) {
    if (!this.queues.has(queue)) return;
    this.queues.get(queue).push({
      ...task,
      id: task.id || `${queue}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      enqueuedAt: Date.now(),
    });
    this.stats.queued++;
    this._processQueue(queue);
  }

  async _processQueue(queue) {
    if (this.processing.get(queue)) return;
    const q = this.queues.get(queue);
    if (!q || q.length === 0) return;
    this.processing.set(queue, true);
    while (q.length > 0) {
      const task = q.shift();
      const handler = this.handlers.get(queue);
      if (handler) {
        const start = Date.now();
        try {
          const result = await handler(task);
          this.results.set(task.id, { status: 'completed', result, completedAt: Date.now() });
          this.stats.processed++;
          const elapsed = Date.now() - start;
          this.stats.avgTime = (this.stats.avgTime * (this.stats.processed - 1) + elapsed) / this.stats.processed;
        } catch (err) {
          logger.error(`Worker failed for ${queue}:${task.id}`, { error: err.message });
          this.results.set(task.id, { status: 'failed', error: err.message, failedAt: Date.now() });
          this.stats.failed++;
        }
      }
    }
    this.processing.set(queue, false);
  }

  getResult(id) {
    return this.results.get(id) || null;
  }

  getQueueLength(queue) {
    return this.queues.get(queue)?.length || 0;
  }

  getStats() {
    return {
      ...this.stats,
      queueLengths: Object.fromEntries(
        Array.from(this.queues.entries()).map(([k, v]) => [k, v.length])
      ),
      processing: Object.fromEntries(
        Array.from(this.processing.entries()).map(([k, v]) => [k, v])
      ),
    };
  }

  async flush() {
    for (const q of Object.values(QUEUES)) {
      this.queues.set(q, []);
      this.processing.set(q, false);
    }
    this.results.clear();
  }
}

const worker = new BackgroundWorker();
worker.QUEUES = QUEUES;

module.exports = worker;
