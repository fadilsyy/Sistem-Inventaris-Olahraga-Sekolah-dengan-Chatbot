const { createClient } = require('@supabase/supabase-js');
const env = require('./env');
const AppError = require('../utils/AppError');

const isPlaceholderUrl =
  !env.supabaseUrl ||
  env.supabaseUrl.includes('your-project-id') ||
  !env.supabaseUrl.startsWith('https://');

const isPlaceholderKey =
  !env.supabaseKey ||
  env.supabaseKey.includes('your-supabase-service-role-key');

let supabaseInstance = null;

if (!isPlaceholderUrl && !isPlaceholderKey) {
  supabaseInstance = createClient(env.supabaseUrl, env.supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn('[INFO DB] Kredensial Supabase di .env masih placeholder. Koneksi DB akan aktif saat Tahap 2.');
}

function getDbClient() {
  if (!supabaseInstance) {
    throw new AppError(
      'Koneksi database Supabase belum dikonfigurasi. Lengkapi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.',
      500
    );
  }
  return supabaseInstance;
}

function isDbConfigured() {
  return Boolean(supabaseInstance);
}

module.exports = {
  getDbClient,
  isDbConfigured
};