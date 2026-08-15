const express = require('express');
const request = require('supertest');

jest.mock('../../../models/User');
jest.mock('../../../identity/models/Session');
jest.mock('../../../identity/models/LoginHistory');

jest.mock('../../../identity/middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: '507f1f77bcf86cd799439011', sessionId: 'sess_current', roles: ['user'] };
    req.session = { sessionId: 'sess_current', userId: 'user123', isRevoked: false };
    next();
  },
  optionalAuth: (req, res, next) => next(),
  requireRoles: () => (req, res, next) => next(),
}));

const Session = require('../../../identity/models/Session');

const sessionQueryMock = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
};

Session.find.mockReturnValue(sessionQueryMock);

const sessionRoutes = require('../../../identity/routes/sessionRoutes');

const app = express();
app.use(express.json());
app.use('/api/identity/sessions', sessionRoutes);

describe('Session Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionQueryMock.sort.mockReturnThis();
    sessionQueryMock.limit.mockReturnThis();
    sessionQueryMock.lean.mockResolvedValue([]);
    Session.find.mockReturnValue(sessionQueryMock);
  });

  describe('GET /api/identity/sessions', () => {
    it('should return user sessions', async () => {
      sessionQueryMock.lean.mockResolvedValue([
        { sessionId: 'sess_1', userId: 'user123', status: 'active' },
        { sessionId: 'sess_2', userId: 'user123', status: 'active' },
      ]);

      const res = await request(app).get('/api/identity/sessions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sessions).toHaveLength(2);
    });
  });

  describe('GET /api/identity/sessions/:sessionId', () => {
    it('should return a specific session', async () => {
      const mockSession = {
        sessionId: 'sess_1',
        userId: '507f1f77bcf86cd799439011',
        status: 'active',
      };
      Session.findOne.mockResolvedValue(mockSession);

      const res = await request(app).get('/api/identity/sessions/sess_1');

      expect(res.status).toBe(200);
      expect(res.body.data.session.sessionId).toBe('sess_1');
    });

    it('should return 404 for non-existent session', async () => {
      Session.findOne.mockResolvedValue(null);

      const res = await request(app).get('/api/identity/sessions/nonexistent');

      expect(res.status).toBe(404);
    });
  });
});
