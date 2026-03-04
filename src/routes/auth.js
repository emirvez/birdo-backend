const { Router } = require('express');
const authRateLimiter = require('../middleware/authRateLimiter');
const { googleLogin, refreshAccessToken } = require('../controllers/authController');

const router = Router();

router.post('/google', authRateLimiter, googleLogin);
router.post('/refresh', authRateLimiter, refreshAccessToken);

module.exports = router;
