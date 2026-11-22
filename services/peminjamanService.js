const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const peminjamanModel = require('../models/peminjamanModel');
const AppError = require('../utils/AppError');

async function listActivePeminjaman({ barang_id = '' } = {}) {
  return peminjamanModel.findActive({ barang_id });
}

async function pinjamBarang({ barang_id, peminjam, jumlah, keterangan }, userId) {
  if (!barang_id) {
    throw new AppError('Barang yang akan dipinjam wajib dipilih.', 400);
  }

  const cleanPeminjam = peminjam ? String(peminjam).trim() : '';
  if (!cleanPeminjam) {
    throw new AppError('Nama peminjam / kelas / kegiatan wajib diisi.', 400);
  }

  const qty = Number(jumlah);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new AppError('Jumlah unit dipinjam harus berupa bilangan bulat lebih dari 0.', 400);
  }

  const cleanKet = keterangan ? String(keterangan).trim() : '';

  const barang = await barangModel.findById(barang_id);
  if (!barang) {
    throw new AppError('Barang inventaris tidak ditemukan.', 404);
  }

  const dipinjamSebelum = barang.stok_dipinjam || 0;
  const tersediaSebelum = Math.max(0, barang.stok_sistem - dipinjamSebelum);

  if (qty > tersediaSebelum) {
    throw new AppError(
      `Stok tersedia "${barang.nama_barang}" tidak mencukupi untuk dipinjam. Tersedia di rak: ${tersediaSebelum} ${barang.satuan}.`,
      400
    );
  }

  const dipinjamSesudah = dipinjamSebelum + qty;
  const tersediaSesudah = barang.stok_sistem - dipinjamSesudah;

  const updatedBarang = await stokModel.updateBarangDipinjamOptimistic(
    barang.id,
    dipinjamSebelum,
    dipinjamSesudah
  );

  if (!updatedBarang) {
    throw new AppError(
      'Terjadi pembaruan stok bersamaan oleh proses lain. Silakan coba lagi.',
      409
    );
  }

  try {
    const ticket = await peminjamanModel.create({
      barang_id: barang.id,
      user_id: userId,
      peminjam: cleanPeminjam,
      jumlah: qty,
      keterangan: cleanKet
    });

    await stokModel.createMovement({
      barang_id: barang.id,
      user_id: userId,
      tipe: 'PINJAM',
      jumlah: qty,
      stok_sebelum: tersediaSebelum,
      stok_sesudah: tersediaSesudah,
      keterangan: `Dipinjam oleh ${cleanPeminjam}${cleanKet ? ` — ${cleanKet}` : ''}`
    });

    return {
      ticket,
      barang: {
        ...updatedBarang,
        stok_tersedia: tersediaSesudah
      }
    };
  } catch (err) {
    await stokModel
      .updateBarangDipinjamOptimistic(barang.id, dipinjamSesudah, dipinjamSebelum)
      .catch(() => {});
    throw err;
  }
}

async function kembalikanBarang(peminjamanId, { catatan_kembali } = {}, userId) {
  const ticket = await peminjamanModel.findById(peminjamanId);
  if (!ticket) {
    throw new AppError('Data tiket peminjaman tidak ditemukan.', 404);
  }

  if (ticket.status !== 'DIPINJAM') {
    throw new AppError('Tiket peminjaman ini sudah dikembalikan sebelumnya.', 400);
  }

  const barang = await barangModel.findById(ticket.barang_id);
  if (!barang) {
    throw new AppError('Data barang terkait tidak ditemukan.', 404);
  }

  const returnedTicket = await peminjamanModel.markReturnedOptimistic(peminjamanId);
  if (!returnedTicket) {
    throw new AppError('Transaksi pengembalian sedang diproses atau sudah selesai.', 409);
  }

  const dipinjamSebelum = barang.stok_dipinjam || 0;
  const dipinjamSesudah = Math.max(0, dipinjamSebelum - ticket.jumlah);
  const tersediaSebelum = Math.max(0, barang.stok_sistem - dipinjamSebelum);
  const tersediaSesudah = Math.max(0, barang.stok_sistem - dipinjamSesudah);

  const updatedBarang = await stokModel.updateBarangDipinjamOptimistic(
    barang.id,
    dipinjamSebelum,
    dipinjamSesudah
  );

  const cleanNote = catatan_kembali ? String(catatan_kembali).trim() : '';

  await stokModel.createMovement({
    barang_id: barang.id,
    user_id: userId,
    tipe: 'KEMBALI',
    jumlah: ticket.jumlah,
    stok_sebelum: tersediaSebelum,
    stok_sesudah: tersediaSesudah,
    keterangan: `Dikembalikan oleh ${ticket.peminjam}${cleanNote ? ` (${cleanNote})` : ''}`
  });

  return {
    ticket: returnedTicket,
    barang: updatedBarang
      ? { ...updatedBarang, stok_tersedia: tersediaSesudah }
      : { ...barang, stok_dipinjam: dipinjamSesudah, stok_tersedia: tersediaSesudah }
  };
}

module.exports = {
  listActivePeminjaman,
  pinjamBarang,
  kembalikanBarang
};