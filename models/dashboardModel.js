const { getDbClient } = require('../config/db');

async function getAllActiveBarang() {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .select('id, kode_barang, nama_barang, kategori, satuan, stok_sistem, kondisi, ketersediaan, updated_at')
    .eq('is_archived', false)
    .order('stok_sistem', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = {
  getAllActiveBarang
};