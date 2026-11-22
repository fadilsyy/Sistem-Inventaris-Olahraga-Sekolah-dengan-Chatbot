const { getDbClient } = require('../config/db');

const SELECT_PEMINJAMAN = `
  id,
  barang_id,
  peminjam,
  jumlah,
  keterangan,
  status,
  borrowed_at,
  returned_at,
  barang:barang_id (id, kode_barang, nama_barang, kategori, satuan, stok_sistem, stok_dipinjam),
  petugas:user_id (id, nama_pengguna)
`;

async function findActive({ barang_id = '' } = {}) {
  const supabase = getDbClient();
  let query = supabase
    .from('peminjaman')
    .select(SELECT_PEMINJAMAN)
    .eq('status', 'DIPINJAM')
    .order('borrowed_at', { ascending: true });

  if (barang_id) {
    query = query.eq('barang_id', barang_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('peminjaman')
    .select(SELECT_PEMINJAMAN)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create({ barang_id, user_id, peminjam, jumlah, keterangan }) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('peminjaman')
    .insert([
      {
        barang_id,
        user_id,
        peminjam,
        jumlah,
        keterangan: keterangan || null,
        status: 'DIPINJAM'
      }
    ])
    .select(SELECT_PEMINJAMAN)
    .single();

  if (error) throw error;
  return data;
}

async function markReturnedOptimistic(id) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('peminjaman')
    .update({
      status: 'DIKEMBALIKAN',
      returned_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'DIPINJAM')
    .select(SELECT_PEMINJAMAN)
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  findActive,
  findById,
  create,
  markReturnedOptimistic
};