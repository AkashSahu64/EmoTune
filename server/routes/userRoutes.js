const express = require('express');
const router = express.Router();
const { searchUsers } = require('../controllers/chatController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const {
  getMe,
  updateProfile,
  updatePreferences,
  changePassword,
  deleteAccount,
  getSessions,
  logoutOtherSessions,
} = require('../controllers/userController');

router.get('/search', authMiddleware, searchUsers);
router.get('/me', authMiddleware, getMe);
router.put('/profile', authMiddleware, updateProfile);
router.put('/preferences', authMiddleware, updatePreferences);
router.put('/password', authMiddleware, changePassword);
router.delete('/account', authMiddleware, deleteAccount);
router.get('/sessions', authMiddleware, getSessions);
router.post('/logout-other', authMiddleware, logoutOtherSessions);

module.exports = router;
