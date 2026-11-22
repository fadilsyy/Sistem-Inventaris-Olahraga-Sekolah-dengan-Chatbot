const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protectApi);
router.get('/summary', dashboardController.getSummary);

module.exports = router;