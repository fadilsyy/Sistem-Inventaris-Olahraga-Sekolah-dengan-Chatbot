const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const AppError = require('../utils/AppError');

const VALID_TIPE = ['IN', 'OUT', 'PINJAM', 'KEMBALI', 'CREATE', 'UPDATE', 'STATUS'];

function parsePositiveInteger(value, fieldLabel) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError(`${fieldLabel} harus berupa bilangan bulat lebih dari 0.`, 400);
  }
  return num;
}

function parseNonNegativeInteger(value, fieldLabel) {
  if (value === undefined || value === null || value === '') return 0;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new AppError(`${fieldLabel} harus berupa bilangan bulat minimal 0.`, 400);
  }
  return num;
}

function buildAlasanKeluar({ alasan_template, keterangan_lainnya, keterangan }) {
  const template = alasan_template ? String(alasan_template).trim() : '';
  const custom = keterangan_lainnya ? String(keterangan_lainnya).trim() : '';
  const fallback = keterangan ? String(keterangan).trim() : '';

  if (template) {
    if (template === 'Lainnya') {
      if (!custom) {
        throw new AppError('Keterangan tambahan wajib diisi jika memilih alasan "Lainnya".', 400);
      }
      return `Lainnya: ${custom}`;
    }
    return custom ? `${template} (${custom})` : template;
  }

  if (!fallback) {
    throw new AppError('Alasan pengurangan / barang keluar wajib dipilih atau diisi.', 400);
  }

  return fallback;
}

async function catatBarangMasuk({ barang_id, jumlah, keterangan }, userId) {
  if (!barang_id) {
    throw new AppError('Silakan pilih barang inventaris terlebih dahulu.', 400);
  }

  const qty = parsePositiveInteger(jumlah, 'Jumlah barang masuk');
  const cleanKeterangan = keterangan ? String(keterangan).trim() : '';

  if (!cleanKeterangan) {
    throw new AppError(
      'Sumber atau keterangan barang masuk wajib diisi (misal: pengadaan baru, donasi, atau hibah).',
      400
    );
  }

  const barang = await barangModel.findById(barang_id);
  if (!barang) {
    throw new AppError('Barang inventaris tidak ditemukan.', 404);
  }

  const stokSebelum = barang.stok_sistem;
  const stokSesudah = stokSebelum + qty;

  // Unit masuk baru otomatis tercatat pada kondisi Baik
  const nextCounts = {
    stok_baik: (barang.stok_baik || 0) + qty,
    stok_cukup: barang.stok_cukup || 0,
    stok_rusak: barang.stok_rusak || 0
  };

  const updatedBarang = await stokModel.updateBarangStockOptimistic(
    barang.id,
    stokSebelum,
    stokSesudah,
    nextCounts
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
      keterangan: `${cleanKeterangan} (+${qty} unit Baik)`
    });

    return {
      movement,
      barang: {
        ...updatedBarang,
        stok_tersedia: Math.max(0, updatedBarang.stok_sistem - (updatedBarang.stok_dipinjam || 0))
      }
    };
  } catch (err) {
    await stokModel
      .updateBarangStockOptimistic(barang.id, stokSesudah, stokSebelum, {
        stok_baik: barang.stok_baik || 0,
        stok_cukup: barang.stok_cukup || 0,
        stok_rusak: barang.stok_rusak || 0
      })
      .catch(() => {});
    throw err;
  }
}

