const express = require('express');
const { sendChatMessage } = require('../controllers/chatController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// optionalAuth: guests can chat too; if a valid token is present req.user
// is available for logging/future personalization, but it's never required.
router.post('/', optionalAuth, sendChatMessage);

module.exports = router;
