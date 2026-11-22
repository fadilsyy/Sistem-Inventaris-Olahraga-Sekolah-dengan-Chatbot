const express = require('express');
const peminjamanController = require('../controllers/peminjamanController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protectApi);

router.get('/', peminjamanController.getActive);
router.post('/', peminjamanController.createPinjam);
router.patch('/:id/kembali', peminjamanController.returnPinjam);

module.exports = router;