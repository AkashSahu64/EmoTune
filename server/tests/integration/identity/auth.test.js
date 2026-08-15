const express = require('express');
const request = require('supertest');

const User = require('../../../models/User');

jest.mock('../../../models/User');
jest.mock('../../../identity/models/Session');
jest.mock('../../../identity/models/LoginHistory');
jest.mock('../../../identity/models/Device');
jest.mock('../../../identity/models/EmailVerification');
jest.mock('../../../identity/models/PasswordReset');
jest.mock('../../../identity/models/PasswordHistory');
jest.mock('../../../identity/models/AuditEvent');

const authRoutes = require('../../../identity/routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/identity/auth', authRoutes);

describe('Auth Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/identity/auth/signup', () => {
    it('should return 400 for invalid payload', async () => {
      const res = await request(app)
        .post('/api/identity/auth/signup')
        .send({ username: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/identity/auth/signup')
        .send({ username: 'testuser', email: 'test@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/identity/auth/login', () => {
    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/identity/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/identity/auth/forgot-password', () => {
    it('should return 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/identity/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/identity/auth/refresh', () => {
    it('should return 400 for missing refresh token', async () => {
      const res = await request(app)
        .post('/api/identity/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
