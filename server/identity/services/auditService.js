const AuditEvent = require('../models/AuditEvent');
const { IDENTITY_CONFIG } = require('../config/identityConfig');

const AuditService = {
  async query(filters = {}) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.severity) query.severity = filters.severity;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }
    if (filters.success !== undefined) query.success = filters.success;

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AuditEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')
        .lean(),
      AuditEvent.countDocuments(query),
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserAuditTrail(userId, limit = 50) {
    return AuditEvent.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  },

  async getSecurityEvents(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return AuditEvent.find({
      timestamp: { $gte: since },
      severity: { $in: ['warning', 'critical'] },
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .populate('userId', 'username email')
      .lean();
  },

  async getEventStats(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const stats = await AuditEvent.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' },
      }},
      { $sort: { count: -1 } },
    ]);

    return stats;
  },

  async cleanupOldEvents() {
    const retention = IDENTITY_CONFIG.audit.retentionDays;
    const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000);
    const result = await AuditEvent.deleteMany({ timestamp: { $lt: cutoff } });
    return { deleted: result.deletedCount };
  },
};

module.exports = AuditService;
