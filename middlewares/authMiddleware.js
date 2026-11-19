const { verifyToken } = require('../utils/jwtHelper');
const AppError = require('../utils/AppError');

function extractToken(req) {
  // 1. Prioritaskan header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 2. Fallback ke HTTP-Only Cookie bernama 'token'
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}

function protectApi(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Akses ditolak. Token autentikasi tidak ditemukan, silakan login terlebih dahulu.', 401));
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    return next(err); // Ditangkap oleh globalErrorHandler (JsonWebTokenError / TokenExpiredError)
  }
}

function protectPage(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.redirect('/login');
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

function redirectIfAuthenticated(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    verifyToken(token);
    return res.redirect('/dashboard');
  } catch (err) {
    res.clearCookie('token');
    return next();
  }
}

module.exports = {
  protectApi,
  protectPage,
  redirectIfAuthenticated
};