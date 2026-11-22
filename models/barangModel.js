const { getDbClient } = require('../config/db');

const SELECT_COLUMNS =
  'id, kode_barang, nama_barang, kategori, deskripsi, satuan, stok_sistem, stok_dipinjam, kondisi, is_archived, created_at, updated_at';

function enrichBarang(row) {
  if (!row) return null;
  const stokSistem = Number(row.stok_sistem) || 0;
  const stokDipinjam = Number(row.stok_dipinjam) || 0;
  return {
    ...row,
    stok_sistem: stokSistem,
    stok_dipinjam: stokDipinjam,
    stok_tersedia: Math.max(0, stokSistem - stokDipinjam)
  };
}

async function findAll({ search = '', kategori = '', kondisi = '', statusStok = '' } = {}) {
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

  const { data, error } = await query;
  if (error) throw error;

  let items = (data || []).map(enrichBarang);

  if (search) {
    const kw = search.toLowerCase();
    items = items.filter(
      (b) =>
        b.nama_barang.toLowerCase().includes(kw) ||
        b.kode_barang.toLowerCase().includes(kw) ||
        (b.deskripsi && b.deskripsi.toLowerCase().includes(kw))
    );
  }

  if (statusStok === 'TERSEDIA') {
    items = items.filter((b) => b.stok_tersedia > 0);
  } else if (statusStok === 'DIPINJAM') {
    items = items.filter((b) => b.stok_dipinjam > 0);
  } else if (statusStok === 'HABIS') {
    items = items.filter((b) => b.stok_tersedia === 0);
  }

  return items;
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
  return enrichBarang(data);
}

async function findByKode(kodeBarang) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .select(SELECT_COLUMNS)
    .ilike('kode_barang', kodeBarang)
    .eq('is_archived', false)
    .maybeSingle();

  if (error) throw error;
  return enrichBarang(data);
}

async function create({ kode_barang, nama_barang, kategori, deskripsi, satuan, stok_sistem, kondisi }) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .insert([
      {
        kode_barang,
        nama_barang,
        kategori,
        deskripsi: deskripsi || null,
        satuan,
        stok_sistem,
        stok_dipinjam: 0,
        kondisi
      }
    ])
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return enrichBarang(data);
}

async function update(id, { kode_barang, nama_barang, kategori, deskripsi, satuan, stok_sistem, kondisi }) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      kode_barang,
      nama_barang,
      kategori,
      deskripsi: deskripsi || null,
      satuan,
      stok_sistem,
      kondisi,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_archived', false)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return enrichBarang(data);
}

async function updateKondisi(id, kondisi) {
  const supabase = getDbClient();
  const { data, error } = await supabase
    .from('barang')
    .update({
      kondisi,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('is_archived', false)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return enrichBarang(data);
}

module.exports = {
  findAll,
  findById,
  findByKode,
  create,
  update,
  updateKondisi
};