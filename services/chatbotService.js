const barangModel = require('../models/barangModel');
const peminjamanModel = require('../models/peminjamanModel');
const AppError = require('../utils/AppError');

async function generateAssistantReply(rawMessage) {
  const message = rawMessage ? String(rawMessage).trim() : '';
  if (!message) {
    throw new AppError('Pesan pertanyaan tidak boleh kosong.', 400);
  }

  const lower = message.toLowerCase();
  const [items, activePinjam] = await Promise.all([
    barangModel.findAll(),
    peminjamanModel.findActive()
  ]);

  const totals = items.reduce(
    (acc, b) => {
      acc.jenis += 1;
      acc.aset += b.stok_sistem;
      acc.tersedia += b.stok_tersedia;
      acc.dipinjam += b.stok_dipinjam;
      acc.baik += b.stok_baik;
      acc.cukup += b.stok_cukup;
      acc.rusak += b.stok_rusak;
      return acc;
    },
    { jenis: 0, aset: 0, tersedia: 0, dipinjam: 0, baik: 0, cukup: 0, rusak: 0 }
  );

  // 1. Pertanyaan seputar peminjaman aktif
  if (lower.includes('pinjam') || lower.includes('peminjam') || lower.includes('kembali')) {
    if (!activePinjam.length) {
      return `Saat ini tidak ada unit perlengkapan olahraga yang sedang dipinjam. Seluruh ${totals.tersedia} unit aset berada di rak gudang.`;
    }

    const daftar = activePinjam
      .slice(0, 6)
      .map(
        (t, idx) =>
          `${idx + 1}. ${t.peminjam} meminjam ${t.jumlah} ${t.barang?.satuan || 'unit'} ${t.barang?.nama_barang || 'Barang'}${t.keterangan ? ` (${t.keterangan})` : ''}`
      )
      .join('\n');

    return `Terdapat ${activePinjam.length} sesi peminjaman aktif dengan total ${totals.dipinjam} unit sedang dipinjam:\n${daftar}\n\nUntuk memproses pengembalian per sesi, buka halaman Data Inventaris lalu klik tombol "Pinjam / Kembali" pada barang terkait.`;
  }

  // 2. Pertanyaan seputar kondisi fisik (Rusak / Cukup / Baik)
  if (lower.includes('rusak') || lower.includes('cukup') || lower.includes('kondisi') || lower.includes('perbaikan')) {
    const bermasalah = items.filter((b) => b.stok_rusak > 0 || b.stok_cukup > 0);
    if (!bermasalah.length) {
      return `Semua ${totals.aset} unit aset inventaris dari ${totals.jenis} jenis barang saat ini berada dalam kondisi Baik (0 Cukup, 0 Rusak).`;
    }

    const rincian = bermasalah
      .slice(0, 6)
      .map(
        (b, idx) =>
          `${idx + 1}. [${b.kode_barang}] ${b.nama_barang}: ${b.stok_rusak} Rusak, ${b.stok_cukup} Cukup, ${b.stok_baik} Baik`
      )
      .join('\n');

    return `Rekap kondisi aset gudang saat ini: ${totals.baik} unit Baik, ${totals.cukup} unit Cukup, dan ${totals.rusak} unit Rusak.\n\nBarang yang memerlukan perhatian kondisi:\n${rincian}`;
  }

  // 3. Pertanyaan seputar stok habis / menipis
  if (lower.includes('habis') || lower.includes('menipis') || lower.includes('kosong') || lower.includes('sedikit')) {
    const kritis = items.filter((b) => b.stok_tersedia <= 2);
    if (!kritis.length) {
      return `Semua jenis barang saat ini memiliki stok tersedia di rak lebih dari 2 unit (Total tersedia di rak: ${totals.tersedia} unit).`;
    }

    const listKritis = kritis
      .slice(0, 6)
      .map(
        (b, idx) =>
          `${idx + 1}. [${b.kode_barang}] ${b.nama_barang} — Tersedia di rak: ${b.stok_tersedia} ${b.satuan} (Dipinjam: ${b.stok_dipinjam}, Total aset: ${b.stok_sistem})`
      )
      .join('\n');

    return `Ditemukan ${kritis.length} jenis barang dengan stok tersedia di rak ≤ 2 unit:\n${listKritis}`;
  }

  // 4. Pencarian barang spesifik berdasarkan nama/kode dalam pertanyaan
  const matchedItems = items.filter(
    (b) =>
      lower.includes(b.nama_barang.toLowerCase()) ||
      lower.includes(b.kode_barang.toLowerCase())
  );

  if (matchedItems.length > 0) {
    const detail = matchedItems
      .map(
        (b) =>
          `• [${b.kode_barang}] ${b.nama_barang} (${b.kategori}): Tersedia di rak ${b.stok_tersedia} ${b.satuan}, Dipinjam ${b.stok_dipinjam} ${b.satuan}, Total Aset ${b.stok_sistem} ${b.satuan} (Kondisi: ${b.stok_baik} Baik, ${b.stok_cukup} Cukup, ${b.stok_rusak} Rusak).`
      )
      .join('\n');

    return `Berikut rincian data inventaris yang cocok dengan pertanyaan Anda:\n${detail}`;
  }

  // 5. Ringkasan umum / panduan penggunaan
  return `Ringkasan Gudang Olahraga saat ini:\n• Total Jenis Barang: ${totals.jenis} item\n• Total Unit Aset: ${totals.aset} unit (${totals.tersedia} tersedia di rak, ${totals.dipinjam} sedang dipinjam)\n• Komposisi Kondisi: ${totals.baik} Baik, ${totals.cukup} Cukup, ${totals.rusak} Rusak\n\nAnda dapat menanyakan: "barang apa saja yang sedang dipinjam?", "cek unit kondisi rusak atau cukup", "stok barang yang menipis", atau sebutkan nama barang spesifik (misal: "stok bola basket").`;
}

module.exports = {
  generateAssistantReply
};