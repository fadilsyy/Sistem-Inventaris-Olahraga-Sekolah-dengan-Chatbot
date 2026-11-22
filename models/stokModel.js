const { getDbClient } = require('../config/db');

async function updateBarangStockOptimistic(barangId, expectedOldStock, newStock) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      stok_sistem: newStock,
      updated_at: new Date().toISOString()
    })
    .eq('id', barangId)
    .eq('stok_sistem', expectedOldStock)
    .eq('is_archived', false)
    .select('id, kode_barang, nama_barang, kategori, satuan, stok_sistem, stok_dipinjam')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateBarangDipinjamOptimistic(barangId, expectedOldDipinjam, newDipinjam) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      stok_dipinjam: newDipinjam,
      updated_at: new Date().toISOString()
    })
    .eq('id', barangId)
    .eq('stok_dipinjam', expectedOldDipinjam)
    .eq('is_archived', false)
    .select('id, kode_barang, nama_barang, kategori, satuan, stok_sistem, stok_dipinjam')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createMovement({
  barang_id,
  user_id,
  tipe,
  jumlah,
  stok_sebelum,
  stok_sesudah,
  keterangan
}) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .insert([
      {
        barang_id,
        user_id,
        tipe,
        jumlah,
        stok_sebelum,
        stok_sesudah,
        keterangan: keterangan || null
      }
    ])
    .select(`
      id,
      tipe,
      jumlah,
      stok_sebelum,
      stok_sesudah,
      keterangan,
      created_at,
      barang:barang_id (id, kode_barang, nama_barang, kategori, satuan),
      petugas:user_id (id, nama_pengguna, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

async function findAllMovements({ tipe = '', barang_id = '', startDate = '', endDate = '', limit = 250 } = {}) {
  const supabase = getDbClient();

  let query = supabase
    .from('stock_movements')
    .select(`
      id,
      tipe,
      jumlah,
      stok_sebelum,
      stok_sesudah,
      keterangan,
      created_at,
      barang:barang_id (id, kode_barang, nama_barang, kategori, satuan),
      petugas:user_id (id, nama_pengguna, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tipe) {
    query = query.eq('tipe', tipe);
  }

  if (barang_id) {
    query = query.eq('barang_id', barang_id);
  }

  if (startDate) {
    query = query.gte('created_at', `${startDate}T00:00:00+07:00`);
  }

  if (endDate) {
    query = query.lte('created_at', `${endDate}T23:59:59.999+07:00`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

module.exports = {
  updateBarangStockOptimistic,
  updateBarangDipinjamOptimistic,
  createMovement,
  findAllMovements
};