const barangService = require('../services/barangService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const getAll = asyncHandler(async (req, res) => {
  const { search, kategori, kondisi, ketersediaan } = req.query;
  const items = await barangService.listBarang({ search, kategori, kondisi, ketersediaan });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Daftar inventaris barang berhasil diambil.',
    data: items,
    meta: {
      total: items.length
    }
  });
});

const getById = asyncHandler(async (req, res) => {
  const item = await barangService.getBarangById(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Detail barang berhasil diambil.',
    data: item
  });
});

const create = asyncHandler(async (req, res) => {
  const createdItem = await barangService.createBarang(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang "${createdItem.nama_barang}" berhasil ditambahkan ke inventaris.`,
    data: createdItem
  });
});

const update = asyncHandler(async (req, res) => {
  const updatedItem = await barangService.updateBarang(req.params.id, req.body);

  return sendSuccess(res, {
    statusCode: 200,
    message: `Data barang "${updatedItem.nama_barang}" berhasil diperbarui.`,
    data: updatedItem
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { kondisi, ketersediaan } = req.body;
  const updatedItem = await barangService.quickUpdateStatus(req.params.id, { kondisi, ketersediaan });

  return sendSuccess(res, {
    statusCode: 200,
    message: `Status barang "${updatedItem.nama_barang}" berhasil diperbarui.`,
    data: updatedItem
  });
});

const remove = asyncHandler(async (req, res) => {
  const archivedItem = await barangService.archiveBarang(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: `Barang "${archivedItem.nama_barang}" berhasil dihapus dari daftar aktif.`,
    data: archivedItem
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  remove
};