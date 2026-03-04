const { Router } = require('express');
const express = require('express');
const authenticate = require('../middleware/auth');
const { checkout, portal, webhook } = require('../controllers/stripeController');

const router = Router();

router.post('/create-checkout', authenticate, checkout);
router.post('/portal', authenticate, portal);

// Webhook needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

module.exports = router;
