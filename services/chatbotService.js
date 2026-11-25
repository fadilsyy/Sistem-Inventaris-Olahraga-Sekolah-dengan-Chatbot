const barangModel = require('../models/barangModel');
const peminjamanModel = require('../models/peminjamanModel');
const AppError = require('../utils/AppError');

const MAX_MESSAGE_LENGTH = 500;

const REJECTION_CODE_MESSAGE =
  'Maaf, saya hanya dapat membantu pertanyaan seputar inventaris Gudang Olahraga dan tidak dapat membuat atau menjalankan kode maupun script. Anda bisa menanyakan stok menipis, kondisi barang, peminjaman aktif, atau nama barang tertentu.';

const REJECTION_INJECTION_MESSAGE =
  'Maaf, saya tidak dapat mengubah aturan atau instruksi saya. Silakan ajukan pertanyaan seputar inventaris Gudang Olahraga.';

const OUT_OF_SCOPE_MESSAGE =
  'Maaf, pertanyaan tersebut di luar cakupan saya. Saya hanya melayani pertanyaan seputar inventaris Gudang Olahraga, misalnya stok menipis, kondisi barang, peminjaman aktif, atau nama barang tertentu.';

const GREETING_HELP_MESSAGE =
  'Halo! Saya Asisten Gudang Olahraga. Saya dapat membantu mengecek ringkasan stok gudang, barang stok menipis, kondisi fisik barang (Baik, Cukup, Rusak), peminjaman aktif, serta detail stok barang tertentu.';

const ACTIVITY_NOT_AVAILABLE_MESSAGE =
  'Fitur aktivitas stok belum tersedia di asisten. Silakan buka halaman Riwayat Stok.';

function sanitizeInput(rawMessage) {
  if (rawMessage === null || rawMessage === undefined) {
    throw new AppError('Pesan pertanyaan tidak boleh kosong.', 400);
  }

  if (typeof rawMessage !== 'string') {
    throw new AppError('Format pesan tidak valid.', 400);
  }

  // Normalisasi Unicode, hapus karakter kontrol kecuali \t dan \n, lalu rapikan spasi
  const normalized = rawMessage
    .normalize('NFC')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r?\n+/g, '\n')
    .trim();

  if (!normalized) {
    throw new AppError('Pesan pertanyaan tidak boleh kosong.', 400);
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new AppError('Pesan terlalu panjang. Maksimal 500 karakter.', 400);
  }

  return normalized;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholeWord(text, words) {
  return words.some((word) => {
    const pattern = new RegExp(`(?:^|[^a-z0-9_])${escapeRegExp(word)}(?:$|[^a-z0-9_])`, 'i');
    return pattern.test(text);
  });
}

