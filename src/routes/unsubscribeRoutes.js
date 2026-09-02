const express = require('express');
const router = express.Router();
const UnsubscribeController = require('../controllers/unsubscribeController');

// Public route: GET /unsubscribe/:token
router.get('/:token', UnsubscribeController.handleUnsubscribe);

module.exports = router;