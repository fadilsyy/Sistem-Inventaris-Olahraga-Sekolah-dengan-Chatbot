const stokService = require('../services/stokService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const recordMasuk = asyncHandler(async (req, res) => {
  const { barang_id, jumlah, keterangan } = req.body;
  const result = await stokService.catatBarangMasuk({ barang_id, jumlah, keterangan }, req.user.id);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang masuk berhasil dicatat. Stok "${result.barang.nama_barang}" bertambah menjadi ${result.barang.stok_sistem} ${result.barang.satuan}.`,
    data: result
  });
});

const recordKeluar = asyncHandler(async (req, res) => {
  const { barang_id, jumlah, keterangan } = req.body;
  const result = await stokService.catatBarangKeluar({ barang_id, jumlah, keterangan }, req.user.id);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang keluar berhasil dicatat. Sisa stok "${result.barang.nama_barang}" sekarang ${result.barang.stok_sistem} ${result.barang.satuan}.`,
    data: result
  });
});

const getRiwayat = asyncHandler(async (req, res) => {
  const { search, tipe, barang_id, startDate, endDate } = req.query;
  const { items, summary } = await stokService.listRiwayatStok({
    search,
    tipe,
    barang_id,
    startDate,
    endDate
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Riwayat pergerakan stok berhasil diambil.',
    data: items,
    meta: summary
  });
});

module.exports = {
  recordMasuk,
  recordKeluar,
  getRiwayat
};