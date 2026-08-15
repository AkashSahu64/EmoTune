const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  sessionId: { type: String },
  deviceId: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  location: {
    country: String,
    city: String,
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  riskScore: { type: Number },
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

auditEventSchema.index({ userId: 1, timestamp: -1 });
auditEventSchema.index({ action: 1, timestamp: -1 });
auditEventSchema.index({ timestamp: -1 });
auditEventSchema.index({ severity: 1, timestamp: -1 });
auditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
