const { Router } = require('express');
const authenticate = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { proxyChat } = require('../controllers/apiController');

const router = Router();

router.post('/chat/completions', authenticate, rateLimiter, proxyChat);

module.exports = router;
