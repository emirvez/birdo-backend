const { Router } = require('express');
const authenticate = require('../middleware/auth');
const { getMe, getUsage, deleteMe } = require('../controllers/userController');

const router = Router();

router.get('/me', authenticate, getMe);
router.get('/usage', authenticate, getUsage);
router.delete('/me', authenticate, deleteMe);

module.exports = router;
