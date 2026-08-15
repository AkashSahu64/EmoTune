class EmotionTimeline {
  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  static get EMOTION_WEIGHTS() {
    return {
      joyful: 10, excited: 9, loved: 9, grateful: 8,
      happy: 7, hopeful: 6, romantic: 6, flirty: 5,
      neutral: 4, confused: 3, surprised: 3,
      anxious: 2, worried: 2, bored: 2,
      sad: 1, disappointed: 1, lonely: 1,
      angry: 0, frustrated: 0, annoyed: 0,
      hurt: -1, guilty: -2,
      depressed: -3, hopeless: -3,
    };
  }

  addEntry(timeline, entry) {
    timeline.push({
      emotion: entry.emotion,
      confidence: entry.confidence || 1,
      weight: EmotionTimeline.EMOTION_WEIGHTS[entry.emotion] ?? 4,
      timestamp: entry.timestamp || new Date(),
      messageId: entry.messageId,
      messagePreview: entry.messagePreview?.slice(0, 60),
    });
    if (timeline.length > this.maxEntries) timeline.splice(0, timeline.length - this.maxEntries);
    return timeline;
  }

  getCurrentEmotion(timeline) {
    if (!timeline?.length) return { emotion: 'neutral', confidence: 0, weight: 4 };
    return timeline[timeline.length - 1];
  }

  getTrend(timeline) {
    if (!timeline?.length || timeline.length < 3) return 'stable';
    const recent = timeline.slice(-5);
    const weights = recent.map(e => e.weight);
    const slope = weights[weights.length - 1] - weights[0];
    const variance = Math.sqrt(weights.reduce((s, w, i) => s + (w - (weights.reduce((a, b) => a + b) / weights.length)) ** 2, 0) / weights.length);
    if (slope > 3 && variance < 3) return 'improving';
    if (slope < -3 && variance < 3) return 'declining';
    if (variance > 4) return 'volatile';
    return 'stable';
  }

  getEmotionVolatility(timeline) {
    if (!timeline?.length || timeline.length < 3) return 0;
    const recent = timeline.slice(-5);
    let changes = 0;
    for (let i = 1; i < recent.length; i++) {
      if (Math.abs(recent[i].weight - recent[i - 1].weight) > 3) changes++;
    }
    return changes / Math.min(recent.length, 5);
  }

  getDominantEmotion(timeline, window = 10) {
    if (!timeline?.length) return 'neutral';
    const slice = timeline.slice(-window);
    const freq = {};
    let maxCount = 0, dominant = 'neutral';
    for (const e of slice) {
      freq[e.emotion] = (freq[e.emotion] || 0) + 1;
      if (freq[e.emotion] > maxCount) { maxCount = freq[e.emotion]; dominant = e.emotion; }
    }
    return dominant;
  }

  getEmotionProgression(timeline) {
    if (!timeline?.length) return [];
    return timeline.map(e => ({
      emotion: e.emotion,
      weight: e.weight,
      timestamp: e.timestamp,
    }));
  }

  detectEscalation(timeline) {
    if (!timeline?.length || timeline.length < 2) return false;
    const recent = timeline.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].weight - recent[i - 1].weight > 5) return true;
    }
    return false;
  }

  detectDeescalation(timeline) {
    if (!timeline?.length || timeline.length < 2) return false;
    const recent = timeline.slice(-3);
    for (let i = 1; i < recent.length; i++) {
      if (recent[i - 1].weight - recent[i].weight > 5) return true;
    }
    return false;
  }
}

module.exports = new EmotionTimeline();
