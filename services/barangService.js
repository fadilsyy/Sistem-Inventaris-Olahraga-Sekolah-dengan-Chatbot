const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const AppError = require('../utils/AppError');

const VALID_KATEGORI = ['Sport', 'Non-Sport'];
const VALID_KONDISI = ['Baik', 'Cukup', 'Rusak'];

function validatePayload({ kode_barang, nama_barang, kategori, satuan, stok_sistem, kondisi, deskripsi }) {
  const cleanKode = kode_barang ? String(kode_barang).trim().toUpperCase() : '';
  const cleanNama = nama_barang ? String(nama_barang).trim() : '';
  const cleanKategori = kategori ? String(kategori).trim() : '';
  const cleanSatuan = satuan ? String(satuan).trim() : '';
  const cleanKondisi = kondisi ? String(kondisi).trim() : 'Baik';
  const cleanDeskripsi = deskripsi ? String(deskripsi).trim() : '';

  if (!cleanKode || !cleanNama || !cleanSatuan) {
    throw new AppError('Kode barang, nama barang, dan satuan wajib diisi.', 400);
  }

  if (!VALID_KATEGORI.includes(cleanKategori)) {
    throw new AppError('Kategori harus bernilai Sport atau Non-Sport.', 400);
  }

  if (!VALID_KONDISI.includes(cleanKondisi)) {
    throw new AppError('Kondisi barang tidak valid (pilihan: Baik, Cukup, Rusak).', 400);
  }

  const stokNum = Number(stok_sistem);
  if (!Number.isInteger(stokNum) || stokNum < 0) {
    throw new AppError('Jumlah stok sistem harus berupa bilangan bulat minimal 0.', 400);
  }

  return {
    kode_barang: cleanKode,
    nama_barang: cleanNama,
    kategori: cleanKategori,
    satuan: cleanSatuan,
    stok_sistem: stokNum,
    kondisi: cleanKondisi,
    deskripsi: cleanDeskripsi
  };
}

async function listBarang(filters = {}) {
  const items = await barangModel.findAll(filters);

  const summary = items.reduce(
    (acc, item) => {
      acc.total_jenis += 1;
      acc.total_unit_aset += item.stok_sistem;
      acc.total_unit_tersedia += item.stok_tersedia;
      acc.total_unit_dipinjam += item.stok_dipinjam;
      if (item.kondisi === 'Rusak') acc.total_rusak += 1;
      return acc;
    },
    {
      total_jenis: 0,
      total_unit_aset: 0,
      total_unit_tersedia: 0,
      total_unit_dipinjam: 0,
      total_rusak: 0
    }
  );

  return { items, summary };
}

async function getBarangById(id) {
  const item = await barangModel.findById(id);
  if (!item) {
    throw new AppError('Data barang inventaris tidak ditemukan.', 404);
  }
  return item;
}

async function createBarang(payload, userId) {
  const clean = validatePayload(payload);

  const existingKode = await barangModel.findByKode(clean.kode_barang);
  if (existingKode) {
    throw new AppError(`Kode barang "${clean.kode_barang}" sudah digunakan oleh "${existingKode.nama_barang}".`, 409);
  }

  const created = await barangModel.create(clean);

  await stokModel.createMovement({
    barang_id: created.id,
    user_id: userId,
    tipe: 'CREATE',
    jumlah: created.stok_sistem,
    stok_sebelum: 0,
    stok_sesudah: created.stok_sistem,
    keterangan: `Pendaftaran item baru (${created.kategori}, kondisi ${created.kondisi}, stok awal ${created.stok_sistem} ${created.satuan})`
  });

  return created;
}

async function updateBarang(id, payload, userId) {
  const existing = await getBarangById(id);
  const clean = validatePayload(payload);

  if (clean.stok_sistem < existing.stok_dipinjam) {
    throw new AppError(
      `Total stok sistem (${clean.stok_sistem}) tidak boleh lebih kecil dari jumlah unit yang sedang dipinjam (${existing.stok_dipinjam} ${existing.satuan}).`,
      400
    );
  }

  if (clean.kode_barang !== existing.kode_barang) {
    const duplicateKode = await barangModel.findByKode(clean.kode_barang);
    if (duplicateKode && duplicateKode.id !== id) {
      throw new AppError(`Kode barang "${clean.kode_barang}" sudah dipakai barang lain.`, 409);
    }
  }

  const updated = await barangModel.update(id, clean);

  // Rangkum atribut yang berubah untuk audit log
  const perubahan = [];
  if (existing.kode_barang !== updated.kode_barang) {
    perubahan.push(`Kode: ${existing.kode_barang} → ${updated.kode_barang}`);
  }
  if (existing.nama_barang !== updated.nama_barang) {
    perubahan.push(`Nama: "${existing.nama_barang}" → "${updated.nama_barang}"`);
  }
  if (existing.kategori !== updated.kategori) {
    perubahan.push(`Kategori: ${existing.kategori} → ${updated.kategori}`);
  }
  if (existing.kondisi !== updated.kondisi) {
    perubahan.push(`Kondisi: ${existing.kondisi} → ${updated.kondisi}`);
  }
  if (existing.stok_sistem !== updated.stok_sistem) {
    perubahan.push(`Koreksi Total Stok: ${existing.stok_sistem} → ${updated.stok_sistem} ${updated.satuan}`);
  }
  if ((existing.deskripsi || '') !== (updated.deskripsi || '')) {
    perubahan.push('Deskripsi diperbarui');
  }

  const selisihStok = Math.abs(updated.stok_sistem - existing.stok_sistem);
  const catatanAudit =
    perubahan.length > 0
      ? `Edit data barang (${perubahan.join('; ')})`
      : 'Pembaruan data barang tanpa perubahan nilai utama';

  await stokModel.createMovement({
    barang_id: updated.id,
    user_id: userId,
    tipe: 'UPDATE',
    jumlah: selisihStok,
    stok_sebelum: existing.stok_sistem,
    stok_sesudah: updated.stok_sistem,
    keterangan: catatanAudit
  });

  return updated;
}

async function updateKondisiBarang(id, kondisi, userId) {
  const existing = await getBarangById(id);
  const cleanKondisi = kondisi ? String(kondisi).trim() : '';

  if (!VALID_KONDISI.includes(cleanKondisi)) {
    throw new AppError('Kondisi fisik tidak valid (pilihan: Baik, Cukup, Rusak).', 400);
  }

  if (existing.kondisi === cleanKondisi) {
    return existing;
  }

  const updated = await barangModel.updateKondisi(id, cleanKondisi);

  await stokModel.createMovement({
    barang_id: updated.id,
    user_id: userId,
    tipe: 'STATUS',
    jumlah: 0,
    stok_sebelum: existing.stok_sistem,
    stok_sesudah: updated.stok_sistem,
    keterangan: `Perubahan kondisi fisik: ${existing.kondisi} → ${cleanKondisi}`
  });

  return updated;
}

module.exports = {
  listBarang,
  getBarangById,
  createBarang,
  updateBarang,
  updateKondisiBarang
};