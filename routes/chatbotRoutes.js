const express = require('express');
const chatbotController = require('../controllers/chatbotController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protectApi);
router.get('/options', chatbotController.getAssistantOptions);
router.post('/message', chatbotController.askAssistant);

module.exports = router;