require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: (process.env.SUPABASE_URL || '').trim(),
  supabaseKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  jwtSecret: (process.env.JWT_SECRET || '').trim(),
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '1d').trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || '').trim(),
  groqApiKey: (process.env.GROQ_API_KEY || '').trim()
};

if (!env.jwtSecret || env.jwtSecret.length < 16) {
  console.warn('[PERINGATAN KEAMANAN] JWT_SECRET belum diatur atau terlalu pendek (< 16 karakter).');
  if (env.nodeEnv === 'production') {
    throw new Error('Fatal: JWT_SECRET wajib dikonfigurasi dengan kuat pada mode production.');
  }
  env.jwtSecret = 'dev_fallback_secret_key_inventaris_2026';
}

module.exports = env;