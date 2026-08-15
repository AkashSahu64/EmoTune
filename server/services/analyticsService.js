const events = [];

class AnalyticsService {
  trackEvent(event) {
    const entry = {
      ...event,
      timestamp: new Date(),
    };
    events.push(entry);
    if (events.length > 10000) events.shift();
    return entry;
  }

  getEvents(userId, limit = 50) {
    return events.filter(e => e.userId === userId).slice(-limit);
  }

  getStats(userId) {
    const userEvents = events.filter(e => e.userId === userId);
    return {
      total: userEvents.length,
      byType: userEvents.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

module.exports = new AnalyticsService();
