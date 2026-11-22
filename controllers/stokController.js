const stokService = require('../services/stokService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const recordMasuk = asyncHandler(async (req, res) => {
  const { barang_id, jumlah, keterangan } = req.body;
  const result = await stokService.catatBarangMasuk({ barang_id, jumlah, keterangan }, req.user.id);

  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang masuk berhasil dicatat (+${result.movement.jumlah} ${result.barang.satuan} Baik). Total aset "${result.barang.nama_barang}" menjadi ${result.barang.stok_sistem} ${result.barang.satuan}.`,
    data: result
  });
});

const recordKeluar = asyncHandler(async (req, res) => {
  const {
    barang_id,
    jumlah_baik,
    jumlah_cukup,
    jumlah_rusak,
    alasan_template,
    keterangan_lainnya,
    keterangan
  } = req.body;

  const result = await stokService.catatBarangKeluar(
    {
      barang_id,
      jumlah_baik,
      jumlah_cukup,
      jumlah_rusak,
      alasan_template,
      keterangan_lainnya,
      keterangan
    },
    req.user.id
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: `Barang keluar (${result.movement.jumlah} ${result.barang.satuan}) berhasil dicatat. Sisa stok tersedia "${result.barang.nama_barang}" sekarang ${result.barang.stok_tersedia} ${result.barang.satuan}.`,
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
    message: 'Riwayat aktivitas dan mutasi stok berhasil diambil.',
    data: items,
    meta: summary
  });
});

module.exports = {
  recordMasuk,
  recordKeluar,
  getRiwayat
};