const barangModel = require('../models/barangModel');
const AppError = require('../utils/AppError');

const VALID_KATEGORI = ['Sport', 'Non-Sport'];
const VALID_KONDISI = ['Baik', 'Cukup', 'Rusak'];
const VALID_KETERSEDIAAN = ['Tersedia', 'Dipinjam'];

function validateEnum(value, allowedList, fieldName) {
  if (!allowedList.includes(value)) {
    throw new AppError(
      `Nilai ${fieldName} tidak valid. Pilihan yang diizinkan: ${allowedList.join(', ')}.`,
      400
    );
  }
}

async function listBarang(filters = {}) {
  const cleanFilters = {
    search: filters.search ? String(filters.search).trim() : '',
    kategori: filters.kategori ? String(filters.kategori).trim() : '',
    kondisi: filters.kondisi ? String(filters.kondisi).trim() : '',
    ketersediaan: filters.ketersediaan ? String(filters.ketersediaan).trim() : ''
  };

  if (cleanFilters.kategori) {
    validateEnum(cleanFilters.kategori, VALID_KATEGORI, 'Kategori');
  }
  if (cleanFilters.kondisi) {
    validateEnum(cleanFilters.kondisi, VALID_KONDISI, 'Kondisi');
  }
  if (cleanFilters.ketersediaan) {
    validateEnum(cleanFilters.ketersediaan, VALID_KETERSEDIAAN, 'Ketersediaan');
  }

  return barangModel.findAll(cleanFilters);
}

async function getBarangById(id) {
  const barang = await barangModel.findById(id);
  if (!barang) {
    throw new AppError('Data barang inventaris tidak ditemukan.', 404);
  }
  return barang;
}

async function createBarang(input) {
  const kodeBarang = input.kode_barang ? String(input.kode_barang).trim().toUpperCase() : '';
  const namaBarang = input.nama_barang ? String(input.nama_barang).trim() : '';
  const kategori = input.kategori ? String(input.kategori).trim() : '';
  const satuan = input.satuan ? String(input.satuan).trim() : '';
  const kondisi = input.kondisi ? String(input.kondisi).trim() : 'Baik';
  const ketersediaan = input.ketersediaan ? String(input.ketersediaan).trim() : 'Tersedia';
  const deskripsi = input.deskripsi ? String(input.deskripsi).trim() : null;

  if (!kodeBarang || !namaBarang || !kategori || !satuan) {
    throw new AppError('Kode barang, nama barang, kategori, dan satuan wajib diisi.', 400);
  }

  validateEnum(kategori, VALID_KATEGORI, 'Kategori');
  validateEnum(kondisi, VALID_KONDISI, 'Kondisi');
  validateEnum(ketersediaan, VALID_KETERSEDIAAN, 'Ketersediaan');

  const stokSistem = input.stok_sistem !== undefined && input.stok_sistem !== ''
    ? Number(input.stok_sistem)
    : 0;

  if (!Number.isInteger(stokSistem) || stokSistem < 0) {
    throw new AppError('Stok awal harus berupa bilangan bulat minimal 0.', 400);
  }

  // Cek keunikan kode barang sebelum insert
  const existingKode = await barangModel.findByKode(kodeBarang);
  if (existingKode) {
    throw new AppError(`Kode barang "${kodeBarang}" sudah digunakan oleh barang lain.`, 409);
  }

  // Hanya simpan atribut yang sesuai PRD v1.1 (tanpa lokasi penyimpanan)
  return barangModel.create({
    kode_barang: kodeBarang,
    nama_barang: namaBarang,
    kategori,
    satuan,
    stok_sistem: stokSistem,
    kondisi,
    ketersediaan,
    deskripsi
  });
}

async function updateBarang(id, input) {
  const currentBarang = await getBarangById(id);

  const kodeBarang = input.kode_barang ? String(input.kode_barang).trim().toUpperCase() : currentBarang.kode_barang;
  const namaBarang = input.nama_barang ? String(input.nama_barang).trim() : '';
  const kategori = input.kategori ? String(input.kategori).trim() : '';
  const satuan = input.satuan ? String(input.satuan).trim() : '';
  const kondisi = input.kondisi ? String(input.kondisi).trim() : currentBarang.kondisi;
  const ketersediaan = input.ketersediaan ? String(input.ketersediaan).trim() : currentBarang.ketersediaan;
  const deskripsi = input.deskripsi !== undefined ? String(input.deskripsi).trim() || null : currentBarang.deskripsi;

  if (!kodeBarang || !namaBarang || !kategori || !satuan) {
    throw new AppError('Kode barang, nama barang, kategori, dan satuan wajib diisi.', 400);
  }

  validateEnum(kategori, VALID_KATEGORI, 'Kategori');
  validateEnum(kondisi, VALID_KONDISI, 'Kondisi');
  validateEnum(ketersediaan, VALID_KETERSEDIAAN, 'Ketersediaan');

  const stokSistem = input.stok_sistem !== undefined && input.stok_sistem !== ''
    ? Number(input.stok_sistem)
    : currentBarang.stok_sistem;

  if (!Number.isInteger(stokSistem) || stokSistem < 0) {
    throw new AppError('Stok sistem harus berupa bilangan bulat minimal 0.', 400);
  }

  if (kodeBarang !== currentBarang.kode_barang) {
    const duplicate = await barangModel.findByKode(kodeBarang);
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`Kode barang "${kodeBarang}" sudah digunakan oleh barang lain.`, 409);
    }
  }

  return barangModel.update(id, {
    kode_barang: kodeBarang,
    nama_barang: namaBarang,
    kategori,
    satuan,
    stok_sistem: stokSistem,
    kondisi,
    ketersediaan,
    deskripsi
  });
}

async function quickUpdateStatus(id, { kondisi, ketersediaan }) {
  await getBarangById(id);

  const updates = {};

  if (kondisi !== undefined && kondisi !== '') {
    const cleanKondisi = String(kondisi).trim();
    validateEnum(cleanKondisi, VALID_KONDISI, 'Kondisi');
    updates.kondisi = cleanKondisi;
  }

  if (ketersediaan !== undefined && ketersediaan !== '') {
    const cleanKetersediaan = String(ketersediaan).trim();
    validateEnum(cleanKetersediaan, VALID_KETERSEDIAAN, 'Ketersediaan');
    updates.ketersediaan = cleanKetersediaan;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('Minimal satu field status (kondisi atau ketersediaan) wajib dikirim.', 400);
  }

  return barangModel.update(id, updates);
}

async function archiveBarang(id) {
  await getBarangById(id);
  return barangModel.archive(id);
}

module.exports = {
  listBarang,
  getBarangById,
  createBarang,
  updateBarang,
  quickUpdateStatus,
  archiveBarang
};