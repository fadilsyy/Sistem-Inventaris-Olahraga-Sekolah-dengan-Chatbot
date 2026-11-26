const env = require('../config/env');
const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(new AppError(`Endpoint atau halaman tidak ditemukan: ${req.method} ${req.originalUrl}`, 404));
}

function globalErrorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan internal pada server.';
  let isOperational = Boolean(err.isOperational);

  // 1. Error format JSON rusak pada request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Format JSON pada body request tidak valid.';
    isOperational = true;
  }

  // 2. Error Autentikasi JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token autentikasi tidak valid. Silakan login ulang.';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sesi login Anda telah berakhir. Silakan login kembali.';
    isOperational = true;
  }

  // 3. Error Constraint PostgreSQL (Supabase)
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Data sudah terdaftar (terjadi duplikasi pada nilai unik seperti kode barang atau email).';
    isOperational = true;
  } else if (err.code === '23514') {
    statusCode = 400;
    message = 'Input melanggar aturan domain data (Kategori: Sport/Non-Sport, Kondisi: Baik/Cukup/Rusak, Ketersediaan: Tersedia/Dipinjam, Stok >= 0).';
    isOperational = true;
  } else if (err.code === '23503') {
    statusCode = 400;
    message = 'Referensi data terkait tidak ditemukan atau masih digunakan.';
    isOperational = true;
  } else if (err.code === '22P02') {
    statusCode = 400;
    message = 'Format parameter ID tidak valid.';
    isOperational = true;
  }

  if (statusCode >= 500) {
    console.error('[SERVER ERROR]', {
      path: req.originalUrl,
      method: req.method,
      message: err.message,
      stack: err.stack
    });

    if (!isOperational) {
      message = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
    }
  }

  const errorResponse = {
    success: false,
    message
  };

  if (env.nodeEnv === 'development') {
    errorResponse.errorType = err.name || 'Error';
    errorResponse.stack = err.stack;
  }

  return res.status(statusCode).json(errorResponse);
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};