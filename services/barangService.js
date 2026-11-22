const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const AppError = require('../utils/AppError');

const VALID_KATEGORI = ['Sport', 'Non-Sport'];
const VALID_KONDISI = ['Baik', 'Cukup', 'Rusak'];

const KONDISI_FIELD_MAP = {
  Baik: 'stok_baik',
  Cukup: 'stok_cukup',
  Rusak: 'stok_rusak'
};

function parseNonNegativeInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    throw new AppError(`${label} harus berupa bilangan bulat minimal 0.`, 400);
  }
  return num;
}

function validateBaseFields({ kode_barang, nama_barang, kategori, satuan, deskripsi }) {
  const cleanKode = kode_barang ? String(kode_barang).trim().toUpperCase() : '';
  const cleanNama = nama_barang ? String(nama_barang).trim() : '';
  const cleanKategori = kategori ? String(kategori).trim() : '';
  const cleanSatuan = satuan ? String(satuan).trim() : '';
  const cleanDeskripsi = deskripsi ? String(deskripsi).trim() : '';

  if (!cleanKode || !cleanNama || !cleanSatuan) {
    throw new AppError('Kode barang, nama barang, dan satuan wajib diisi.', 400);
  }

  if (!VALID_KATEGORI.includes(cleanKategori)) {
    throw new AppError('Kategori harus bernilai Sport atau Non-Sport.', 400);
  }

  return {
    kode_barang: cleanKode,
    nama_barang: cleanNama,
    kategori: cleanKategori,
    satuan: cleanSatuan,
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
      acc.total_unit_baik += item.stok_baik;
      acc.total_unit_cukup += item.stok_cukup;
      acc.total_unit_rusak += item.stok_rusak;
      return acc;
    },
    {
      total_jenis: 0,
      total_unit_aset: 0,
      total_unit_tersedia: 0,
      total_unit_dipinjam: 0,
      total_unit_baik: 0,
      total_unit_cukup: 0,
      total_unit_rusak: 0
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
  const base = validateBaseFields(payload);
  const stokAwal = parseNonNegativeInt(payload.stok_sistem, 'Stok awal');

  const existingKode = await barangModel.findByKode(base.kode_barang);
  if (existingKode) {
    throw new AppError(`Kode barang "${base.kode_barang}" sudah digunakan oleh "${existingKode.nama_barang}".`, 409);
  }

  const created = await barangModel.create({
    ...base,
    stok_sistem: stokAwal
  });

  await stokModel.createMovement({
    barang_id: created.id,
    user_id: userId,
    tipe: 'CREATE',
    jumlah: created.stok_sistem,
    stok_sebelum: 0,
    stok_sesudah: created.stok_sistem,
    keterangan: `Pendaftaran item baru (${created.kategori}, stok awal ${created.stok_sistem} ${created.satuan} kondisi Baik)`
  });

  return created;
}

async function updateBarang(id, payload, userId) {
  const existing = await getBarangById(id);
  const base = validateBaseFields(payload);

  const stokBaik = parseNonNegativeInt(payload.stok_baik, 'Jumlah unit Baik');
  const stokCukup = parseNonNegativeInt(payload.stok_cukup, 'Jumlah unit Cukup');
  const stokRusak = parseNonNegativeInt(payload.stok_rusak, 'Jumlah unit Rusak');
  const totalBaru = stokBaik + stokCukup + stokRusak;

  if (totalBaru < existing.stok_dipinjam) {
    throw new AppError(
      `Total stok aset (${totalBaru}) tidak boleh lebih kecil dari jumlah unit yang sedang dipinjam (${existing.stok_dipinjam} ${existing.satuan}).`,
      400
    );
  }

  if (base.kode_barang !== existing.kode_barang) {
    const duplicateKode = await barangModel.findByKode(base.kode_barang);
    if (duplicateKode && duplicateKode.id !== id) {
      throw new AppError(`Kode barang "${base.kode_barang}" sudah dipakai barang lain.`, 409);
    }
  }

  const updated = await barangModel.update(id, {
    ...base,
    stok_baik: stokBaik,
    stok_cukup: stokCukup,
    stok_rusak: stokRusak
  });

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
  if (
    existing.stok_baik !== updated.stok_baik ||
    existing.stok_cukup !== updated.stok_cukup ||
    existing.stok_rusak !== updated.stok_rusak
  ) {
    perubahan.push(
      `Komposisi Kondisi: Baik ${existing.stok_baik}→${updated.stok_baik}, Cukup ${existing.stok_cukup}→${updated.stok_cukup}, Rusak ${existing.stok_rusak}→${updated.stok_rusak}`
    );
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

async function ubahKondisiBatch(id, { dari_kondisi, ke_kondisi, jumlah, keterangan }, userId) {
  const existing = await getBarangById(id);

  const dari = dari_kondisi ? String(dari_kondisi).trim() : '';
  const ke = ke_kondisi ? String(ke_kondisi).trim() : '';

  if (!VALID_KONDISI.includes(dari) || !VALID_KONDISI.includes(ke)) {
    throw new AppError('Pilihan kondisi asal atau tujuan tidak valid (Baik, Cukup, Rusak).', 400);
  }

  if (dari === ke) {
    throw new AppError('Kondisi tujuan harus berbeda dari kondisi asal.', 400);
  }

  const qty = Number(jumlah);
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new AppError('Jumlah unit yang diubah kondisinya harus bilangan bulat minimal 1.', 400);
  }

  const fieldDari = KONDISI_FIELD_MAP[dari];
  const fieldKe = KONDISI_FIELD_MAP[ke];
  const stokAsalTersedia = existing[fieldDari] || 0;

  if (qty > stokAsalTersedia) {
    throw new AppError(
      `Jumlah unit kondisi "${dari}" hanya tersedia ${stokAsalTersedia} ${existing.satuan}.`,
      400
    );
  }

  const cleanKet = keterangan ? String(keterangan).trim() : '';
  if ((ke === 'Cukup' || ke === 'Rusak') && !cleanKet) {
    throw new AppError(
      `Keterangan alasan/kerusakan wajib diisi saat mengubah kondisi unit menjadi "${ke}".`,
      400
    );
  }

  const nextCounts = {
    stok_baik: existing.stok_baik,
    stok_cukup: existing.stok_cukup,
    stok_rusak: existing.stok_rusak
  };
  nextCounts[fieldDari] -= qty;
  nextCounts[fieldKe] += qty;

  const updated = await barangModel.updateKondisiCounts(id, nextCounts);

  const catatanAudit =
    ke === 'Baik'
      ? `Pemulihan kondisi ${qty} ${existing.satuan} (${dari} → Baik)`
      : `Perubahan kondisi ${qty} ${existing.satuan} (${dari} → ${ke}): ${cleanKet}`;

  await stokModel.createMovement({
    barang_id: updated.id,
    user_id: userId,
    tipe: 'STATUS',
    jumlah: qty,
    stok_sebelum: existing.stok_sistem,
    stok_sesudah: updated.stok_sistem,
    keterangan: catatanAudit
  });

  return updated;
}

module.exports = {
  listBarang,
  getBarangById,
  createBarang,
  updateBarang,
  ubahKondisiBatch
};