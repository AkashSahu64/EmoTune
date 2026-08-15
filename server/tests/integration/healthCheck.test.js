const express = require('express');
const http = require('http');

describe('GET /api/health', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    const app = express();

    app.get('/api/health', async (req, res) => {
      const healthCheck = require('../../core/healthCheck');
      const health = await healthCheck.getHealth();
      res.json({
        status: health.status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mongodb: health.mongodb,
        cache: { status: 'healthy', memoryEntries: 0 },
        redis: health.redis,
        system: health.system,
        connections: health.connections,
        metrics: {},
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function request(method, path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
          });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('returns 200 status', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
  });

  it('response has status, mongodb, uptime fields', async () => {
    const res = await request('GET', '/api/health');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('mongodb');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('cache');
    expect(res.body).toHaveProperty('redis');
    expect(res.body).toHaveProperty('system');
    expect(res.body).toHaveProperty('connections');
    expect(res.body).toHaveProperty('metrics');
  });

  it('response shape matches expected schema', async () => {
    const res = await request('GET', '/api/health');
    const body = res.body;

    expect(body).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        mongodb: expect.objectContaining({
          status: expect.any(String),
        }),
        cache: expect.objectContaining({
          status: expect.any(String),
        }),
        system: expect.objectContaining({
          platform: expect.any(String),
        }),
      })
    );
  });

  it('mongodb status reflects connection state', async () => {
    const res = await request('GET', '/api/health');
    expect(['connected', 'disconnected', 'connecting', 'disconnecting']).toContain(
      res.body.mongodb.status
    );
  });
});
