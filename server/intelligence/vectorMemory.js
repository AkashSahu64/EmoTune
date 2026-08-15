class VectorMemory {
  constructor() {
    this.embeddings = new Map();
    this.index = [];
    this.capacity = 10000;
  }

  async store(key, data, metadata = {}) {
    const id = key || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const embedding = this._generateEmbedding(data);
    const entry = {
      id,
      embedding,
      data: typeof data === 'string' ? data : JSON.stringify(data),
      metadata,
      timestamp: Date.now(),
    };
    this.embeddings.set(id, entry);
    this.index.push(id);
    if (this.index.length > this.capacity) {
      const oldest = this.index.shift();
      this.embeddings.delete(oldest);
    }
    return id;
  }

  async search(query, limit = 5, threshold = 0.3) {
    const queryEmb = this._generateEmbedding(query);
    const results = [];
    for (const [id, entry] of this.embeddings) {
      const similarity = this._cosineSimilarity(queryEmb, entry.embedding);
      if (similarity >= threshold) {
        results.push({ id, data: entry.data, metadata: entry.metadata, similarity, timestamp: entry.timestamp });
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  async recall(id) {
    return this.embeddings.get(id) || null;
  }

  async forget(id) {
    this.embeddings.delete(id);
    this.index = this.index.filter(i => i !== id);
  }

  async forgetBefore(timestamp) {
    for (const [id, entry] of this.embeddings) {
      if (entry.timestamp < timestamp) this.forget(id);
    }
  }

  getStats() {
    return {
      size: this.embeddings.size,
      capacity: this.capacity,
      usagePercent: Math.round((this.embeddings.size / this.capacity) * 100),
    };
  }

  _generateEmbedding(text) {
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    const chars = str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const freq = {};
    for (const c of chars) {
      freq[c] = (freq[c] || 0) + 1;
    }
    const words = Object.keys(freq).sort();
    const dims = 64;
    const vec = new Array(dims).fill(0);
    for (let i = 0; i < words.length && i < 50; i++) {
      const word = words[i];
      const hash = this._hash(word);
      for (let j = 0; j < dims; j++) {
        vec[j] += (hash >> (j % 8)) & 1 ? freq[word] : -freq[word];
      }
    }
    const magnitude = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map(v => v / magnitude);
  }

  _hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

module.exports = new VectorMemory();
