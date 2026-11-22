const express = require('express');
const barangController = require('../controllers/barangController');
const { protectApi } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protectApi);

router.get('/', barangController.getAll);
router.get('/:id', barangController.getById);
router.post('/', barangController.create);
router.put('/:id', barangController.update);
router.patch('/:id/kondisi', barangController.updateKondisi);

module.exports = router;