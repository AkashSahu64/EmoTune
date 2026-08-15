const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticate } = require('../middleware/authMiddleware');

router.get(
  '/',
  authenticate,
  sessionController.getSessions
);

router.get(
  '/:sessionId',
  authenticate,
  sessionController.getSession
);

router.delete(
  '/:sessionId',
  authenticate,
  sessionController.terminateSession
);

router.delete(
  '/',
  authenticate,
  sessionController.terminateAllSessions
);

router.post(
  '/keep-alive',
  authenticate,
  sessionController.keepAlive
);

module.exports = router;
