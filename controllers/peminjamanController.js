const peminjamanService = require('../services/peminjamanService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const getActive = asyncHandler(async (req, res) => {
  const { barang_id } = req.query;
  const items = await peminjamanService.listActivePeminjaman({ barang_id });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Daftar peminjaman aktif berhasil diambil.',
    data: items
  });
});

const createPinjam = asyncHandler(async (req, res) => {
  const { barang_id, peminjam, jumlah, keterangan } = req.body;
  const result = await peminjamanService.pinjamBarang(
    { barang_id, peminjam, jumlah, keterangan },
    req.user.id
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: `Peminjaman ${result.ticket.jumlah} ${result.barang.satuan} "${result.barang.nama_barang}" oleh ${result.ticket.peminjam} berhasil dicatat.`,
    data: result
  });
});

const returnPinjam = asyncHandler(async (req, res) => {
  const result = await peminjamanService.kembalikanBarang(
    req.params.id,
    req.body || {},
    req.user.id
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: `Pengembalian ${result.ticket.jumlah} ${result.barang.satuan} "${result.barang.nama_barang}" dari ${result.ticket.peminjam} berhasil dicatat.`,
    data: result
  });
});

module.exports = {
  getActive,
  createPinjam,
  returnPinjam
};