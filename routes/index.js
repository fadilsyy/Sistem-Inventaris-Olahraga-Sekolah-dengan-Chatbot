const path = require('path');
const express = require('express');
const { isDbConfigured } = require('../config/db');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');
const { protectPage, redirectIfAuthenticated } = require('../middlewares/authMiddleware');
const authRoutes = require('./authRoutes');
const barangRoutes = require('./barangRoutes');
const stokRoutes = require('./stokRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const chatbotRoutes = require('./chatbotRoutes');

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

router.get('/dashboard', protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
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
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/chatbot', chatbotRoutes);

// Tahap 7 (C1 - Stock Opname)  : router.use('/api/opname', require('./opnameRoutes'));

module.exports = router;