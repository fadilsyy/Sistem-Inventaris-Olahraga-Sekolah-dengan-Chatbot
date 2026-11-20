const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const AppError = require('../utils/AppError');

const VALID_TIPE = ['IN', 'OUT', 'OPNAME'];

function parsePositiveInteger(value, fieldLabel) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${fieldLabel} harus berupa bilangan bulat lebih dari 0.`, 400);
  }
  return num;
}

async function catatBarangMasuk({ barang_id, jumlah, keterangan }, userId) {
  if (!barang_id) {
    throw new AppError('Silakan pilih barang inventaris terlebih dahulu.', 400);
  }

  const qty = parsePositiveInteger(jumlah, 'Jumlah barang masuk');
  const cleanKeterangan = keterangan ? String(keterangan).trim() : '';

  const barang = await barangModel.findById(barang_id);
  if (!barang) {
    throw new AppError('Barang inventaris tidak ditemukan atau sudah diarsipkan.', 404);
  }

  const stokSebelum = barang.stok_sistem;
  const stokSesudah = stokSebelum + qty;

  const updatedBarang = await stokModel.updateBarangStockOptimistic(
    barang.id,
    stokSebelum,
    stokSesudah
  );

  if (!updatedBarang) {
    throw new AppError(
      'Terjadi perubahan stok bersamaan oleh proses lain. Silakan muat ulang dan coba lagi.',
      409
    );
  }

  try {
    const movement = await stokModel.createMovement({
      barang_id: barang.id,
      user_id: userId,
      tipe: 'IN',
      jumlah: qty,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      keterangan: cleanKeterangan || 'Penambahan stok masuk gudang'
    });

    return {
      movement,
      barang: updatedBarang
    };
  } catch (err) {
    // Kompensasi rollback stok apabila pencatatan riwayat gagal
    await stokModel.updateBarangStockOptimistic(barang.id, stokSesudah, stokSebelum).catch(() => {});
    throw err;
  }
}

async function catatBarangKeluar({ barang_id, jumlah, keterangan }, userId) {
  if (!barang_id) {
    throw new AppError('Silakan pilih barang inventaris terlebih dahulu.', 400);
  }

  const qty = parsePositiveInteger(jumlah, 'Jumlah barang keluar');
  const cleanKeterangan = keterangan ? String(keterangan).trim() : '';

  if (!cleanKeterangan) {
    throw new AppError(
      'Keterangan barang keluar wajib diisi (misal: nama peminjam, kelas, atau kegiatan).',
      400
    );
  }

  const barang = await barangModel.findById(barang_id);
  if (!barang) {
    throw new AppError('Barang inventaris tidak ditemukan atau sudah diarsipkan.', 404);
  }

  if (barang.stok_sistem < qty) {
    throw new AppError(
      `Stok "${barang.nama_barang}" tidak mencukupi. Stok tersedia saat ini: ${barang.stok_sistem} ${barang.satuan}.`,
      400
    );
  }

  const stokSebelum = barang.stok_sistem;
  const stokSesudah = stokSebelum - qty;

  const updatedBarang = await stokModel.updateBarangStockOptimistic(
    barang.id,
    stokSebelum,
    stokSesudah
  );

  if (!updatedBarang) {
    throw new AppError(
      'Terjadi perubahan stok bersamaan oleh proses lain. Silakan muat ulang dan coba lagi.',
      409
    );
  }

  try {
    const movement = await stokModel.createMovement({
      barang_id: barang.id,
      user_id: userId,
      tipe: 'OUT',
      jumlah: qty,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      keterangan: cleanKeterangan
    });

    return {
      movement,
      barang: updatedBarang
    };
  } catch (err) {
    // Kompensasi rollback stok apabila pencatatan riwayat gagal
    await stokModel.updateBarangStockOptimistic(barang.id, stokSesudah, stokSebelum).catch(() => {});
    throw err;
  }
}

async function listRiwayatStok({ search = '', tipe = '', barang_id = '', startDate = '', endDate = '' } = {}) {
  const cleanTipe = tipe ? String(tipe).trim().toUpperCase() : '';
  if (cleanTipe && !VALID_TIPE.includes(cleanTipe)) {
    throw new AppError(`Filter tipe transaksi tidak valid. Pilihan: ${VALID_TIPE.join(', ')}.`, 400);
  }

  if (startDate && endDate && startDate > endDate) {
    throw new AppError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.', 400);
  }

  const rawMovements = await stokModel.findAllMovements({
    tipe: cleanTipe,
    barang_id: barang_id ? String(barang_id).trim() : '',
    startDate: startDate ? String(startDate).trim() : '',
    endDate: endDate ? String(endDate).trim() : ''
  });

  const keyword = search ? String(search).trim().toLowerCase() : '';
  const filtered = keyword
    ? rawMovements.filter((item) => {
        const namaBarang = item.barang?.nama_barang?.toLowerCase() || '';
        const kodeBarang = item.barang?.kode_barang?.toLowerCase() || '';
        const ket = item.keterangan?.toLowerCase() || '';
        const petugas = item.petugas?.nama_pengguna?.toLowerCase() || '';
        return (
          namaBarang.includes(keyword) ||
          kodeBarang.includes(keyword) ||
          ket.includes(keyword) ||
          petugas.includes(keyword)
        );
      })
    : rawMovements;

  const summary = filtered.reduce(
    (acc, row) => {
      acc.total_transaksi += 1;
      if (row.tipe === 'IN') acc.total_unit_masuk += row.jumlah;
      if (row.tipe === 'OUT') acc.total_unit_keluar += row.jumlah;
      return acc;
    },
    { total_transaksi: 0, total_unit_masuk: 0, total_unit_keluar: 0 }
  );

  return {
    items: filtered,
    summary
  };
}

module.exports = {
  catatBarangMasuk,
  catatBarangKeluar,
  listRiwayatStok
};