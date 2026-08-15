const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.use(authMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const metrics = await analyticsService.getDashboardMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/accuracy', async (req, res) => {
  try {
    const { type, period } = req.query;
    const report = await analyticsService.getAccuracyReport(type, parseInt(period) || 24);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/providers', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await analyticsService.getProviderHealthReport(parseInt(period) || 24);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/latency', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await analyticsService.getLatencyReport(parseInt(period) || 24);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cache', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await analyticsService.getCacheHitRate(parseInt(period) || 24);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cost', async (req, res) => {
  try {
    const { period } = req.query;
    const report = await analyticsService.getCostReport(parseInt(period) || 24);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
