const express = require('express');
const { isDbConfigured } = require('../config/db');
const { sendSuccess } = require('../utils/responseHelper');
const AppError = require('../utils/AppError');

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
// 2. PENDAFTARAN ROUTE MODUL FITUR (AKAN DIAKTIFKAN BERTAHAP)
// =========================================================================
// Tahap 2 (M1 - JWT Auth)      : router.use('/api/auth', require('./authRoutes'));
// Tahap 3 (M2/M3 - Inventaris) : router.use('/api/barang', require('./barangRoutes'));
// Tahap 4 (M4/S1 - Stok)       : router.use('/api/stok', require('./stokRoutes'));
// Tahap 5 (M5 - Dashboard)     : router.use('/api/dashboard', require('./dashboardRoutes'));
// Tahap 6 (M7 - Mock Chatbot)  : router.use('/api/chatbot', require('./chatbotRoutes'));
// Tahap 7 (C1 - Stock Opname)  : router.use('/api/opname', require('./opnameRoutes'));

module.exports = router;