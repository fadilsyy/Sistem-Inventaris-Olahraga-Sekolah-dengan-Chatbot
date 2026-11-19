const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwtHelper');
const AppError = require('../utils/AppError');

// Dummy hash valid bcrypt untuk menjaga waktu eksekusi konstan saat email tidak ditemukan
const DUMMY_BCRYPT_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8D2vW6nL7x6V8G4H1J2K3L4M5N6O7P';

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email dan password wajib diisi.', 400);
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await userModel.findByEmail(normalizedEmail);

  const hashToCompare = user ? user.password_hash : DUMMY_BCRYPT_HASH;
  const isPasswordMatch = await bcrypt.compare(String(password), hashToCompare);

  if (!user || !isPasswordMatch) {
    throw new AppError('Email atau password yang Anda masukkan salah.', 401);
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    nama_pengguna: user.nama_pengguna,
    jabatan: user.jabatan
  };

  const token = signToken(tokenPayload);

  return {
    token,
    user: tokenPayload
  };
}

async function getProfile(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new AppError('Data akun petugas tidak ditemukan.', 404);
  }
  return user;
}

module.exports = {
  login,
  getProfile
};