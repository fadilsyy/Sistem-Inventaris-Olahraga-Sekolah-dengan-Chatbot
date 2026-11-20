const express = require('express');
const stokController = require('../controllers/stokController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protectApi);

router.post('/masuk', stokController.recordMasuk);
router.post('/keluar', stokController.recordKeluar);
router.get('/riwayat', stokController.getRiwayat);

module.exports = router;