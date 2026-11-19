const path = require('path');
const express = require('express');
const { isDbConfigured } = require('../config/db');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { protectPage, redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const authRoutes = require('./authRoutes');

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

// Halaman verifikasi sesi terproteksi sementara sebelum views/dashboard.html dibuat di Tahap 5
router.get('/dashboard', protectPage, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Sesi JWT — Gudang Olahraga</title>
      <link href="/css/output.css" rel="stylesheet">
    </head>
    <body class="bg-slate-100 min-h-screen flex items-center justify-center p-6">
      <div class="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Autentikasi JWT Berhasil (Tahap 2)
        </span>
        <h1 class="text-xl font-bold text-slate-900">Halo, ${req.user.nama_pengguna}!</h1>
        <p class="text-sm text-slate-600">
          Token JWT Anda valid. Halaman ini membuktikan middleware <code>protectPage</code> berhasil memverifikasi sesi login Anda.
        </p>
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
          <p><strong>Email:</strong> ${req.user.email}</p>
          <p><strong>Jabatan:</strong> ${req.user.jabatan}</p>
        </div>
        <button id="btn-logout-test" class="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium cursor-pointer transition">
          Keluar (Logout)
        </button>
      </div>
      <script src="/js/api.js"></script>
      <script src="/js/auth.js"></script>
    </body>
    </html>
  `);
});

// =========================================================================
// 3. API ROUTES MODUL FITUR
// =========================================================================
router.use('/api/auth', authRoutes);

// Tahap 3 (M2/M3 - Inventaris) : router.use('/api/barang', require('./barangRoutes'));
// Tahap 4 (M4/S1 - Stok)       : router.use('/api/stok', require('./stokRoutes'));
// Tahap 5 (M5 - Dashboard)     : router.use('/api/dashboard', require('./dashboardRoutes'));
// Tahap 6 (M7 - Mock Chatbot)  : router.use('/api/chatbot', require('./chatbotRoutes'));
// Tahap 7 (C1 - Stock Opname)  : router.use('/api/opname', require('./opnameRoutes'));

module.exports = router;