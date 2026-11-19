const { getDbClient } = require('../config/db');

const SELECT_COLUMNS =
  'id, kode_barang, nama_barang, kategori, deskripsi, satuan, stok_sistem, kondisi, ketersediaan, is_archived, created_at, updated_at';

async function findAll({ search = '', kategori = '', kondisi = '', ketersediaan = '' } = {}) {
  const supabase = getDbClient();

  let query = supabase
    .from('barang')
    .select(SELECT_COLUMNS)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (kategori) {
    query = query.eq('kategori', kategori);
  }

  if (kondisi) {
    query = query.eq('kondisi', kondisi);
  }

  if (ketersediaan) {
    query = query.eq('ketersediaan', ketersediaan);
  }

  if (search) {
    // Bersihkan karakter koma/kurung agar sintaks filter .or() PostgREST tetap aman
    const sanitized = search.replace(/[,()]/g, ' ').trim();
    if (sanitized) {
      query = query.or(`nama_barang.ilike.%${sanitized}%,kode_barang.ilike.%${sanitized}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .eq('is_archived', false)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findByKode(kodeBarang) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .select('id, kode_barang, is_archived')
    .eq('kode_barang', kodeBarang)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create(payload) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .insert([payload])
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

async function update(id, payload) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_archived', false)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

async function archive(id) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_archived', false)
    .select('id, kode_barang, nama_barang')
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  findAll,
  findById,
  findByKode,
  create,
  update,
  archive
};