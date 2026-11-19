const express = require('express');
const authController = require('../controllers/authController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', protectApi, authController.getMe);

module.exports = router;