async function catatBarangKeluar(
  {
    barang_id,
    jumlah_baik,
    jumlah_cukup,
    jumlah_rusak,
    alasan_template,
    keterangan_lainnya,
    keterangan
  },
  userId
) {
  if (!barang_id) {
    throw new AppError('Silakan pilih barang inventaris terlebih dahulu.', 400);
  }

  const qBaik = parseNonNegativeInteger(jumlah_baik, 'Jumlah unit kondisi Baik');
  const qCukup = parseNonNegativeInteger(jumlah_cukup, 'Jumlah unit kondisi Cukup');
  const qRusak = parseNonNegativeInteger(jumlah_rusak, 'Jumlah unit kondisi Rusak');
  const qty = qBaik + qCukup + qRusak;

  if (qty <= 0) {
    throw new AppError(
      'Centang minimal satu kondisi barang keluar dan masukkan jumlah unit minimal 1.',
      400
    );
  }

  const cleanAlasan = buildAlasanKeluar({ alasan_template, keterangan_lainnya, keterangan });

  const barang = await barangModel.findById(barang_id);
  if (!barang) {
    throw new AppError('Barang inventaris tidak ditemukan.', 404);
  }

  if (qBaik > (barang.stok_baik || 0)) {
    throw new AppError(
      `Unit keluar kondisi Baik (${qBaik}) melebihi stok Baik yang ada (${barang.stok_baik} ${barang.satuan}).`,
      400
    );
  }
  if (qCukup > (barang.stok_cukup || 0)) {
    throw new AppError(
      `Unit keluar kondisi Cukup (${qCukup}) melebihi stok Cukup yang ada (${barang.stok_cukup} ${barang.satuan}).`,
      400
    );
  }
  if (qRusak > (barang.stok_rusak || 0)) {
    throw new AppError(
      `Unit keluar kondisi Rusak (${qRusak}) melebihi stok Rusak yang ada (${barang.stok_rusak} ${barang.satuan}).`,
      400
    );
  }

  const dipinjamSaatIni = barang.stok_dipinjam || 0;
  const tersediaDiRak = Math.max(0, barang.stok_sistem - dipinjamSaatIni);

  if (qty > tersediaDiRak) {
    throw new AppError(
      `Total unit keluar (${qty} ${barang.satuan}) melebihi stok tersedia di rak (${tersediaDiRak} ${barang.satuan}; ${dipinjamSaatIni} sedang dipinjam).`,
      400
    );
  }

  const stokSebelum = barang.stok_sistem;
  const stokSesudah = stokSebelum - qty;

  const nextCounts = {
    stok_baik: (barang.stok_baik || 0) - qBaik,
    stok_cukup: (barang.stok_cukup || 0) - qCukup,
    stok_rusak: (barang.stok_rusak || 0) - qRusak
  };

  const updatedBarang = await stokModel.updateBarangStockOptimistic(
    barang.id,
    stokSebelum,
    stokSesudah,
    nextCounts
  );

  if (!updatedBarang) {
    throw new AppError(
      'Terjadi perubahan stok bersamaan oleh proses lain. Silakan muat ulang dan coba lagi.',
      409
    );
  }

  const rincianKondisi = [];
  if (qRusak > 0) rincianKondisi.push(`${qRusak} Rusak`);
  if (qCukup > 0) rincianKondisi.push(`${qCukup} Cukup`);
  if (qBaik > 0) rincianKondisi.push(`${qBaik} Baik`);

  const catatanAudit = `${cleanAlasan} [Kondisi keluar: ${rincianKondisi.join(', ')}]`;

  try {
    const movement = await stokModel.createMovement({
      barang_id: barang.id,
      user_id: userId,
      tipe: 'OUT',
      jumlah: qty,
      stok_sebelum: stokSebelum,
      stok_sesudah: stokSesudah,
      keterangan: catatanAudit
    });

    return {
      movement,
      barang: {
        ...updatedBarang,
        stok_tersedia: Math.max(0, updatedBarang.stok_sistem - (updatedBarang.stok_dipinjam || 0))
      }
    };
  } catch (err) {
    await stokModel
      .updateBarangStockOptimistic(barang.id, stokSesudah, stokSebelum, {
        stok_baik: barang.stok_baik || 0,
        stok_cukup: barang.stok_cukup || 0,
        stok_rusak: barang.stok_rusak || 0
      })
      .catch(() => {});
    throw err;
  }
}

async function listRiwayatStok({ search = '', tipe = '', barang_id = '', startDate = '', endDate = '' } = {}) {
  const cleanTipe = tipe ? String(tipe).trim().toUpperCase() : '';
  if (cleanTipe && !VALID_TIPE.includes(cleanTipe)) {
    throw new AppError(`Filter tipe aktivitas tidak valid. Pilihan: ${VALID_TIPE.join(', ')}.`, 400);
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
      if (row.tipe === 'PINJAM') acc.total_unit_pinjam += row.jumlah;
      return acc;
    },
    { total_transaksi: 0, total_unit_masuk: 0, total_unit_keluar: 0, total_unit_pinjam: 0 }
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