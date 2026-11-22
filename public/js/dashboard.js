document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = ApiClient.getUser();
  const navUserEl = document.getElementById('nav-user-name');
  if (currentUser && navUserEl) {
    navUserEl.textContent = currentUser.nama_pengguna;
  }

  const TIPE_BADGES = {
    IN: 'bg-emerald-100 text-emerald-800',
    OUT: 'bg-red-100 text-red-800',
    PINJAM: 'bg-amber-100 text-amber-800',
    KEMBALI: 'bg-teal-100 text-teal-800',
    CREATE: 'bg-blue-100 text-blue-800',
    UPDATE: 'bg-indigo-100 text-indigo-800',
    STATUS: 'bg-slate-200 text-slate-800'
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatWaktuWIB(isoString) {
    if (!isoString) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  }

  try {
    const res = await ApiClient.request('/api/dashboard');
    const { kpi, watchlist, recent_movements } = res.data;

    // Render KPI
    document.getElementById('kpi-total-jenis').textContent = kpi.total_jenis;
    document.getElementById('kpi-kategori-sub').textContent = `${kpi.jenis_sport} Sport • ${kpi.jenis_nonsport} Non-Sport`;
    document.getElementById('kpi-total-aset').textContent = kpi.total_unit_aset;
    document.getElementById('kpi-total-tersedia').textContent = kpi.total_unit_tersedia;
    document.getElementById('kpi-total-dipinjam').textContent = kpi.total_unit_dipinjam;
    document.getElementById('kpi-sesi-pinjam').textContent = `${kpi.total_sesi_pinjam_aktif} sesi peminjaman aktif`;
    document.getElementById('kpi-unit-baik').textContent = kpi.total_unit_baik;
    document.getElementById('kpi-unit-cukup').textContent = kpi.total_unit_cukup;
    document.getElementById('kpi-unit-rusak').textContent = kpi.total_unit_rusak;

    // Watchlist 1: Peminjaman Aktif
    const pinjamContainer = document.getElementById('list-peminjaman-aktif');
    if (!watchlist.peminjaman_aktif.length) {
      pinjamContainer.innerHTML =
        '<p class="text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">Tidak ada unit yang sedang dipinjam.</p>';
    } else {
      pinjamContainer.innerHTML = watchlist.peminjaman_aktif
        .slice(0, 5)
        .map(
          (t) => `
            <div class="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2">
              <div>
                <p class="font-bold text-slate-900">${escapeHtml(t.peminjam)}</p>
                <p class="text-slate-600">${escapeHtml(t.barang?.nama_barang || 'Barang')} &bull; ${formatWaktuWIB(t.borrowed_at)}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 shrink-0">
                ${t.jumlah} ${escapeHtml(t.barang?.satuan || 'unit')}
              </span>
            </div>
          `
        )
        .join('');
    }

    // Watchlist 2: Stok Menipis
    const menipisContainer = document.getElementById('list-stok-menipis');
    if (!watchlist.stok_menipis.length) {
      menipisContainer.innerHTML =
        '<p class="text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">Semua stok tersedia di rak aman (&gt; 2 unit).</p>';
    } else {
      menipisContainer.innerHTML = watchlist.stok_menipis
        .slice(0, 5)
        .map(
          (b) => `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <p class="font-bold text-slate-900">${escapeHtml(b.nama_barang)}</p>
                <p class="text-slate-500 font-mono">${escapeHtml(b.kode_barang)} &bull; Dipinjam: ${b.stok_dipinjam}</p>
              </div>
              <span class="px-2 py-0.5 rounded-full font-bold ${
                b.stok_tersedia === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
              } shrink-0">
                Sisa ${b.stok_tersedia} ${escapeHtml(b.satuan)}
              </span>
            </div>
          `
        )
        .join('');
    }

    // Watchlist 3: Kondisi Rusak / Cukup
    const kondisiContainer = document.getElementById('list-kondisi-perhatian');
    if (!watchlist.kondisi_perlu_perhatian.length) {
      kondisiContainer.innerHTML =
        '<p class="text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-xl">Seluruh unit aset dalam kondisi Baik.</p>';
    } else {
      kondisiContainer.innerHTML = watchlist.kondisi_perlu_perhatian
        .slice(0, 5)
        .map(
          (b) => `
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <p class="font-bold text-slate-900">${escapeHtml(b.nama_barang)}</p>
                <p class="text-slate-500 font-mono">${escapeHtml(b.kode_barang)}</p>
              </div>
              <div class="flex gap-1 shrink-0">
                ${b.stok_rusak > 0 ? `<span class="px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-800">${b.stok_rusak} Rusak</span>` : ''}
                ${b.stok_cukup > 0 ? `<span class="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">${b.stok_cukup} Cukup</span>` : ''}
              </div>
            </div>
          `
        )
        .join('');
    }

    // Recent Audit Logs
    const logsTbody = document.getElementById('dashboard-recent-logs');
    if (!recent_movements.length) {
      logsTbody.innerHTML =
        '<tr><td colspan="5" class="py-6 text-center text-slate-500">Belum ada aktivitas tercatat.</td></tr>';
    } else {
      logsTbody.innerHTML = recent_movements
        .map((row) => {
          const badge = TIPE_BADGES[row.tipe] || 'bg-slate-100 text-slate-800';
          return `
            <tr class="hover:bg-slate-50">
              <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formatWaktuWIB(row.created_at)}</td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-full font-bold ${badge}">${escapeHtml(row.tipe)}</span>
              </td>
              <td class="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                ${escapeHtml(row.barang?.nama_barang || '-')}
              </td>
              <td class="py-3 px-4 text-slate-700">${escapeHtml(row.keterangan || '-')}</td>
              <td class="py-3 px-4 text-slate-600 whitespace-nowrap">${escapeHtml(row.petugas?.nama_pengguna || 'Sistem')}</td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Gagal memuat dashboard:', err);
  }
});