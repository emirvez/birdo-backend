const { Router } = require('express');
const authRateLimiter = require('../middleware/authRateLimiter');
const { googleLogin, refreshAccessToken, logout } = require('../controllers/authController');

const router = Router();

router.post('/google', authRateLimiter, googleLogin);
router.post('/refresh', authRateLimiter, refreshAccessToken);

router.post('/logout', logout);

module.exports = router;
