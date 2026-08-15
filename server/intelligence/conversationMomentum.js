class ConversationMomentum {
  calculate(messages = []) {
    if (!messages.length) return this._empty();
    const timestamps = messages
      .map(m => new Date(m.timestamp || Date.now()).getTime())
      .filter(t => !isNaN(t));
    if (timestamps.length < 2) return this._single();
    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
    const lastInterval = intervals[intervals.length - 1];
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);
    const variance = intervals.reduce((s, v) => s + (v - avgInterval) ** 2, 0) / intervals.length;
    const responseTime = avgInterval;
    const velocity = 3600000 / (avgInterval || 3600000);
    const recent = timestamps.slice(-5);
    const recentIntervals = [];
    for (let i = 1; i < recent.length; i++) {
      recentIntervals.push(recent[i] - recent[i - 1]);
    }
    const recentAvg = recentIntervals.length > 0 ? recentIntervals.reduce((s, v) => s + v, 0) / recentIntervals.length : avgInterval;
    const trend = recentAvg < avgInterval ? 'accelerating' : recentAvg > avgInterval * 1.5 ? 'decelerating' : 'steady';

    const lengths = messages.map(m => (m.text || m || '').length);
    const avgLength = lengths.reduce((s, v) => s + v, 0) / lengths.length;
    const recentLengths = lengths.slice(-5);
    const recentAvgLen = recentLengths.length > 0 ? recentLengths.reduce((s, v) => s + v, 0) / recentLengths.length : avgLength;
    const intensity = recentAvgLen > avgLength * 1.2 ? 'increasing' : recentAvgLen < avgLength * 0.8 ? 'decreasing' : 'stable';

    const pause = lastInterval > 300000;

    const speed = velocity < 12 ? 'slow' : velocity < 60 ? 'moderate' : velocity < 200 ? 'fast' : 'very_fast';

    return {
      speed,
      velocity: Math.round(velocity),
      avgResponseTime: Math.round(avgInterval / 1000),
      lastResponseTime: Math.round(lastInterval / 1000),
      trend,
      intensity,
      isPaused: pause,
      intervalVariance: Math.round(variance) / 1000,
      totalDuration: Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / 1000),
      messageFrequency: Math.round((messages.length / (timestamps[timestamps.length - 1] - timestamps[0]) * 3600000) * 10) / 10,
      isActive: !pause && velocity > 6,
      isExciting: velocity > 100 && intensity === 'increasing',
      isDead: velocity < 3 || pause,
    };
  }

  _empty() {
    return { speed: 'dead', velocity: 0, avgResponseTime: 0, lastResponseTime: 0, trend: 'steady', intensity: 'stable', isPaused: false, totalDuration: 0, messageFrequency: 0, isActive: false, isExciting: false, isDead: true };
  }

  _single() {
    return { speed: 'slow', velocity: 1, avgResponseTime: 0, lastResponseTime: 0, trend: 'steady', intensity: 'stable', isPaused: false, totalDuration: 0, messageFrequency: 0, isActive: false, isExciting: false, isDead: false };
  }
}

module.exports = new ConversationMomentum();
