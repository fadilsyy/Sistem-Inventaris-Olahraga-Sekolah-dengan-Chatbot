const dashboardModel = require('../models/dashboardModel');
const stokModel = require('../models/stokModel');
const AppError = require('../utils/AppError');

const DEFAULT_SUGGESTIONS = [
  'Ringkasan stok gudang',
  'Barang stok menipis',
  'Cek barang rusak',
  'Aktivitas stok terakhir'
];

function formatWaktuSingkat(isoString) {
  if (!isoString) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoString));
}

function cariBarangDalamPesan(pesanLower, daftarBarang) {
  const tokenPesan = pesanLower
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !['cek', 'stok', 'barang', 'berapa', 'jumlah', 'ada', 'yang', 'untuk', 'data'].includes(t));

  return daftarBarang.filter((item) => {
    const namaLower = item.nama_barang.toLowerCase();
    const kodeLower = item.kode_barang.toLowerCase();

    if (pesanLower.includes(kodeLower) || pesanLower.includes(namaLower)) {
      return true;
    }

    return tokenPesan.some((token) => namaLower.includes(token) || kodeLower.includes(token));
  });
}

async function generateReply(rawMessage, user) {
  const message = rawMessage ? String(rawMessage).trim() : '';

  if (!message) {
    throw new AppError('Pesan pertanyaan tidak boleh kosong.', 400);
  }

  if (message.length > 500) {
    throw new AppError('Pesan maksimal 500 karakter.', 400);
  }

  const pesanLower = message.toLowerCase();
  const [daftarBarang, riwayatTerbaru] = await Promise.all([
    dashboardModel.getAllActiveBarang(),
    stokModel.findAllMovements({ limit: 5 })
  ]);

  const namaPetugas = user?.nama_pengguna || 'Petugas';

  // 1. Intent: Sapaan & Bantuan
  if (/^(halo|hai|hi|pagi|siang|sore|malam|help|bantuan|menu|fitur)\b/.test(pesanLower)) {
    return {
      reply:
        `Halo **${namaPetugas}**! Saya Asisten Inventaris Gudang Olahraga (Mode Mock).\n\n` +
        `Saya dapat membantu mengecek data gudang secara langsung, antara lain:\n` +
        `• **Ringkasan stok** keseluruhan & per kategori\n` +
        `• **Peringatan stok habis / menipis** (\u2264 2 unit)\n` +
        `• **Daftar barang rusak** atau **sedang dipinjam**\n` +
        `• **Cek stok barang spesifik** (misal: *"Cek stok Bola Basket"*)\n` +
        `• **Riwayat mutasi stok terakhir**`,
      mode: 'MOCK_GROUNDED',
      suggestions: DEFAULT_SUGGESTIONS,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Intent: Peringatan Stok Menipis / Habis
  if (/(habis|menipis|kurang|restock|kosong|sedikit|peringatan|alert)/.test(pesanLower)) {
    const lowStock = daftarBarang.filter((b) => Number(b.stok_sistem) <= 2);

    if (lowStock.length === 0) {
      return {
        reply: `Kabar baik! Saat ini **tidak ada barang dengan stok habis atau menipis** (\u2264 2 unit). Seluruh ${daftarBarang.length} jenis perlengkapan aktif dalam batas aman.`,
        mode: 'MOCK_GROUNDED',
        suggestions: ['Ringkasan stok gudang', 'Cek barang rusak', 'Aktivitas stok terakhir'],
        timestamp: new Date().toISOString()
      };
    }

    const listText = lowStock
      .slice(0, 8)
      .map((b) => `• **[${b.kode_barang}] ${b.nama_barang}**: sisa **${b.stok_sistem} ${b.satuan}** (${b.kategori})`)
      .join('\n');

    return {
      reply:
        `Ditemukan **${lowStock.length} jenis barang** dengan stok habis atau menipis (\u2264 2 unit):\n\n` +
        `${listText}\n\n` +
        `Disarankan segera melakukan pengadaan melalui menu **Barang Masuk**.`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Ringkasan stok gudang', 'Cek barang rusak', 'Aktivitas stok terakhir'],
      timestamp: new Date().toISOString()
    };
  }

  // 3. Intent: Kondisi Fisik Rusak / Cukup
  if (/(rusak|perbaikan|kerusakan|kondisi)/.test(pesanLower)) {
    const rusakList = daftarBarang.filter((b) => b.kondisi === 'Rusak');
    const cukupList = daftarBarang.filter((b) => b.kondisi === 'Cukup');

    if (rusakList.length === 0) {
      return {
        reply:
          `Saat ini tercatat **0 barang berkondisi Rusak**.\n` +
          `Ringkasan kondisi fisik: **${daftarBarang.length - cukupList.length} Baik**, **${cukupList.length} Cukup**, dan **0 Rusak**.`,
        mode: 'MOCK_GROUNDED',
        suggestions: ['Barang stok menipis', 'Ringkasan stok gudang', 'Cek barang dipinjam'],
        timestamp: new Date().toISOString()
      };
    }

    const listText = rusakList
      .slice(0, 8)
      .map((b) => `• **[${b.kode_barang}] ${b.nama_barang}** (${b.stok_sistem} ${b.satuan}) — Kategori ${b.kategori}`)
      .join('\n');

    return {
      reply:
        `Terdapat **${rusakList.length} jenis barang** berkondisi **Rusak** (dan ${cukupList.length} berkondisi Cukup):\n\n` +
        `${listText}`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Barang stok menipis', 'Ringkasan stok gudang', 'Aktivitas stok terakhir'],
      timestamp: new Date().toISOString()
    };
  }

  // 4. Intent: Status Peminjaman / Ketersediaan
  if (/(dipinjam|pinjam|tersedia|sirkulasi)/.test(pesanLower)) {
    const dipinjamList = daftarBarang.filter((b) => b.ketersediaan === 'Dipinjam');
    const tersediaCount = daftarBarang.length - dipinjamList.length;

    if (dipinjamList.length === 0) {
      return {
        reply: `Saat ini **tidak ada barang berstatus Dipinjam**. Seluruh **${tersediaCount} jenis barang** berstatus **Tersedia** di gudang.`,
        mode: 'MOCK_GROUNDED',
        suggestions: ['Ringkasan stok gudang', 'Barang stok menipis', 'Aktivitas stok terakhir'],
        timestamp: new Date().toISOString()
      };
    }

    const listText = dipinjamList
      .slice(0, 8)
      .map((b) => `• **[${b.kode_barang}] ${b.nama_barang}** (Stok sistem: ${b.stok_sistem} ${b.satuan})`)
      .join('\n');

    return {
      reply:
        `Terdapat **${dipinjamList.length} jenis barang** berstatus **Dipinjam** (${tersediaCount} lainnya Tersedia):\n\n` +
        `${listText}`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Ringkasan stok gudang', 'Barang stok menipis', 'Aktivitas stok terakhir'],
      timestamp: new Date().toISOString()
    };
  }

  // 5. Intent: Riwayat / Mutasi Stok Terbaru
  if (/(riwayat|aktivitas|transaksi|mutasi|terakhir|masuk|keluar)/.test(pesanLower)) {
    if (riwayatTerbaru.length === 0) {
      return {
        reply: 'Belum ada catatan transaksi barang masuk maupun barang keluar di sistem saat ini.',
        mode: 'MOCK_GROUNDED',
        suggestions: DEFAULT_SUGGESTIONS,
        timestamp: new Date().toISOString()
      };
    }

    const listText = riwayatTerbaru
      .map((m) => {
        const nama = m.barang ? m.barang.nama_barang : 'Barang Terarsip';
        const tanda = m.tipe === 'IN' ? `+${m.jumlah}` : m.tipe === 'OUT' ? `-${m.jumlah}` : `${m.jumlah}`;
        return `• **[${m.tipe}] ${nama}** (${tanda}) — ${formatWaktuSingkat(m.created_at)}\n  _${m.keterangan || 'Tanpa keterangan'}_`;
      })
      .join('\n');

    return {
      reply: `Berikut **${riwayatTerbaru.length} aktivitas pergerakan stok terakhir**:\n\n${listText}`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Ringkasan stok gudang', 'Barang stok menipis', 'Cek barang rusak'],
      timestamp: new Date().toISOString()
    };
  }

  // 6. Intent: Ringkasan / Statistik Keseluruhan Gudang
  if (/(ringkasan|statistik|total|semua barang|rekap|laporan|kategori|sport)/.test(pesanLower) && !pesanLower.includes('cek ')) {
    const totalJenis = daftarBarang.length;
    const totalUnit = daftarBarang.reduce((sum, b) => sum + (Number(b.stok_sistem) || 0), 0);
    const sportItems = daftarBarang.filter((b) => b.kategori === 'Sport');
    const nonSportItems = daftarBarang.filter((b) => b.kategori === 'Non-Sport');
    const rusakCount = daftarBarang.filter((b) => b.kondisi === 'Rusak').length;
    const dipinjamCount = daftarBarang.filter((b) => b.ketersediaan === 'Dipinjam').length;

    return {
      reply:
        `**Ringkasan Inventaris Gudang Olahraga Saat Ini:**\n\n` +
        `• **Total Jenis Barang Aktif:** ${totalJenis} jenis (${totalUnit} unit total)\n` +
        `• **Kategori Sport:** ${sportItems.length} jenis\n` +
        `• **Kategori Non-Sport:** ${nonSportItems.length} jenis\n` +
        `• **Status Dipinjam:** ${dipinjamCount} jenis\n` +
        `• **Kondisi Rusak:** ${rusakCount} jenis`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Barang stok menipis', 'Cek barang rusak', 'Aktivitas stok terakhir'],
      timestamp: new Date().toISOString()
    };
  }

  // 7. Entity Lookup: Pencarian Barang Spesifik berdasarkan Nama atau Kode Barang
  const hasilCocok = cariBarangDalamPesan(pesanLower, daftarBarang);
  if (hasilCocok.length > 0) {
    const listText = hasilCocok
      .slice(0, 6)
      .map(
        (b) =>
          `• **[${b.kode_barang}] ${b.nama_barang}** (${b.kategori})\n` +
          `  Stok: **${b.stok_sistem} ${b.satuan}** | Kondisi: **${b.kondisi}** | Status: **${b.ketersediaan}**`
      )
      .join('\n');

    return {
      reply: `Ditemukan **${hasilCocok.length} data barang** yang sesuai:\n\n${listText}`,
      mode: 'MOCK_GROUNDED',
      suggestions: ['Ringkasan stok gudang', 'Barang stok menipis', 'Aktivitas stok terakhir'],
      timestamp: new Date().toISOString()
    };
  }

  // 8. Fallback jika intent tidak dikenali
  return {
    reply:
      `Maaf, saya belum menemukan data yang cocok dengan kata kunci *"${message}"* pada Mode Mock.\n\n` +
      `Coba tanyakan hal seperti:\n` +
      `• *"Berapa stok Bola Basket?"*\n` +
      `• *"Barang apa saja yang stoknya menipis?"*\n` +
      `• *"Tampilkan ringkasan stok gudang"*`,
    mode: 'MOCK_GROUNDED',
    suggestions: DEFAULT_SUGGESTIONS,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  generateReply
};