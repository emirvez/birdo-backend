const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { getMe, getUsage } = require('../controllers/userController');

const router = Router();

router.get('/me', authenticate, getMe);
router.get('/usage', authenticate, getUsage);

module.exports = router;
