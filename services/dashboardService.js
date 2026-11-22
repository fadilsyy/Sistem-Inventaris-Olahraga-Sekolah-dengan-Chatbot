const barangModel = require('../models/barangModel');
const stokModel = require('../models/stokModel');
const peminjamanModel = require('../models/peminjamanModel');

async function getDashboardOverview() {
  const [allBarang, activePinjam, recentMovements] = await Promise.all([
    barangModel.findAll(),
    peminjamanModel.findActive(),
    stokModel.findAllMovements({ limit: 8 })
  ]);

  const kpi = allBarang.reduce(
    (acc, item) => {
      acc.total_jenis += 1;
      acc.total_unit_aset += item.stok_sistem;
      acc.total_unit_tersedia += item.stok_tersedia;
      acc.total_unit_dipinjam += item.stok_dipinjam;
      acc.total_unit_baik += item.stok_baik;
      acc.total_unit_cukup += item.stok_cukup;
      acc.total_unit_rusak += item.stok_rusak;
      if (item.kategori === 'Sport') acc.jenis_sport += 1;
      if (item.kategori === 'Non-Sport') acc.jenis_nonsport += 1;
      return acc;
    },
    {
      total_jenis: 0,
      total_unit_aset: 0,
      total_unit_tersedia: 0,
      total_unit_dipinjam: 0,
      total_unit_baik: 0,
      total_unit_cukup: 0,
      total_unit_rusak: 0,
      jenis_sport: 0,
      jenis_nonsport: 0,
      total_sesi_pinjam_aktif: activePinjam.length
    }
  );

  const stokMenipis = allBarang
    .filter((b) => b.stok_tersedia <= 2)
    .sort((a, b) => a.stok_tersedia - b.stok_tersedia);

  const kondisiPerluPerhatian = allBarang
    .filter((b) => b.stok_rusak > 0 || b.stok_cukup > 0)
    .sort((a, b) => b.stok_rusak - a.stok_rusak || b.stok_cukup - a.stok_cukup);

  return {
    kpi,
    watchlist: {
      stok_menipis: stokMenipis,
      kondisi_perlu_perhatian: kondisiPerluPerhatian,
      peminjaman_aktif: activePinjam
    },
    recent_movements: recentMovements
  };
}

module.exports = {
  getDashboardOverview
};