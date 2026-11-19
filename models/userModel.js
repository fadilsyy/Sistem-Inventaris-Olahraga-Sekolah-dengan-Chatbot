const { getDbClient } = require('../config/db');

async function findByEmail(email) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, nama_pengguna, email, password_hash, jabatan, created_at')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findById(id) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, nama_pengguna, email, jabatan, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createUser({ nama_pengguna, email, password_hash, jabatan = 'Petugas Gudang' }) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('users')
    .insert([{ nama_pengguna, email, password_hash, jabatan }])
    .select('id, nama_pengguna, email, jabatan, created_at')
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  findByEmail,
  findById,
  createUser
};