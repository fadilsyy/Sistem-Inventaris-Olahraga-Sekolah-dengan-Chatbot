const dashboardModel = require('../models/dashboardModel');
const stokModel = require('../models/stokModel');

const LOW_STOCK_THRESHOLD = 2;

function hitungPersentase(bagian, total) {
  if (!total || total <= 0) return 0;
  return Math.round((bagian / total) * 100);
}

async function getDashboardSummary() {
  const [activeBarang, recentMovements] = await Promise.all([
    dashboardModel.getAllActiveBarang(),
    stokModel.findAllMovements({ limit: 6 })
  ]);

  const totalJenisBarang = activeBarang.length;

  let totalUnitStok = 0;
  let sportJenis = 0;
  let sportUnit = 0;
  let nonSportJenis = 0;
  let nonSportUnit = 0;

  let kondisiBaik = 0;
  let kondisiCukup = 0;
  let kondisiRusak = 0;

  let statusTersedia = 0;
  let statusDipinjam = 0;

  const watchlist = [];

  for (const item of activeBarang) {
    const stok = Number(item.stok_sistem) || 0;
    totalUnitStok += stok;

    // 1. Agregasi Kategori
    if (item.kategori === 'Non-Sport') {
      nonSportJenis += 1;
      nonSportUnit += stok;
    } else {
      sportJenis += 1;
      sportUnit += stok;
    }

    // 2. Agregasi Kondisi Fisik
    if (item.kondisi === 'Rusak') {
      kondisiRusak += 1;
    } else if (item.kondisi === 'Cukup') {
      kondisiCukup += 1;
    } else {
      kondisiBaik += 1;
    }

    // 3. Agregasi Status Ketersediaan
    if (item.ketersediaan === 'Dipinjam') {
      statusDipinjam += 1;
    } else {
      statusTersedia += 1;
    }

    // 4. Deteksi Item Perlu Perhatian (Stok Habis/Menipis, Rusak, atau Sedang Dipinjam)
    const alasan = [];
    let prioritas = 99;

    if (stok === 0) {
      alasan.push('Stok Habis');
      prioritas = Math.min(prioritas, 1);
    } else if (stok <= LOW_STOCK_THRESHOLD) {
      alasan.push(`Stok Menipis (${stok} ${item.satuan})`);
      prioritas = Math.min(prioritas, 2);
    }

    if (item.kondisi === 'Rusak') {
      alasan.push('Kondisi Rusak');
      prioritas = Math.min(prioritas, 3);
    }

    if (item.ketersediaan === 'Dipinjam') {
      alasan.push('Sedang Dipinjam');
      prioritas = Math.min(prioritas, 4);
    }

    if (alasan.length > 0) {
      watchlist.push({
        id: item.id,
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        kategori: item.kategori,
        stok_sistem: stok,
        satuan: item.satuan,
        kondisi: item.kondisi,
        ketersediaan: item.ketersediaan,
        alasan,
        prioritas
      });
    }
  }

  watchlist.sort((a, b) => a.prioritas - b.prioritas || a.stok_sistem - b.stok_sistem);

  return {
    kpi: {
      total_jenis_barang: totalJenisBarang,
      total_unit_stok: totalUnitStok,
      total_dipinjam: statusDipinjam,
      total_rusak: kondisiRusak,
      total_perlu_perhatian: watchlist.length
    },
    kategori: {
      sport: {
        jenis: sportJenis,
        unit: sportUnit,
        persen: hitungPersentase(sportJenis, totalJenisBarang)
      },
      non_sport: {
        jenis: nonSportJenis,
        unit: nonSportUnit,
        persen: hitungPersentase(nonSportJenis, totalJenisBarang)
      }
    },
    kondisi: {
      baik: {
        count: kondisiBaik,
        persen: hitungPersentase(kondisiBaik, totalJenisBarang)
      },
      cukup: {
        count: kondisiCukup,
        persen: hitungPersentase(kondisiCukup, totalJenisBarang)
      },
      rusak: {
        count: kondisiRusak,
        persen: hitungPersentase(kondisiRusak, totalJenisBarang)
      }
    },
    ketersediaan: {
      tersedia: statusTersedia,
      dipinjam: statusDipinjam
    },
    watchlist: watchlist.slice(0, 8),
    aktivitas_terbaru: recentMovements
  };
}

module.exports = {
  getDashboardSummary
};