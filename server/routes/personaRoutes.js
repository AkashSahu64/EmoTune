const express = require('express');
const router = express.Router();
const { createPersona, getPersonas, updatePersona, deletePersona, setActivePersona } = require('../controllers/personaController');
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, createPersona);
router.get('/', authMiddleware, getPersonas);
router.patch('/:personaId', authMiddleware, updatePersona);
router.delete('/:personaId', authMiddleware, deletePersona);
router.post('/:personaId/activate', authMiddleware, setActivePersona);

module.exports = router;
