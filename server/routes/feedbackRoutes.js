const express = require('express');
const router = express.Router();
const { recordFeedback } = require('../controllers/feedbackController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, recordFeedback);

module.exports = router;
