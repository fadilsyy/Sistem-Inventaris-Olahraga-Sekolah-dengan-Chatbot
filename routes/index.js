const path = require('path');
const express = require('express');
const { isDbConfigured } = require('../config/db');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { protectPage, redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const authRoutes = require('./authRoutes');
const barangRoutes = require('./barangRoutes');

const router = express.Router();

// =========================================================================
// 1. ENDPOINT FONDASI & DIAGNOSTIK (TAHAP 1)
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
          Modul Manajemen Data Inventaris (Tahap 3) sudah siap digunakan.
        </p>
        <div class="flex flex-col gap-2 pt-2">
          <a href="/inventaris" class="w-full text-center py-2.5 px-4 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-sm font-semibold transition">
            Buka Halaman Data Inventaris &rarr;
          </a>
          <button id="btn-logout-test" class="w-full py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium cursor-pointer transition">
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

// =========================================================================
// 3. API ROUTES MODUL FITUR
// =========================================================================
router.use('/api/auth', authRoutes);
router.use('/api/barang', barangRoutes);

// Tahap 4 (M4/S1 - Stok)       : router.use('/api/stok', require('./stokRoutes'));
// Tahap 5 (M5 - Dashboard)     : router.use('/api/dashboard', require('./dashboardRoutes'));
// Tahap 6 (M7 - Mock Chatbot)  : router.use('/api/chatbot', require('./chatbotRoutes'));
// Tahap 7 (C1 - Stock Opname)  : router.use('/api/opname', require('./opnameRoutes'));

module.exports = router;