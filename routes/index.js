const path = require('path');
const express = require('express');
const { isDbConfigured } = require('../config/db');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { protectPage, redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const authRoutes = require('./authRoutes');
const barangRoutes = require('./barangRoutes');
const stokRoutes = require('./stokRoutes');

const router = express.Router();

// =========================================================================
// 1. ENDPOINT FONDASI & DIAGNOSTIK
// =========================================================================
router.get('/api/health', (req, res) => {
  sendSuccess(res, {
    message: 'Fondasi Unified MVC Inventaris Olahraga v1.1 aktif',
    data: {
      server: 'ONLINE',
      databaseConfigured: isDbConfigured(),
      timestamp: new Date().toISOString()
    }
  });
});

router.get('/api/health/test-error', (req, res, next) => {
  next(new AppError('Simulasi Operational Error 400 berhasil ditangkap Global Error Handler', 400));
});

// =========================================================================
// 2. VIEW ROUTES (HALAMAN HTML)
// =========================================================================
router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// Halaman verifikasi sementara sebelum views/dashboard.html lengkap dibangun di Tahap 5
router.get('/dashboard', protectPage, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard Sementara — Gudang Olahraga</title>
      <link href="/css/output.css" rel="stylesheet">
    </head>
    <body class="bg-slate-100 min-h-screen flex items-center justify-center p-6">
      <div class="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Sesi JWT Aktif
        </span>
        <h1 class="text-xl font-bold text-slate-900">Halo, ${req.user.nama_pengguna}!</h1>
        <p class="text-sm text-slate-600">
          Modul Inventaris (Tahap 3) &amp; Mutasi Stok Masuk/Keluar (Tahap 4) siap digunakan.
        </p>
        <div class="flex flex-col gap-2 pt-2">
          <a href="/inventaris" class="w-full text-center py-2.5 px-4 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold transition">
            Data Inventaris &rarr;
          </a>
          <div class="grid grid-cols-2 gap-2">
            <a href="/barang-masuk" class="text-center py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition">
              + Barang Masuk (IN)
            </a>
            <a href="/barang-keluar" class="text-center py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition">
              - Barang Keluar (OUT)
            </a>
          </div>
          <a href="/riwayat" class="w-full text-center py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition">
            Lihat Riwayat Pergerakan Stok
          </a>
          <button id="btn-logout-test" class="w-full py-2 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium cursor-pointer transition mt-1">
            Keluar (Logout)
          </button>
        </div>
      </div>
      <script src="/js/api.js"></script>
      <script src="/js/auth.js"></script>
    </body>
    </html>
  `);
});

router.get('/inventaris', protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'inventaris.html'));
});

router.get('/barang-masuk', protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'barang-masuk.html'));
});

router.get('/barang-keluar', protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'barang-keluar.html'));
});

router.get('/riwayat', protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'riwayat.html'));
});

// =========================================================================
// 3. API ROUTES MODUL FITUR
// =========================================================================
router.use('/api/auth', authRoutes);
router.use('/api/barang', barangRoutes);
router.use('/api/stok', stokRoutes);

// Tahap 5 (M5 - Dashboard)     : router.use('/api/dashboard', require('./dashboardRoutes'));
// Tahap 6 (M7 - Mock Chatbot)  : router.use('/api/chatbot', require('./chatbotRoutes'));
// Tahap 7 (C1 - Stock Opname)  : router.use('/api/opname', require('./opnameRoutes'));

module.exports = router;