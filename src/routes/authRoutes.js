// ============================================
// AUTHENTICATION ROUTES
// ============================================

const express = require('express');
const { register, login, refresh, getMe } = require('../controllers/authController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', requireAuth, getMe);

module.exports = router;