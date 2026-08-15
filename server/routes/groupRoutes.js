const express = require('express');
const router = express.Router();
const { createGroup, getGroups, addMember, removeMember } = require('../controllers/groupController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, createGroup);
router.get('/', authMiddleware, getGroups);
router.post('/add-member', authMiddleware, addMember);
router.post('/remove-member', authMiddleware, removeMember);

module.exports = router;
