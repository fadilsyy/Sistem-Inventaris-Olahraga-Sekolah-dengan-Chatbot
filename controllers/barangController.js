const barangService = require('../services/barangService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const getAll = asyncHandler(async (req, res) => {
  const { search, kategori, kondisi, statusStok } = req.query;
  const { items, summary } = await barangService.listBarang({
    search,
    kategori,
    kondisi,
    statusStok
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Daftar inventaris berhasil diambil.',
    data: items,
    meta: summary
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
  const created = await barangService.createBarang(req.body, req.user.id);
  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang "${created.nama_barang}" berhasil ditambahkan ke inventaris.`,
    data: created
  });
});

const update = asyncHandler(async (req, res) => {
  const updated = await barangService.updateBarang(req.params.id, req.body, req.user.id);
  return sendSuccess(res, {
    statusCode: 200,
    message: `Data barang "${updated.nama_barang}" berhasil diperbarui.`,
    data: updated
  });
});

const updateKondisi = asyncHandler(async (req, res) => {
  const { dari_kondisi, ke_kondisi, jumlah, keterangan } = req.body;
  const updated = await barangService.ubahKondisiBatch(
    req.params.id,
    { dari_kondisi, ke_kondisi, jumlah, keterangan },
    req.user.id
  );
  return sendSuccess(res, {
    statusCode: 200,
    message: `Perubahan kondisi ${jumlah} ${updated.satuan} "${updated.nama_barang}" (${dari_kondisi} → ${ke_kondisi}) berhasil dicatat.`,
    data: updated
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateKondisi
};