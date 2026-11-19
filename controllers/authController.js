const env = require('../config/env');
const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHelper');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  maxAge: 24 * 60 * 60 * 1000 // 1 hari
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.cookie('token', result.token, COOKIE_OPTIONS);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Login berhasil. Selamat datang kembali!',
    data: {
      token: result.token,
      user: result.user
    }
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production'
  });

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logout berhasil. Sesi Anda telah diakhiri.'
  });
});

const getMe = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Profil petugas berhasil diambil.',
    data: profile
  });
});

module.exports = {
  login,
  logout,
  getMe
};