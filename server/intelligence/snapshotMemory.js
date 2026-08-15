const SNAPSHOT_INTERVAL = 10;
const MAX_SNAPSHOTS = 20;

class SnapshotMemory {
  constructor(interval = SNAPSHOT_INTERVAL, maxSnapshots = MAX_SNAPSHOTS) {
    this.interval = interval;
    this.maxSnapshots = maxSnapshots;
  }

  shouldSnapshot(messageIndex) {
    return messageIndex > 0 && messageIndex % this.interval === 0;
  }

  createSnapshot({ messages, analysis }) {
    const recent = messages.slice(-this.interval);
    return {
      timestamp: Date.now(),
      messageCount: messages.length,
      summary: this._generateSummary(recent, analysis),
      emotion: {
        current: analysis.currentEmotion?.emotion,
        trend: analysis.emotionTrend,
        dominant: analysis.dominantEmotion,
        timeline: (analysis.emotionTimeline || []).slice(-5),
      },
      topics: {
        current: analysis.currentTopic,
        history: (analysis.topics || []).slice(0, 5),
        trend: analysis.topicTrend,
      },
      conversationState: analysis.conversationState,
      relationship: {
        type: analysis.relationshipType,
        score: analysis.relationshipScore,
      },
      momentum: analysis.momentum,
      pendingQuestions: this._extractQuestions(recent),
      importantEvents: this._extractEvents(recent),
      participants: this._extractParticipants(recent),
      messagePreviews: recent.slice(-3).map(m => ({
        text: (m.text || '').slice(0, 100),
        emotion: m.emotion,
        timestamp: m.timestamp,
      })),
    };
  }

  getContext(snapshots, count = 3) {
    if (!snapshots?.length) return null;
    const recent = snapshots.slice(-count);
    return {
      totalSnapshots: snapshots.length,
      totalMessages: recent[recent.length - 1]?.messageCount || 0,
      recentSnapshots: recent.map(s => ({
        summary: s.summary,
        emotion: s.emotion,
        topics: s.topics,
        state: s.conversationState,
        relationship: s.relationship,
      })),
      emotionProgression: recent.map(s => s.emotion.current).filter(Boolean),
      topicProgression: recent.map(s => s.topics.current).filter(Boolean),
      stateProgression: recent.map(s => s.conversationState).filter(Boolean),
      pendingQuestions: recent.flatMap(s => s.pendingQuestions || []).slice(-5),
    };
  }

  compressForPrompt(snapshots, count = 3) {
    const context = this.getContext(snapshots, count);
    if (!context) return '';
    const parts = [];
    for (const s of context.recentSnapshots) {
      const lines = [`[Summary: ${s.summary || 'N/A'}]`];
      if (s.emotion?.current) lines.push(`[Mood: ${s.emotion.current}, Trend: ${s.emotion.trend || 'stable'}]`);
      if (s.topics?.current) lines.push(`[Topic: ${s.topics.current}]`);
      if (s.state) lines.push(`[State: ${s.state}]`);
      if (s.relationship?.type && s.relationship.type !== 'unknown') lines.push(`[Relation: ${s.relationship.type}]`);
      parts.push(lines.join(' '));
    }
    return parts.join('\n');
  }

  _generateSummary(messages, analysis) {
    if (!messages?.length) return '';
    const text = messages.map(m => m.text || '').join(' ').slice(0, 200);
    const emotion = analysis.currentEmotion?.emotion || 'neutral';
    const topic = analysis.currentTopic || 'general';
    const state = analysis.conversationState || 'small_talk';
    return `${topic} discussion, ${state} mood ${emotion}: ${text.slice(0, 100)}`;
  }

  _extractQuestions(messages) {
    return messages
      .filter(m => (m.text || '').includes('?'))
      .map(m => ({ question: (m.text || '').slice(0, 120), timestamp: m.timestamp }))
      .slice(-3);
  }

  _extractEvents(messages) {
    const events = [];
    for (const m of messages) {
      const text = (m.text || '').toLowerCase();
      for (const word of ['birthday', 'anniversary', 'party', 'meeting', 'appointment', 'deadline', 'exam', 'interview', 'wedding', 'trip', 'vacation', 'event']) {
        if (text.includes(word)) {
          events.push({ event: word, context: (m.text || '').slice(0, 80), timestamp: m.timestamp });
          break;
        }
      }
    }
    return events.slice(-5);
  }

  _extractParticipants(messages) {
    const participants = new Set();
    for (const m of messages) {
      if (m.from) participants.add(m.from);
      if (m.to) participants.add(m.to);
    }
    return Array.from(participants);
  }
}

module.exports = new SnapshotMemory();