function detectGuardViolation(message) {
  const lower = message.toLowerCase();

  // Kategori B: Upaya manipulasi instruksi / prompt injection
  const injectionPhrases = [
    'abaikan instruksi sebelumnya',
    'abaikan semua instruksi',
    'lupakan aturan',
    'lupakan instruksi',
    'ignore previous instructions',
    'ignore all instructions',
    'system prompt',
    'prompt sistem',
    'jailbreak',
    'developer mode',
    'kamu sekarang adalah',
    'berpura-pura menjadi',
    'pretend to be',
    'pretend',
    'tampilkan instruksimu',
    'tampilkan prompt'
  ];

  const hasInjection = injectionPhrases.some((phrase) => {
    const pattern = new RegExp(`(?:^|[^a-z0-9_])${escapeRegExp(phrase)}(?:$|[^a-z0-9_])`, 'i');
    return pattern.test(lower);
  });

  if (hasInjection) {
    return REJECTION_INJECTION_MESSAGE;
  }

  // Kategori A: Permintaan pembuatan/eksekusi kode, script, atau muatan teknis
  // Kecualikan frasa "kode barang" dan "kode_barang" agar tidak dianggap objek "kode"
  const sanitizedForCodeCheck = lower
    .replace(/(?:^|[^a-z0-9_])kode[\s_]+barang(?:$|[^a-z0-9_])/g, ' ');

  const technicalPayloads = [
    /```/,
    /<\s*script\b/i,
    /\bjavascript\s*:/i,
    /<\?php/i,
    /\brm\s+-rf\b/i,
    /\bdrop\s+table\b/i,
    /\bdelete\s+from\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\s+[a-z0-9_]+\s+set\b/i,
    /\bselect\s+.+\s+from\b/i,
    /\bprocess\.env\b/i,
    /\brequire\s*\(/i,
    /\beval\s*\(/i,
    /\bchild_process\b/i
  ];

  if (technicalPayloads.some((regex) => regex.test(message))) {
    return REJECTION_CODE_MESSAGE;
  }

  const createVerbs = [
    'buatkan',
    'bikin',
    'tulis',
    'tuliskan',
    'generate',
    'create',
    'write',
    'build',
    'kembangkan'
  ];

  const techObjects = [
    'kode',
    'code',
    'script',
    'skrip',
    'kalkulator',
    'website',
    'bot',
    'function',
    'query',
    'sql',
    'html',
    'css',
    'javascript',
    'python',
    'php',
    'regex',
    'algoritma'
  ];

  const execVerbs = ['jalankan', 'eksekusi', 'run', 'execute', 'eval'];

  const execObjects = [
    'script',
    'skrip',
    'kode',
    'code',
    'perintah',
    'command',
    'terminal',
    'shell',
    'bash',
    'cmd',
    'powershell',
    'sql',
    'query'
  ];

  const isCreateTech =
    hasWholeWord(sanitizedForCodeCheck, createVerbs) &&
    hasWholeWord(sanitizedForCodeCheck, techObjects);

  const isExecTech =
    hasWholeWord(sanitizedForCodeCheck, execVerbs) &&
    hasWholeWord(sanitizedForCodeCheck, execObjects);

  if (isCreateTech || isExecTech) {
    return REJECTION_CODE_MESSAGE;
  }

  return null;
}

function detectIntent(lower, items) {
  const ignoredItemWords = new Set(['barang', 'unit', 'stok']);

  const matchedItems = items.filter((b) => {
    const namaLower = b.nama_barang.toLowerCase();
    const kodeLower = b.kode_barang.toLowerCase();

    if (lower.includes(namaLower) || lower.includes(kodeLower)) {
      return true;
    }

    // Pencocokan kata parsial dari nama_barang (minimal 4 huruf, bukan kata umum) sebagai kata utuh
    const itemWords = namaLower
      .split(/[^a-z0-9_]+/)
      .filter((w) => w.length >= 4 && !ignoredItemWords.has(w));

    return itemWords.length > 0 && hasWholeWord(lower, itemWords);
  });

  const hasPeminjaman =
    lower.includes('pinjam') ||
    lower.includes('peminjam') ||
    lower.includes('kembali') ||
    lower.includes('dikembalikan') ||
    lower.includes('pengembalian');

  const hasKondisiContext =
    lower.includes('barang') ||
    lower.includes('unit') ||
    lower.includes('kondisi') ||
    lower.includes('stok') ||
    lower.includes('alat') ||
    lower.includes('perlengkapan');

  const hasKondisi =
    lower.includes('rusak') ||
    lower.includes('kondisi') ||
    lower.includes('perbaikan') ||
    (lower.includes('cukup') && hasKondisiContext);

  const hasStokMenipis =
    lower.includes('habis') ||
    lower.includes('menipis') ||
    lower.includes('kosong') ||
    lower.includes('sedikit');

  const hasRingkasan =
    lower.includes('ringkasan') ||
    lower.includes('ringkas') ||
    lower.includes('rekap') ||
    lower.includes('total') ||
    lower.includes('jumlah') ||
    lower.includes('stok gudang') ||
    lower.includes('gambaran umum');

  const hasAktivitas =
    lower.includes('aktivitas') ||
    lower.includes('riwayat') ||
    hasWholeWord(lower, ['log']) ||
    lower.includes('mutasi');

  const hasSapaan =
    hasWholeWord(lower, ['halo', 'hai', 'bantuan', 'help', 'makasih']) ||
    lower.includes('selamat pagi') ||
    lower.includes('selamat siang') ||
    lower.includes('selamat sore') ||
    lower.includes('selamat malam') ||
    lower.includes('terima kasih') ||
    lower.includes('bisa apa');

  const hasGeneralInventoryWord = hasWholeWord(lower, [
    'stok',
    'barang',
    'inventaris',
    'gudang',
    'daftar',
    'tersedia'
  ]);

  // Prioritas barang spesifik jika nama_barang atau kode_barang disebut
  if (matchedItems.length > 0) {
    return {
      type: 'BARANG_SPESIFIK',
      matchedItems,
      withKondisi: hasKondisi,
      withPeminjaman: hasPeminjaman
    };
  }

  // Urutan prioritas tanpa barang spesifik
  if (hasPeminjaman) return { type: 'PEMINJAMAN' };
  if (hasKondisi) return { type: 'KONDISI' };
  if (hasStokMenipis) return { type: 'STOK_MENIPIS' };
  if (hasRingkasan) return { type: 'RINGKASAN' };
  if (hasAktivitas) return { type: 'AKTIVITAS_STOK' };
  if (hasSapaan) return { type: 'SAPAAN' };
  if (hasGeneralInventoryWord) return { type: 'RINGKASAN' };

  return { type: 'DI_LUAR_CAKUPAN' };
}

function buildReply(intent, items, activePinjam) {
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

  // 1. Intent Barang Spesifik
  if (intent.type === 'BARANG_SPESIFIK') {
    const { matchedItems, withKondisi, withPeminjaman } = intent;

    if (withKondisi && !withPeminjaman) {
      const detailKondisi = matchedItems
        .map(
          (b) =>
            `• [${b.kode_barang}] ${b.nama_barang}: ${b.stok_baik} Baik, ${b.stok_cukup} Cukup, ${b.stok_rusak} Rusak.`
        )
        .join('\n');

      return `Kondisi fisik barang yang diminta:\n${detailKondisi}`;
    }

    if (withPeminjaman && !withKondisi) {
      const targetNames = matchedItems.map((b) => b.nama_barang.toLowerCase());
      const relatedPinjam = activePinjam.filter((t) =>
        targetNames.includes((t.barang?.nama_barang || '').toLowerCase())
      );

      if (!relatedPinjam.length) {
        const namaList = matchedItems.map((b) => `[${b.kode_barang}] ${b.nama_barang}`).join(', ');
        return `Saat ini tidak ada peminjaman aktif untuk ${namaList}.`;
      }

      const daftar = relatedPinjam
        .slice(0, 6)
        .map(
          (t, idx) =>
            `${idx + 1}. ${t.peminjam} meminjam ${t.jumlah} ${t.barang?.satuan || 'unit'} ${t.barang?.nama_barang || 'Barang'}${t.keterangan ? ` (${t.keterangan})` : ''}`
        )
        .join('\n');

      return `Sesi peminjaman aktif untuk barang yang diminta:\n${daftar}`;
    }

    const detail = matchedItems
      .map(
        (b) =>
          `• [${b.kode_barang}] ${b.nama_barang} (${b.kategori}): Tersedia di rak ${b.stok_tersedia} ${b.satuan}, Dipinjam ${b.stok_dipinjam} ${b.satuan}, Total Aset ${b.stok_sistem} ${b.satuan} (Kondisi: ${b.stok_baik} Baik, ${b.stok_cukup} Cukup, ${b.stok_rusak} Rusak).`
      )
      .join('\n');

    return `Berikut rincian data inventaris yang cocok dengan pertanyaan Anda:\n${detail}`;
  }

  // 2. Intent Peminjaman Aktif
  if (intent.type === 'PEMINJAMAN') {
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

    return `Terdapat ${activePinjam.length} sesi peminjaman aktif dengan total ${totals.dipinjam} unit sedang dipinjam:\n${daftar}`;
  }

  // 3. Intent Kondisi Fisik (Rusak / Cukup / Baik)
  if (intent.type === 'KONDISI') {
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

  // 4. Intent Stok Habis / Menipis
  if (intent.type === 'STOK_MENIPIS') {
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

  // 5. Intent Ringkasan Umum Gudang
  if (intent.type === 'RINGKASAN') {
    return `Ringkasan Gudang Olahraga saat ini:\n• Total Jenis Barang: ${totals.jenis} item\n• Total Unit Aset: ${totals.aset} unit (${totals.tersedia} tersedia di rak, ${totals.dipinjam} sedang dipinjam)\n• Komposisi Kondisi: ${totals.baik} Baik, ${totals.cukup} Cukup, ${totals.rusak} Rusak`;
  }

  // 6. Intent Aktivitas Stok
  if (intent.type === 'AKTIVITAS_STOK') {
    return ACTIVITY_NOT_AVAILABLE_MESSAGE;
  }

  // 7. Intent Sapaan / Bantuan
  if (intent.type === 'SAPAAN') {
    return GREETING_HELP_MESSAGE;
  }

  // 8. Di Luar Cakupan
  return OUT_OF_SCOPE_MESSAGE;
}

async function generateAssistantReply(rawMessage) {
  // 1. Validasi dan sanitasi input
  const cleanMessage = sanitizeInput(rawMessage);

  // 2. Penjaga keamanan dijalankan sebelum query database
  const guardRejection = detectGuardViolation(cleanMessage);
  if (guardRejection) {
    return guardRejection;
  }

  // 3. Ambil data inventaris dan susun jawaban sesuai intent
  const [items, activePinjam] = await Promise.all([
    barangModel.findAll(),
    peminjamanModel.findActive()
  ]);

  const intent = detectIntent(cleanMessage.toLowerCase(), items);
  return buildReply(intent, items, activePinjam);
}

module.exports = {
  generateAssistantReply
};